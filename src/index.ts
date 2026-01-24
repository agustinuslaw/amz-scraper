import { type Config, getConfig, printConfig } from "./config";
import { Scraper } from "./scraper";

/**
 * Main entry point of the application.
 * This is similar to the main() method in Java.
 */
async function main(): Promise<void> {
  console.log("Amazon Invoice Scraper");

  const config: Config = getConfig();
  printConfig(config);

  const scraper = new Scraper(config);
  // await scraper.run();
}

// Run the main function and handle any errors
// This pattern is common in Node.js/TypeScript applications
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
