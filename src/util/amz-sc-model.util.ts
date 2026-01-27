import type { AmzScOrder } from "../model";

export function appendUniqueOrder(existingOrders: AmzScOrder[], order: AmzScOrder): void {
  const orderExists = existingOrders.some((o) => o.id === order.id);
  if (orderExists) {
    console.log(`Order ${order.id} already exists in file, skipping append.`);
    return;
  }
  existingOrders.push(order);
}
