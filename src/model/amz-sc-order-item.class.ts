export class AmzScOrderItem {
  constructor(
    readonly orderId: string,
    readonly title: string,
    readonly asin: string,
    readonly merchant: string,
    readonly merchantId: string,
    readonly quantity: number,
    readonly unitPrice: string,
  ) {}
}
