import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
loadEnv();

/**
 * Application configuration loaded from environment variables.
 * This is similar to using @Value annotations in Spring Boot.
 */
export interface Config {
  invoiceYear: number;
  downloadDir: string;
  headless: boolean;
  userDataDir: string;
  usePersistentContext: boolean;
}

/**
 * Validates and returns the application configuration.
 * Throws an error if required environment variables are missing.
 */
export function getConfig(): Config {
  const { INVOICE_YEAR, DOWNLOAD_DIR, HEADLESS, USER_DATA_DIR, USE_PERSISTENT_CONTEXT } =
    process.env;

  // Parse optional fields with defaults
  const invoiceYear = INVOICE_YEAR ? Number.parseInt(INVOICE_YEAR, 10) : new Date().getFullYear();
  const downloadDir = resolve(DOWNLOAD_DIR || "./downloads");
  const headless = HEADLESS?.toLowerCase() === "true";
  const userDataDir = resolve(USER_DATA_DIR || "./browser-data");
  const usePersistentContext = USE_PERSISTENT_CONTEXT?.toLowerCase() !== "false"; // Default true

  return {
    invoiceYear,
    downloadDir,
    headless,
    userDataDir,
    usePersistentContext,
  };
}

/**
 * Prints the current configuration (with password masked).
 * Useful for debugging.
 */
export function printConfig(config: Config): void {
  console.log("📋 Configuration:");
  console.log(`   Invoice Year: ${config.invoiceYear}`);
  console.log(`   Download Directory: ${config.downloadDir}`);
  console.log(`   Browser Data Directory: ${config.userDataDir}`);
  console.log(`   Headless Mode: ${config.headless}`);
  console.log(`   Use Persistent Context: ${config.usePersistentContext}`);
  console.log();
}
