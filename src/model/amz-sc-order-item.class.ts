/**
 * Represents a single item within an Amazon order.
 * Contains product identification, seller info, and pricing.
 */
export interface AmzScOrderItem {
  /** The parent order ID this item belongs to. */
  readonly orderId: string;
  /** Product title/name. */
  readonly title: string;
  /** Amazon Standard Identification Number. */
  readonly asin: string;
  /** Seller/merchant name. */
  readonly merchant: string;
  /** Unique seller identifier. */
  readonly merchantId: string;
  /** Number of units purchased. */
  readonly quantity: number;
  /** Price per unit as displayed (with currency symbol). */
  readonly unitPrice: string;
}
