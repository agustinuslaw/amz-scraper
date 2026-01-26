import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AmzScConfig } from "./amz-sc-config.class";
import { AmzScYearOrders } from "./model";

/**
 * Handles file persistence for Amazon order data.
 * Provides methods to read and write order IDs to JSON files, allowing
 * the scraper to resume from where it left off across sessions.
 */
export class AmzScFilePersistence {
  /**
   * Creates a new file persistence handler.
   * @param config - Application configuration containing the download directory path.
   */
  constructor(readonly config: AmzScConfig) {}

  /**
   * Generates the file path for storing order IDs for a specific year.
   * @param year - The year for which to generate the file path.
   * @returns The absolute file path in the format `{downloadDir}/{year}/order-ids-{year}.json`.
   */
  getYearOrderIdsFilePath(year: number): string {
    return `${this.config.downloadDir}/${year}/order-ids-${year}.json`;
  }

  /**
   * Reads previously saved order IDs for a specific year from disk.
   * Used to resume scraping progress across sessions.
   * @param year - The year for which to read order IDs.
   * @returns The year orders data if the file exists, or `null` if no saved data is found.
   */
  readYearOrderIdsFromFile(year: number): AmzScYearOrders | null {
    const filePath = this.getYearOrderIdsFilePath(year);
    if (!existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return new AmzScYearOrders(data.year, data.totalOrders, data.orderIds);
  }

  /**
   * Writes order IDs for a specific year to disk as JSON.
   * Called after each page is scraped to save progress incrementally.
   * @param yearOrders - The year orders data to persist, including year, total count, and collected order IDs.
   */
  writeYearOrderIdsToFile(yearOrders: AmzScYearOrders): void {
    const filePath = this.getYearOrderIdsFilePath(yearOrders.year);
    this.ensureDirectoryExistsForPath(filePath);
    const data = JSON.stringify(yearOrders, null, 2);
    writeFileSync(filePath, data, "utf-8");
    console.log(`Wrote order IDs for year ${yearOrders.year} to file: ${filePath}`);
  }

  ensureDirectoryExistsForPath(filePath: string): void {
    const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
    if (!existsSync(dirPath)) {
      // Create directory recursively
      mkdirSync(dirPath, { recursive: true });
    }
  }
}
