import type { AmzScInvoiceLink } from "./amz-sc-invoice-link.interface";
import type { AmzScOrderItem } from "./amz-sc-order-item.class";

export class AmzScOrder {
  constructor(
    readonly id: string,
    readonly date: string,
    readonly totalAmount: string,
    readonly shippingName: string,
    readonly shippingAddress: string,
    readonly status: string,
    readonly orderItems: AmzScOrderItem[],
    readonly invoiceUrls: AmzScInvoiceLink[]
  ) {}
}
