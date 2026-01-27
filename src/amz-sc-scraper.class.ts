import type { Locator, Page, Response } from "playwright";
import type { AmzScBrowser } from "./amz-sc-browser.class";
import type { AmzScConfig } from "./amz-sc-config.class";
import type { AmzScFilePersistence } from "./amz-sc-file-persistence.class";
import { type AmzScInvoiceLink, type AmzScOrder, type AmzScOrderItem, AmzScYearOrders } from "./model";
import { randomSleep } from "./util/amz-sc-process.util";

const RADIX_DECIMAL: number = 10;
/**
 * Main class for downloading Amazon invoices.
 */
export class AmzScScraper {
  constructor(readonly config: AmzScConfig, readonly browser: AmzScBrowser, readonly files: AmzScFilePersistence) {}

  /**
   * Main execution method that orchestrates the entire process.
   */
  async run(): Promise<void> {
    const yearOrders = await this.collectOrderIdsForYear(this.config.invoiceYear);

    await this.collectOrderDetailsForYear(yearOrders);
  }

  /**
   * Navigates to the orders page and downloads invoices.
   */
  async collectOrderIdsForYear(invoiceYear: number): Promise<AmzScYearOrders> {
    const orderCardSelector = ".order-card";

    // goto first page to get total orders
    let yearOrders: AmzScYearOrders | null = this.files.readYearOrderIdsFromFile(invoiceYear);
    if (yearOrders?.isComplete) {
      console.log(
        `Order IDs for year ${invoiceYear} are already complete. Loaded from file path: ${this.files.getYearOrderIdsFilePath(invoiceYear)}`,
      );
      return yearOrders;
    }

    const startPage: number = yearOrders?.estimatedLastPage || 0;
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
      await randomSleep(800, 2000);

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
      this.files.writeYearOrderIdsToFile(yearOrders);
    }

    console.log(`Recorded ${uniqueOrderIds.length} IDs for year ${invoiceYear}`);
    return new AmzScYearOrders(invoiceYear, yearTotalOrders, uniqueOrderIds);
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

  private async gotoOrderInvoicePage(page: Page, orderId: string): Promise<null | Response> {
    const orderInvoiceUrl: string = `https://www.amazon.de/-/en/your-orders/invoice/popover?orderId=${orderId}`;
    console.log(`Navigating to order invoice page for order ${orderId}: ${orderInvoiceUrl}`);
    return await page.goto(orderInvoiceUrl, { waitUntil: "domcontentloaded" });
  }

  private async getOrderYears(page: Page): Promise<number[]> {
    const yearTexts: string[] = await page.locator(`#time-filter > option[value^='year-']`).allTextContents();

    return yearTexts.map((text) => parseInt(text, RADIX_DECIMAL)).filter((n) => !Number.isNaN(n));
  }

  async collectOrderIdsFromPage(orderCards: Locator[]): Promise<string[]> {
    const orders: string[] = [];
    for (const orderCard of orderCards) {
      const orderId = await orderCard.locator(".yohtmlc-order-id span[dir]").textContent({ timeout: 500 });
      if (orderId) {
        orders.push(orderId);
      }
    }
    return orders;
  }

  async collectOrderDetailsForYear(yearOrders: AmzScYearOrders): Promise<AmzScOrder[]> {
    const orderDetails: AmzScOrder[] = [];
    const scrapedOrderIds: Set<string> = this.files.getScrapedOrderIds(yearOrders.year);

    console.log(
      `Collecting order details for year ${yearOrders.year}. ${scrapedOrderIds.size} orders already scraped, ${yearOrders.orderIds.length} total orders.`,
    );

    for (const orderId of yearOrders.orderIds) {
      if (scrapedOrderIds.has(orderId)) {
        console.log(`Order ${orderId} already scraped, skipping.`);
        continue;
      }

      await randomSleep(800, 2000);

      console.log(`Collecting details for order ${orderId}...`);
      const orderDetail: AmzScOrder = await this.getOrderDetails(orderId);
      orderDetails.push(orderDetail);

      // save progress after each order
      this.files.appendOrderDetailToFile(yearOrders.year, orderDetail);
    }

    console.log(`Collected details for ${orderDetails.length} orders in year ${yearOrders.year}.`);
    return orderDetails;
  }

  async getOrderDetails(orderId: string): Promise<AmzScOrder> {
    this.gotoOrderSummaryPage(this.browser.mainPage, orderId);
    await this.browser.mainPage.waitForSelector("#orderDetails", { timeout: 10000 });

    const orderItems: AmzScOrderItem[] = [];
    const orderDetails: Locator = this.browser.mainPage.locator("#orderDetails");

    const paymentInstrument = await this.getTextOrEmpty(orderDetails, "[data-testid='payment-instrument']");
    const orderDate = await this.getTextOrEmpty(orderDetails, "[data-component='orderDate']");
    const totalAmount = await this.getTextOrEmpty(
      orderDetails,
      "[data-component='chargeSummary'] li:nth-child(6) .od-line-item-row-content",
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
      const itemHref = await itemTitleLink?.getAttribute("href").catch(() => "");
      const itemAsin = this.getRegexGroupOrEmpty(itemHref, /\/dp\/([A-Z0-9]+)/, 1);
      const merchant = await this.getTextOrEmpty(itemGrid, "[data-component='orderedMerchant'] a").catch(() => "");
      const merchantHref = await itemGrid
        .locator("[data-component='orderedMerchant'] a")
        .getAttribute("href", { timeout: 500 })
        .catch(() => "");
      const merchantId = this.getRegexGroupOrEmpty(merchantHref, /seller=([A-Z0-9]+)/, 1);
      const quantity = await this.getTextOrDefault(itemGrid, "[data-component='quantity']", "1");
      const unitPrice = await this.getTextOrEmpty(itemGrid, "[data-component='unitPrice'] .a-offscreen");

      const orderItem: AmzScOrderItem = {
        orderId,
        title: itemTitle,
        asin: itemAsin,
        merchant,
        merchantId,
        quantity: this.extractInt(quantity),
        unitPrice,
      };

      orderItems.push(orderItem);

      console.log(
        `ASIN: ${itemAsin}, Merchant: ${merchant}, Qty: ${quantity},  Price: ${unitPrice}, Title: ${itemTitle?.substring(0, 50)}...`,
      );
    }

    const invoiceUrls: AmzScInvoiceLink[] = await this.getOrderInvoiceUrls(orderId);

    return {
      id: orderId,
      date: orderDate,
      totalAmount,
      shippingName,
      shippingAddress,
      paymentInstrument,
      orderItems,
      invoiceUrls,
    };
  }

  async getOrderInvoiceUrls(orderId: string): Promise<AmzScInvoiceLink[]> {
    this.gotoOrderInvoicePage(this.browser.mainPage, orderId);
    await this.browser.mainPage.waitForSelector("[href$=pdf]", { timeout: 10000 });
    const invoiceLinkLocators: Locator[] = await this.browser.mainPage.locator("[href$=pdf]").all();

    const invoiceUrls: AmzScInvoiceLink[] = await Promise.all(
      invoiceLinkLocators.map(async (link, index) => {
        const invoiceName = await link.textContent({ timeout: 200 });
        const url = await link.evaluate((el) => (el as HTMLAnchorElement).href, { timeout: 200 });
        console.log(`Invoice ${invoiceName} URL: ${url}`);
        return { name: invoiceName || `Invoice-${index + 1}`, url };
      }),
    );

    return invoiceUrls;
  }

  private getRegexGroupOrEmpty(text: string | null | undefined, regex: RegExp, groupIndex = 1): string {
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
      const result = await resource.locator(selector).textContent({ timeout: 200 });
      if (!result) {
        return defaultValue;
      }
      const trimmed = result.trim();
      if (trimmed.length === 0) {
        return defaultValue;
      }
      return trimmed;
    } catch {
      return defaultValue;
    }
  }

  private extractInt(text: string | null): number {
    if (!text) return NaN;
    const cleaned = text.replace(/\D/g, "");
    return parseInt(cleaned, RADIX_DECIMAL);
  }
}
