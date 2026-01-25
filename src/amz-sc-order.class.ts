export class AmzScYearOrders {
  constructor(
    readonly year: number,
    readonly totalOrders: number,
    readonly orderIds: string[]
  ) {}

  get isComplete(): boolean {
    return this.totalOrders === this.orderIds.length;
  }

  get lastPage(): number {
    // Each page contains 10 orders, if say the recording stopped at 25 orders,
    // then we have pages 0 (0-9), 1 (10-19), 2 (20-29) => last page is 2
    return Math.floor(this.orderIds.length / 10);
  }
}

export class AmzScOrder {
  constructor(
    readonly id: string,
    readonly date: string,
    readonly totalAmount: string,
    readonly shippingName: string,
    readonly shippingAddress: string,
    readonly status: string,
    readonly orderItems: AmzScOrderItem[]
  ) {}
}

export class AmzScOrderItem {
  constructor(
    readonly orderId: string,
    readonly title: string,
    readonly asin: string,
    readonly merchant: string,
    readonly merchantId: string,
    readonly quantity: number,
    readonly unitPrice: string
  ) {}
}
