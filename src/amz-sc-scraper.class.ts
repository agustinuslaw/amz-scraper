import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ElementHandle, Locator, Page, Response } from "playwright";
import type { AmzScBrowser } from "./amz-sc-browser.class";
import type { AmzScConfig } from "./amz-sc-config.class";
import { AmzScOrder, AmzScOrderItem, AmzScYearOrders } from "./amz-sc-order.class";

const DECIMAL: number = 10;
/**
 * Main class for downloading Amazon invoices.
 */
export class AmzScScraper {
  constructor(
    readonly config: AmzScConfig,
    readonly browser: AmzScBrowser
  ) {}

  /**
   * Main execution method that orchestrates the entire process.
   */
  async run(): Promise<void> {
    const isLoggedIn: boolean = await this.isLoggedIn();
    if (!isLoggedIn) {
      await this.waitForManualLogin();
    }

    await this.collectOrderIdsForYear(this.config.invoiceYear);
  }

  /**
   * Checks if the user is logged into Amazon.
   * Returns true if logged in, false otherwise.
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Navigate to
      await this.browser.mainPage.goto("https://www.amazon.de", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      // Check if the account link shows a name (indicates logged in)
      const accountElement: ElementHandle<HTMLElement | SVGElement> | null =
        await this.browser.mainPage.$("#nav-link-accountList-nav-line-1");
      if (!accountElement) return false;

      const text: string | null = await accountElement.textContent();
      // If it says "Hallo, Anmelden" or similar, user is not logged in
      if (!text) {
        console.log("Account element has no text content");
        return false;
      }
      const signInRegex = /anmelden|sign in/i;
      return !signInRegex.test(text);
    } catch (error) {
      console.error("Error checking login status:", error);
      return false;
    }
  }

  /**
   * Prompts the user to log in manually.
   * Waits for the user to complete login including MFA.
   */
  async waitForManualLogin(): Promise<void> {
    console.log("\nPlease log in to Amazon in the browser window");
    console.log("Complete all steps including MFA if required");
    console.log("Press Enter here when you're logged in and ready to continue...\n");

    // Wait for user to press Enter
    await this.waitForEnter();

    // Verify login was successful
    const loggedIn: boolean = await this.isLoggedIn(); // 5 minutes timeout
    if (!loggedIn) {
      throw new Error("Login verification failed. Please ensure you're logged in and try again.");
    }

    console.log("Login verified successfully\n");
  }

  getYearOrderIdsFilePath(year: number): string {
    return `${this.config.downloadDir}/order-ids-${year}.json`;
  }

  readYearOrderIdsFromFile(year: number): AmzScYearOrders | null {
    const filePath = this.getYearOrderIdsFilePath(year);
    if (!existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return new AmzScYearOrders(data.year, data.totalOrders, data.orderIds);
  }

  writeYearOrderIdsToFile(yearOrders: AmzScYearOrders): void {
    const filePath = this.getYearOrderIdsFilePath(yearOrders.year);
    const data = JSON.stringify(yearOrders, null, 2);
    writeFileSync(filePath, data, "utf-8");
    console.log(`Wrote order IDs for year ${yearOrders.year} to file: ${filePath}`);
  }

  /**
   * Helper function to wait for Enter key press.
   */
  async waitForEnter(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once("data", () => {
        resolve();
      });
    });
  }

  private async gotoOrderYearPage(year: number, orderPage: number): Promise<null | Response> {
    const startIndex: number = orderPage * 10;
    const orderYearPageUrl: string = `https://www.amazon.de/gp/your-account/order-history?timeFilter=year-${year}&startIndex=${startIndex}`;
    console.log(`Navigating to orders for year ${year}, page ${orderPage + 1}: ${orderYearPageUrl}`);
    return await this.browser.mainPage.goto(orderYearPageUrl, { waitUntil: "domcontentloaded" });
  }

  private async gotoOrderSummaryPage(page: Page, orderId: string): Promise<null | Response> {
    const orderSummaryUrl: string = `https://www.amazon.de/gp/css/summary/print.html?orderID=${orderId}`;
    console.log(`Navigating to order summary page for order ${orderId}: ${orderSummaryUrl}`);
    return await page.goto(orderSummaryUrl, { waitUntil: "domcontentloaded" });
  }

  private async getOrderYears(page: Page): Promise<number[]> {
    const yearTexts: string[] = await page.locator(`#time-filter > option[value^='year-']`).allTextContents();

    return yearTexts.map((text) => parseInt(text, DECIMAL)).filter((n) => !Number.isNaN(n));
  }

  /**
   * Navigates to the orders page and downloads invoices.
   */
  async collectOrderIdsForYear(invoiceYear: number): Promise<AmzScYearOrders> {
    const orderCardSelector = ".order-card";

    // goto first page to get total orders
    let yearOrders: AmzScYearOrders | null = this.readYearOrderIdsFromFile(invoiceYear);

    if (yearOrders?.isComplete) {
      console.log(
        `Order IDs for year ${invoiceYear} are already complete. Loaded from file path: ${this.getYearOrderIdsFilePath(invoiceYear)}`
      );
      return yearOrders;
    }

    const startPage: number = yearOrders?.lastPage || 0;
    console.log(`Collecting order IDs for year ${invoiceYear} starting from page ${startPage + 1}...`);

    // wait for orders to load
    await this.gotoOrderYearPage(invoiceYear, startPage);
    await this.browser.mainPage.waitForSelector(orderCardSelector, { timeout: 30000 });

    const orderYears: number[] = await this.getOrderYears(this.browser.mainPage);
    console.log(`Available years ${orderYears.join(",")}`);

    const yearTotalOrdersText: string | null = await this.browser.mainPage.locator("span.num-orders").textContent();
    const yearTotalOrders: number = this.extractInt(yearTotalOrdersText);
    const yearTotalPages: number = Math.ceil(yearTotalOrders / 10);

    let uniqueOrderIds: string[] = yearOrders?.orderIds ?? [];
    let uniqueOrderIdsSet = new Set(uniqueOrderIds);

    // amazon page shows 10 orders per page [0,pages)
    console.log(`Total orders in year ${invoiceYear}: ${yearTotalOrders} across ${yearTotalPages} pages`);

    for (let orderPage = startPage; orderPage < yearTotalPages; orderPage++) {
      await this.randomSleep(200, 1000);

      console.log(`Collecting order ids in page ${orderPage + 1}/${yearTotalPages}`);
      await this.gotoOrderYearPage(invoiceYear, orderPage);
      await this.browser.mainPage.waitForSelector(orderCardSelector, { timeout: 30000 });

      const pageOrderCards: Locator[] = await this.browser.mainPage.locator(orderCardSelector).all();
      const pageOrderIds: string[] = await this.collectOrderIdsFromPage(pageOrderCards);

      uniqueOrderIdsSet = new Set([...uniqueOrderIdsSet, ...pageOrderIds]);
      uniqueOrderIds = Array.from(uniqueOrderIdsSet);

      console.log(`Found ${pageOrderIds.length} order IDs in page ${orderPage + 1}/${yearTotalPages}`);

      // save progress after each page
      yearOrders = new AmzScYearOrders(invoiceYear, yearTotalOrders, uniqueOrderIds);
      this.writeYearOrderIdsToFile(yearOrders);
    }

    console.log(`Recorded ${uniqueOrderIds.length} IDs for year ${invoiceYear}`);
    return new AmzScYearOrders(invoiceYear, yearTotalOrders, uniqueOrderIds);
  }

  async collectOrderIdsFromPage(orderCards: Locator[]): Promise<string[]> {
    var orders: string[] = [];
    for (const orderCard of orderCards) {
      const orderId = await orderCard.locator(".yohtmlc-order-id span[dir]").textContent({ timeout: 500 });
      if (orderId) {
        orders.push(orderId);
      }
    }
    return orders;
  }

  async getOrderDetails(orderId: string): Promise<AmzScOrder> {
    this.gotoOrderSummaryPage(this.browser.mainPage, orderId);
    await this.browser.mainPage.waitForSelector("#orderDetails", { timeout: 10000 });

    const orderItems: AmzScOrderItem[] = [];
    const orderDetails: Locator = this.browser.mainPage.locator("#orderDetails");

    const paymentInstrument = await this.getTextOrEmpty(orderDetails, "[data-testid='payment-instrument']");
    const orderDate = await this.getTextOrEmpty(orderDetails, "[data-component='orderDate']");
    const orderTotal = await this.getTextOrEmpty(
      orderDetails,
      "[data-component='chargeSummary'] li:nth-child(6) .od-line-item-row-content"
    );

    const shippingName = await this.getTextOrEmpty(orderDetails, "[data-component='shippingAddress'] li:nth-child(1)");
    const shippingAddress = await this.getTextOrEmpty(orderDetails, "[data-component='shippingAddress'] li:nth-child(2)");

    const orderItemGrids: Locator[] = await orderDetails
      .locator("[data-component='shipments'] .a-fixed-left-grid")
      .all()
      .catch(() => []);
    for (const itemGrid of orderItemGrids) {
      const itemTitleLink: Locator = await itemGrid.locator("[data-component='itemTitle'] a");
      const itemTitle = (await itemTitleLink?.textContent())?.trim() ?? "";
      const itemHref = await itemTitleLink?.getAttribute("href");
      const itemAsin = this.getRegexGroupOrEmpty(itemHref, /\/dp\/([A-Z0-9]+)/, 1);
      const merchant = await this.getTextOrEmpty(itemGrid, "[data-component='orderedMerchant'] a");
      const merchantHref = await itemGrid
        .locator("[data-component='orderedMerchant'] a")
        .getAttribute("href", { timeout: 500 })
        .catch(() => "");
      const merchantId = this.getRegexGroupOrEmpty(merchantHref, /seller=([A-Z0-9]+)/, 1);
      const quantity = await this.getTextOrDefault(itemGrid, "[data-component='quantity']", "1");
      const unitPrice = await this.getTextOrEmpty(itemGrid, "[data-component='unitPrice'] .a-offscreen");

      const orderItem = new AmzScOrderItem(orderId, itemTitle, itemAsin, merchant, merchantId, this.extractInt(quantity), unitPrice);

      orderItems.push(orderItem);

      console.log(
        `ASIN: ${itemAsin}, Merchant: ${merchant}, Qty: ${quantity},  Price: ${unitPrice}, Title: ${itemTitle?.substring(0, 50)}...`
      );
    }

    return new AmzScOrder(orderId, orderDate, orderTotal, shippingName, shippingAddress, paymentInstrument, orderItems);
  }

  // Helper methods
  private async randomSleep(lower: number, upper: number): Promise<void> {
    const delayMs = lower + Math.random() * (upper - lower);
    console.log(`Sleeping for ${Math.round(delayMs)} ms to mimic human behavior...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private getRegexGroupOrEmpty(text: string | null | undefined, regex: RegExp, groupIndex: number = 1): string {
    const match = text?.match(regex);
    if (match && match.length > groupIndex) {
      return match[groupIndex] ?? "";
    }
    return "";
  }

  private async getTextOrEmpty(resource: Locator | Page, selector: string): Promise<string> {
    return this.getTextOrDefault(resource, selector, "");
  }

  private async getTextOrDefault(resource: Locator | Page, selector: string, defaultValue: string): Promise<string> {
    try {
      const result = await resource.locator(selector).textContent({ timeout: 500 });
      if (!result || result.trim().length === 0) {
        return defaultValue;
      }
      return result;
    } catch {
      return defaultValue;
    }
  }

  private extractInt(text: string | null): number {
    if (!text) return NaN;
    const cleaned = text.replace(/\D/g, "");
    return parseInt(cleaned, DECIMAL);
  }
}
