import { existsSync, mkdirSync } from "node:fs";
import { type BrowserContext, chromium, type Page } from "playwright";
import type { AmzScConfig } from "./amz-sc-config.class";

/**
 * Manages a persistent Chromium browser instance for Amazon scraping.
 * Uses Playwright's persistent context to maintain login sessions and cookies across runs.
 * Implements both synchronous and asynchronous disposal patterns for proper resource cleanup.
 */
export class AmzScBrowser implements AsyncDisposable, Disposable {
  /**
   * Private constructor to enforce factory pattern usage.
   * Use `AmzScBrowser.launchPersistent()` to create instances.
   * @param context - The persistent browser context that maintains session data.
   * @param mainPage - The main page instance for primary navigation and scraping.
   */
  private constructor(
    readonly context: BrowserContext,
    readonly mainPage: Page
  ) {}

  /**
   * Launches a persistent Chromium browser that saves cookies and session data.
   * This allows the user to remain logged in across multiple script runs.
   * Creates necessary directories if they don't exist.
   * @param config - Application configuration containing paths and browser settings.
   * @returns A new AmzScBrowser instance with an active persistent context.
   * @throws Error if browser fails to launch (e.g., lockfile issues on Windows).
   */
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
        slowMo: 500,
        timeout: 20000,
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

  /**
   * Gets an existing page at the specified index or creates a new one.
   * Useful for managing multiple tabs or reusing pages.
   * @param index - The index of the page to retrieve (default: 0 for main page).
   * @returns The existing page at the index, or a newly created page if none exists.
   */
  async reuseOrCreatePage(index = 0): Promise<Page> {
    return this.context.pages()[index] ?? (await this.context.newPage());
  }

  /**
   * Closes the browser context and all associated pages.
   * Saves persistent session data before closing.
   * Safe to call multiple times - errors are caught and logged.
   */
  async close(): Promise<void> {
    console.log("Closing browser...");
    try {
      await this.context.close();
    } catch (error) {
      console.error("Error during browser context close:", error);
    }
    console.log("\nBrowser closed");
  }

  /**
   * Synchronous disposal method for explicit resource management (using statement).
   * Triggers asynchronous close in fire-and-forget manner.
   * Part of the Disposable protocol.
   */
  [Symbol.dispose](): void {
    this.close().catch((error) => {
      console.error("Error during synchronous disposal:", error);
    });
  }

  /**
   * Asynchronous disposal method for explicit resource management (await using statement).
   * Properly awaits browser closure to ensure clean shutdown.
   * Part of the AsyncDisposable protocol.
   */
  [Symbol.asyncDispose](): PromiseLike<void> {
    return this.close();
  }
}
