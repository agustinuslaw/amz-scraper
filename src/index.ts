import { AmzScAuth } from "./amz-sc-auth.class";
import { AmzScBrowser } from "./amz-sc-browser.class";
import { AmzScConfig } from "./amz-sc-config.class";
import { AmzScFilePersistence } from "./amz-sc-file-persistence.class";
import { waitForEnter } from "./amz-sc-process.util";
import { AmzScScraper } from "./amz-sc-scraper.class";

/**
 * Main entry point of the application.
 * This is similar to the main() method in Java.
 */
async function main(): Promise<void> {
  console.log("Amazon Scraper (Invoice Downloader) Starting...");
  const config: AmzScConfig = AmzScConfig.fromEnv();

  await using browser: AmzScBrowser = await AmzScBrowser.launchPersistent(config);

  const auth = new AmzScAuth(config, browser);
  await auth.login();

  const filePersistence = new AmzScFilePersistence(config);
  const scraper: AmzScScraper = new AmzScScraper(config, browser, filePersistence);
  await scraper.run();

  // Wait for user to press Enter
  console.log("Press Enter here to stop the application...");
  await waitForEnter();
}

// Run the main function and handle any errors
// This pattern is common in Node.js/TypeScript applications
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
