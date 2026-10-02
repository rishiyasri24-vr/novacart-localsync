import { describe, expect, it } from "vitest";
import { calculateAvailabilityConfidence, calculateStoreReliability, createSeedState, getSmartBasketOptions, reducer } from "./localsync";

describe("LocalSync intelligence", () => {
  it("scores a fresh, well-stocked product higher than a stale low-stock product", () => {
    const state = createSeedState();
    const reliable = state.products.find(product => product.id === "eggs-freshnest")!;
    const risky = state.products.find(product => product.id === "eggs-sri")!;
    const reliableStore = state.stores.find(store => store.id === reliable.storeId)!;
    const riskyStore = state.stores.find(store => store.id === risky.storeId)!;
    expect(calculateAvailabilityConfidence(reliable, reliableStore).score).toBeGreaterThan(calculateAvailabilityConfidence(risky, riskyStore).score);
  });

  it("exposes the measurable store reliability factors through a combined score", () => {
    const state = createSeedState();
    const store = state.stores.find(candidate => candidate.id === "freshnest")!;
    expect(calculateStoreReliability(store)).toBeGreaterThan(90);
  });

  it("creates four Smart Basket choices with different trade-offs", () => {
    const options = getSmartBasketOptions(createSeedState());
    expect(options).toHaveLength(4);
    expect(options.find(option => option.id === "fastest")?.eta).toBeLessThan(options.find(option => option.id === "single")?.eta ?? 0);
    expect(options.find(option => option.id === "cost")?.fee).toBeLessThan(options.find(option => option.id === "reliable")?.fee ?? 0);
  });

  it("propagates an inventory update into the shared state and history", () => {
    const state = createSeedState();
    const next = reducer(state, { type: "UPDATE_STOCK", productId: "eggs-sri", stock: 28 });
    expect(next.products.find(product => product.id === "eggs-sri")?.stock).toBe(28);
    expect(next.inventoryHistory[0].label).toBe("Manual freshness update");
    expect(next.notifications[0].title).toContain("confidence updated");
  });

  it("propagates the selected basket fee into the placed order total", () => {
    const state = reducer(createSeedState(), { type: "ADD_TO_CART", productId: "milk-sri" });
    const next = reducer(state, { type: "PLACE_ORDER", fee: 31 });
    expect(next.orders[0].total).toBe(58 + 31);
  });

  it("rejects a basket quantity that exceeds current inventory", () => {
    let state = reducer(createSeedState(), { type: "ADD_TO_CART", productId: "eggs-sri" });
    state = reducer(state, { type: "SET_CART_QTY", productId: "eggs-sri", quantity: 99 });
    const next = reducer(state, { type: "PLACE_ORDER", fee: 24 });
    expect(next.orders).toHaveLength(1);
    expect(next.cart[0].quantity).toBe(99);
    expect(next.lastAction).toContain("only");
  });

  it("places an order, creates a delivery, and clears the cart", () => {
    const state = reducer(createSeedState(), { type: "ADD_TO_CART", productId: "milk-sri" });
    const next = reducer(state, { type: "PLACE_ORDER" });
    expect(next.cart).toHaveLength(0);
    expect(next.orders[0].id).toMatch(/^NC/);
    expect(next.deliveries[0].orderId).toBe(next.orders[0].id);
  });

  it("restores reserved stock on cancellation and does not resurrect terminal orders", () => {
    const initial = createSeedState();
    const before = initial.products.find(product => product.id === "milk-sri")!.stock;
    const withCart = reducer(initial, { type: "ADD_TO_CART", productId: "milk-sri" });
    const placed = reducer(withCart, { type: "PLACE_ORDER" });
    const cancelled = reducer(placed, { type: "CANCEL_ORDER", orderId: placed.orders[0].id });
    expect(cancelled.products.find(product => product.id === "milk-sri")!.stock).toBe(before);
    expect(cancelled.orders[0].status).toBe("CANCELLED");
    expect(reducer(cancelled, { type: "ADVANCE_ORDER", orderId: cancelled.orders[0].id })).toEqual(cancelled);
  });
});
