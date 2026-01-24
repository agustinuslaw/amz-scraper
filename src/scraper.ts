import { existsSync, mkdirSync } from "fs";
import {
  type Browser,
  type BrowserContext,
  chromium,
  type ElementHandle,
  type Page,
} from "playwright";
import type { Config } from "./config";
/**
 * Main class for downloading Amazon invoices.
 * Supports both persistent and non-persistent browser contexts.
 */
export class Scraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(private config: Config) {}

  /**
   * Initializes the browser with persistent or regular context.
   * Persistent context maintains login between runs but can have issues on Windows.
   */
  async initialize(): Promise<void> {
    console.log("🚀 Initializing browser...");

    // Ensure directories exist
    if (!existsSync(this.config.downloadDir)) {
      mkdirSync(this.config.downloadDir, { recursive: true });
    }
    if (!existsSync(this.config.userDataDir)) {
      mkdirSync(this.config.userDataDir, { recursive: true });
    }

    if (this.config.usePersistentContext) {
      await this.initializePersistent();
    } else {
      await this.initializeRegular();
    }

    console.log("✅ Browser initialized");
  }

  /**
   * Initialize with persistent context (saves login between runs).
   */
  private async initializePersistent(): Promise<void> {
    console.log("   Using persistent context (session will be saved)");

    try {
      this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
        headless: this.config.headless,
        acceptDownloads: true,
        locale: "de-DE",
        viewport: { width: 1280, height: 720 },
        slowMo: 100,
        timeout: 60000,
        args: ["--disable-blink-features=AutomationControlled"],
      });

      // Create or reuse the first page
      this.page = await this.context.newPage();

      // Navigate to a page if it's blank
      if (this.page.url() === "about:blank") {
        console.log("   Navigating to Amazon.de...");
        await this.page.goto("https://www.amazon.de", { waitUntil: "domcontentloaded" });
      }
    } catch (error) {
      console.error("\n❌ Failed to launch with persistent context");
      console.error("💡 This is common on Windows. Try one of these solutions:");
      console.error("   1. Delete browser-data folder: Remove-Item -Recurse -Force browser-data");
      console.error("   2. Or set USE_PERSISTENT_CONTEXT=false in .env file");
      throw error;
    }
  }

  /**
   * Initialize with regular context (doesn't save login, more reliable on Windows).
   */
  private async initializeRegular(): Promise<void> {
    console.log("   Using regular context (login won't be saved between runs)");

    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: 100,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      locale: "de-DE",
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();
    await this.page.goto("https://www.amazon.de", { waitUntil: "domcontentloaded" });
  }

  /**
   * Checks if the user is logged into Amazon.
   * Returns true if logged in, false otherwise.
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      // Navigate to Amazon.de
      await this.page.goto("https://www.amazon.de", { waitUntil: "domcontentloaded" });

      // Check if the account link shows a name (indicates logged in)
      const accountElement = await this.page.$("#nav-link-accountList-nav-line-1");
      if (!accountElement) return false;

      const text = await accountElement.textContent();
      // If it says "Hallo, Anmelden" or similar, user is not logged in
      return text !== null && !text.toLowerCase().includes("anmelden");
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
    if (!this.page) throw new Error("Browser not initialized");

    console.log("\n🔐 Please log in to Amazon.de in the browser window");
    console.log("   Complete all steps including MFA if required");
    console.log("   Press Enter here when you're logged in and ready to continue...\n");

    // Wait for user to press Enter
    await this.waitForEnter();

    // Verify login was successful
    const loggedIn = await this.isLoggedIn();
    if (!loggedIn) {
      throw new Error("Login verification failed. Please ensure you're logged in and try again.");
    }

    console.log("✅ Login verified successfully\n");
  }

  /**
   * Helper function to wait for Enter key press.
   */
  private async waitForEnter(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once("data", () => {
        resolve();
      });
    });
  }

  /**
   * Navigates to the orders page and downloads invoices.
   */
  async downloadInvoices(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log(`📥 Downloading invoices for year ${this.config.invoiceYear}...`);

    // Navigate to returns and orders page
    await this.page.goto("https://www.amazon.de/gp/css/order-history");
    await this.page.waitForLoadState("networkidle");

    // Wait for orders to load
    try {
      await this.page.waitForSelector(".order-card, .order", { timeout: 10000 });
    } catch (error) {
      console.log("⚠️  No orders found or page structure changed");
      return;
    }

    // Get all order cards (Amazon uses different class names over time)
    const orderSelectors = [".order-card", ".order", "[data-order-id]"];
    let orders: ElementHandle<HTMLElement | SVGElement>[] = [];

    for (const selector of orderSelectors) {
      orders = await this.page.$$(selector);
      if (orders.length > 0) {
        console.log(`Found ${orders.length} orders using selector: ${selector}`);
        break;
      }
    }

    if (orders.length === 0) {
      console.log("⚠️  No orders found. The page structure may have changed.");
      console.log("   Try inspecting the page and updating the selectors.");
      return;
    }

    let downloadCount = 0;
    let skippedCount = 0;

    // Process each order
    for (let i = 0; i < orders.length; i++) {
      try {
        console.log(`Processing order ${i + 1}/${orders.length}...`);

        // Look for invoice/receipt links
        const invoiceSelectors = [
          'a[href*="invoice"]',
          'a[href*="receipt"]',
          'a:has-text("Rechnung")',
          'a:has-text("Invoice")',
        ];

        let invoiceLink = null;
        const order = orders[i];
        if (!order) continue;
        for (const selector of invoiceSelectors) {
          invoiceLink = await order.$(selector);
          if (invoiceLink) break;
        }

        if (invoiceLink) {
          // Click the invoice link and wait for download
          const [download] = await Promise.all([
            this.page.waitForEvent("download", { timeout: 10000 }),
            invoiceLink.click(),
          ]);

          // Get suggested filename or generate one
          const suggestedFilename = download.suggestedFilename();
          const fileName = suggestedFilename || `invoice_${Date.now()}.pdf`;
          const filePath = `${this.config.downloadDir}/${fileName}`;

          await download.saveAs(filePath);

          downloadCount++;
          console.log(`  ✓ Downloaded: ${fileName}`);
        } else {
          skippedCount++;
          console.log(`  ⊘ Skipped: No invoice link found`);
        }
      } catch (error) {
        skippedCount++;
        console.log(
          `  ⚠ Skipped order due to error:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Downloaded: ${downloadCount} invoices`);
    console.log(`   ⊘ Skipped: ${skippedCount} orders`);
    console.log(`   📁 Location: ${this.config.downloadDir}`);
  }

  /**
   * Closes the browser context and browser.
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    console.log("\n👋 Browser closed");
  }

  /**
   * Main execution method that orchestrates the entire process.
   */
  async run(): Promise<void> {
    try {
      await this.initialize();

      // Check if user is already logged in
      const loggedIn = await this.isLoggedIn();

      if (!loggedIn) {
        console.log("🔓 Not logged in to Amazon.de");
        await this.waitForManualLogin();
      } else {
        console.log("✅ Already logged in to Amazon.de\n");
      }

      await this.downloadInvoices();
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    } finally {
      await this.close();
    }
  }
}
