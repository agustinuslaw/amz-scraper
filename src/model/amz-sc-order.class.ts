import type { AmzScLink } from "./amz-sc-link.interface";
import type { AmzScOrderItem } from "./amz-sc-order-item.class";

/**
 * Represents a complete Amazon order with all associated details.
 * Contains order metadata, shipping info, line items, and invoice links.
 */
export interface AmzScOrder {
  /** Unique Amazon order identifier (e.g., "303-1234567-8901234"). */
  readonly id: string;
  /** Order date as displayed on Amazon. */
  readonly date: string;
  /** Total order amount including tax and shipping. */
  readonly totalAmount: string;
  /** Recipient name for shipping. */
  readonly shippingName: string;
  /** Delivery address. */
  readonly shippingAddress: string;
  /** Order/payment status. */
  readonly paymentInstrument: string;
  readonly detailsUrl: string;
  /** List of items in this order. */
  readonly orderItems: AmzScOrderItem[];
}
