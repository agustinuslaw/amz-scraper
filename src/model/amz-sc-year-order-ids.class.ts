export class AmzScYearOrderIds {
  constructor(
    readonly year: number,
    readonly totalOrders: number,
    readonly orderIds: string[]
  ) {}

  get isComplete(): boolean {
    return this.totalOrders === this.orderIds.length;
  }

  get estimatedLastPage(): number {
    // Each page contains 10 orders, if say the recording stopped at 25 orders,
    // then we have pages 0 (0-9), 1 (10-19), 2 (20-29) => last page is 2
    return Math.floor(this.orderIds.length / 10);
  }
}
