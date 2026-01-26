import { existsSync, mkdirSync } from "node:fs";
import { type BrowserContext, chromium, type Page } from "playwright";
import type { AmzScConfig } from "./amz-sc-config.class";

export class AmzScBrowser implements AsyncDisposable, Disposable {
  private constructor(
    readonly context: BrowserContext,
    readonly mainPage: Page
  ) {}

  static async launchPersistent(config: AmzScConfig): Promise<AmzScBrowser> {
    // Ensure directories exist
    if (!existsSync(config.downloadDir)) {
      console.log(`Creating browser download directory at ${config.downloadDir}`);
      mkdirSync(config.downloadDir, { recursive: true });
    }
    if (!existsSync(config.userDataDir)) {
      console.log(`Creating browser user data directory at ${config.userDataDir}`);
      mkdirSync(config.userDataDir, { recursive: true });
    }

    try {
      console.log("Initializing persistent context browser (session will be saved)");
      const browserContext = await chromium.launchPersistentContext(config.userDataDir, {
        headless: config.headless,
        acceptDownloads: true,
        locale: "en-US",
        viewport: { width: 1280, height: 720 },
        slowMo: 100,
        timeout: 60000,
        args: ["--disable-blink-features=AutomationControlled"],
      });
      console.log("Browser launched with persistent context");
      const mainPage = browserContext.pages()[0] ?? (await browserContext.newPage());

      const instance = new AmzScBrowser(browserContext, mainPage);
      return instance;
    } catch (error) {
      console.error(error);
      console.error("Failed to launch with persistent context. This is common on Windows. Try the following:");
      console.error(`  1. Find and delete lockfile in folder: fd --hidden -i 'lockfile|singletonlock' ${config.userDataDir} | rm`);
      console.error(`  2. If that fails, delete user data folder: rm -r ${config.userDataDir}`);
      throw error;
    }
  }

  async reuseOrCreatePage(index = 0): Promise<Page> {
    return this.context.pages()[index] ?? (await this.context.newPage());
  }

  async close(): Promise<void> {
    console.log("Closing browser...");
    try {
      await this.context.close();
    } catch (error) {
      console.error("Error during browser context close:", error);
    }
    console.log("\nBrowser closed");
  }

  [Symbol.dispose](): void {
    this.close().catch((error) => {
      console.error("Error during synchronous disposal:", error);
    });
  }

  [Symbol.asyncDispose](): PromiseLike<void> {
    return this.close();
  }
}
