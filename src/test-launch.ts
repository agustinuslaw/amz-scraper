import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.amazon.de/-/en/your-orders/orders?language=en&timeFilter=year-2025&startIndex=0");
  console.log("Title:", await page.title());
  // Keep open for 5 seconds so you can see it
  await new Promise((res) => setTimeout(res, 5000));
  await browser.close();
})();
