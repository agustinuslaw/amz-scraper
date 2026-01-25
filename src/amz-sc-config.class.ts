import { resolve } from "node:path";

export class AmzScConfig {
  constructor(
    readonly invoiceYear: number,
    readonly downloadDir: string,
    readonly headless: boolean,
    readonly userDataDir: string
  ) {}

  static fromEnv(): AmzScConfig {
    const { AMZSC_INVOICE_YEAR, AMZSC_DOWNLOAD_DIR, AMZSC_HEADLESS, AMZSC_USER_DATA_DIR } = process.env;

    // Parse optional fields with sensible defaults
    const invoiceYear = AMZSC_INVOICE_YEAR ? Number.parseInt(AMZSC_INVOICE_YEAR, 10) : new Date().getFullYear();
    const downloadDir = resolve(AMZSC_DOWNLOAD_DIR || "./downloads");
    const headless = AMZSC_HEADLESS?.toLowerCase() === "true";
    const userDataDir = resolve(AMZSC_USER_DATA_DIR || "./browser-data");

    console.log(" Configuration:");
    console.log(`   Invoice Year: ${invoiceYear}`);
    console.log(`   Download Directory: ${downloadDir}`);
    console.log(`   User Data Directory: ${userDataDir}`);
    console.log(`   Headless Mode: ${headless}`);
    console.log();

    return new AmzScConfig(invoiceYear, downloadDir, headless, userDataDir);
  }
}
