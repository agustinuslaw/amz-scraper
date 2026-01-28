import type { AmzScOrder } from "../model";

export function appendUniqueOrder(existingOrders: AmzScOrder[], order: AmzScOrder): void {
  const orderExists = existingOrders.some((o) => o.id === order.id);
  if (orderExists) {
    console.log(`Order ${order.id} already exists in file, skipping append.`);
    return;
  }
  existingOrders.push(order);
}

export function parseDEDateToISO(dateStr: string): string | null {
  // handles DE and EN-UK EN-INTL dates but not EN-US

  // 1. Standardize: Remove dots/commas and collapse extra spaces
  const cleanStr = dateStr.replace(/[.,]/g, "").trim();
  const parts = cleanStr.split(/\s+/);

  if (parts.length !== 3) return null;

  const [dayStr, monthName, yearStr] = parts;

  if (!dayStr || !monthName || !yearStr) {
    return null;
  }

  // 2. Combined Month Map (DE + EN)
  const monthMap: Record<string, string> = {
    // German
    januar: "01",
    februar: "02",
    märz: "03",
    april: "04",
    mai: "05",
    juni: "06",
    juli: "07",
    august: "08",
    september: "09",
    oktober: "10",
    november: "11",
    dezember: "12",
    // English
    january: "01",
    february: "02",
    march: "03",
    may: "05",
    june: "06",
    july: "07",
    october: "10",
    december: "12",
    // (Note: April, August, September, November are identical in both)
  };

  const month = monthMap[monthName.toLowerCase()];
  const day = dayStr.padStart(2, "0");
  const year = yearStr;

  // 3. Basic Validation
  // Check if month exists and year is 4 digits
  if (!month || !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(dayStr)) {
    return null;
  }

  return `${year}-${month}-${day}`;
}
