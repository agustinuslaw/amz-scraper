import type { AmzScBrowser } from "./amz-sc-browser.class";
import type { AmzScConfig } from "./amz-sc-config.class";
import { waitForEnter } from "./util/amz-sc-process.util";

export class AmzScAuth {
  constructor(
    readonly config: AmzScConfig,
    readonly browser: AmzScBrowser
  ) {}

  async login(): Promise<void> {
    const loggedIn: boolean = await this.isLoggedIn();
    if (loggedIn) {
      console.log("Already logged in to Amazon\n");
      return;
    }

    await this.waitForManualLogin();
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
      const accountElement = await this.browser.mainPage.locator("#nav-link-accountList-nav-line-1");
      if (!accountElement) return false;

      const text: string | null = await accountElement.textContent();
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
    await waitForEnter();

    // Verify login was successful
    const loggedIn: boolean = await this.isLoggedIn(); // 5 minutes timeout
    if (!loggedIn) {
      throw new Error("Login verification failed. Please ensure you're logged in and try again.");
    }

    console.log("Login verified successfully\n");
  }
}
