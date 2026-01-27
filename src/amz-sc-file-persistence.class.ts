import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AmzScConfig } from "./amz-sc-config.class";
import type { AmzScOrder } from "./model";
import { AmzScYearOrderIds } from "./model";
import { appendUniqueOrder } from "./util/amz-sc-model.util";

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
   * @returns The absolute file path in the format `{downloadDir}/{year}-order-ids.json`.
   */
  getYearOrderIdsFilePath(year: number): string {
    return `${this.config.downloadDir}/${year}-order-ids.json`;
  }

  /**
   * Reads previously saved order IDs for a specific year from disk.
   * Used to resume scraping progress across sessions.
   * @param year - The year for which to read order IDs.
   * @returns The year orders data if the file exists, or `null` if no saved data is found.
   */
  readYearOrderIdsFromFile(year: number): AmzScYearOrderIds | null {
    const filePath = this.getYearOrderIdsFilePath(year);
    if (!existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return new AmzScYearOrderIds(data.year, data.totalOrders, data.orderIds);
  }

  /**
   * Writes order IDs for a specific year to disk as JSON.
   * Called after each page is scraped to save progress incrementally.
   * @param yearOrders - The year orders data to persist, including year, total count, and collected order IDs.
   */
  writeYearOrderIdsToFile(yearOrders: AmzScYearOrderIds): void {
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

  // ============================================================
  // Order Details Persistence
  // ============================================================

  /**
   * Generates the file path for storing order details for a specific year.
   * @param year - The year for which to generate the file path.
   * @returns The absolute file path in the format `{downloadDir}/{year}-order-details.json`.
   */
  getYearOrderDetailsFilePath(year: number): string {
    return `${this.config.downloadDir}/${year}-order-details.json`;
  }

  /**
   * Reads previously saved order details for a specific year from disk.
   * Used to resume order detail collection across sessions.
   * @param year - The year for which to read order details.
   * @returns Array of order details if the file exists, or `null` if no saved data is found.
   */
  readYearOrderDetailsFromFile(year: number): AmzScOrder[] {
    const filePath = this.getYearOrderDetailsFilePath(year);
    if (!existsSync(filePath)) {
      return [];
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return (data as AmzScOrder[]) ?? [];
  }

  /**
   * Writes order details for a specific year to disk as JSON.
   * Called after each order is scraped to save progress incrementally.
   * @param year - The year for which to write order details.
   * @param orders - Array of order details to persist.
   */
  writeYearOrderDetailsToFile(year: number, orders: AmzScOrder[]): void {
    const filePath = this.getYearOrderDetailsFilePath(year);
    this.ensureDirectoryExistsForPath(filePath);
    const data = JSON.stringify(orders, null, 2);
    writeFileSync(filePath, data, "utf-8");
    console.log(`Wrote ${orders.length} order details for year ${year} to file: ${filePath}`);
  }
}
