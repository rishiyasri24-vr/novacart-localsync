export type Role = "customer" | "store" | "admin";
export type BasketPreference = "reliable" | "fastest" | "cost" | "single";
export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type OrderStatus =
  | "ORDER_PLACED"
  | "STORE_CONFIRMING"
  | "ITEMS_BEING_PICKED"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "ARRIVING_SOON"
  | "DELIVERED"
  | "DELAYED"
  | "CANCELLED";
export type RefundStatus = "REQUESTED" | "APPROVED" | "PROCESSING" | "COMPLETED";

export type Store = {
  id: string;
  name: string;
  city: string;
  zone: string;
  accent: string;
  inventoryAccuracy: number;
  orderAcceptance: number;
  onTimePreparation: number;
  stockFreshness: number;
  workload: number;
  rejectionRate: number;
  deliveryCapacity: number;
};

export type Product = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  price: number;
  unit: string;
  icon: string;
  accent: string;
  storeId: string;
  stock: number;
  predictedDemand: number;
  lastUpdatedMinutes: number;
  accuracy: number;
  eta: number;
  tags: string[];
  alternativeIds: string[];
};

export type CartItem = { productId: string; quantity: number };
export type InventoryHistory = { id: string; productId: string; change: number; label: string; minutesAgo: number };
export type Notification = { id: string; title: string; body: string; tone: "success" | "warning" | "info"; read: boolean };
export type SupportTicket = { id: string; category: string; orderId?: string; productName?: string; status: "OPEN" | "IN REVIEW" | "RESOLVED"; createdAt: string };
export type Refund = { id: string; orderId: string; amount: number; reason: string; status: RefundStatus };
export type Order = { id: string; items: CartItem[]; total: number; status: OrderStatus; storeIds: string[]; createdAt: string; eta: number };
export type Delivery = { id: string; orderId: string; status: OrderStatus; eta: number; partner: string; delayMinutes: number; route: string };

export type SmartBasketOption = {
  id: BasketPreference;
  label: string;
  eyebrow: string;
  confidence: number;
  eta: number;
  fee: number;
  items: CartItem[];
  storeIds: string[];
  explanation: string;
  tag: string;
};

export type AppState = {
  role: Role;
  search: string;
  category: string;
  basketPreference: BasketPreference;
  selectedCity: string;
  products: Product[];
  stores: Store[];
  cart: CartItem[];
  orders: Order[];
  deliveries: Delivery[];
  tickets: SupportTicket[];
  refunds: Refund[];
  notifications: Notification[];
  inventoryHistory: InventoryHistory[];
  lastAction: string;
};

export type AppAction =
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_SEARCH"; search: string }
  | { type: "SET_CATEGORY"; category: string }
  | { type: "SET_CITY"; city: string }
  | { type: "SET_BASKET_PREFERENCE"; preference: BasketPreference }
  | { type: "ADD_TO_CART"; productId: string; quantity?: number }
  | { type: "SET_CART_QTY"; productId: string; quantity: number }
  | { type: "UPDATE_STOCK"; productId: string; stock: number }
  | { type: "PLACE_ORDER"; items?: CartItem[] }
  | { type: "ADVANCE_ORDER"; orderId: string }
  | { type: "CANCEL_ORDER"; orderId: string }
  | { type: "CREATE_TICKET"; category: string; orderId?: string; productName?: string }
  | { type: "REQUEST_REFUND"; orderId: string; amount: number; reason: string }
  | { type: "MARK_NOTIFICATION_READ"; id: string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function calculateStoreReliability(store: Store) {
  return Math.round(
    store.inventoryAccuracy * 0.32 +
      store.orderAcceptance * 0.24 +
      store.onTimePreparation * 0.2 +
      store.stockFreshness * 0.16 +
      (100 - store.rejectionRate) * 0.08,
  );
}

export function calculateAvailabilityConfidence(product: Product, store: Store) {
  const freshness = clamp(100 - product.lastUpdatedMinutes * 1.3, 20, 100);
  const stockCover = product.predictedDemand === 0 ? 100 : clamp((product.stock / product.predictedDemand) * 100, 0, 100);
  const demandSignal = product.stock >= product.predictedDemand ? 94 : product.stock >= product.predictedDemand * 0.65 ? 68 : 30;
  const workload = 100 - store.workload * 100;
  const capacity = store.deliveryCapacity;
  const score = Math.round(
    freshness * 0.2 +
      stockCover * 0.25 +
      product.accuracy * 0.18 +
      calculateStoreReliability(store) * 0.18 +
      workload * 0.08 +
      demandSignal * 0.06 +
      capacity * 0.05,
  );
  const safeScore = product.stock === 0 ? Math.min(score, 18) : clamp(score, 18, 98);
  const band: ConfidenceBand = safeScore >= 78 ? "HIGH" : safeScore >= 55 ? "MEDIUM" : "LOW";
  return {
    score: safeScore,
    band,
    freshness: Math.round(freshness),
    stockCover: Math.round(stockCover),
    reason:
      band === "HIGH"
        ? "Fresh inventory, healthy store capacity, and enough cover for predicted demand."
        : band === "MEDIUM"
          ? "Fulfillable, but recent demand or inventory freshness adds some uncertainty."
          : "Stock cover and operational signals suggest a meaningful fulfillment risk.",
  };
}

export function getStockoutRisk(product: Product): RiskLevel {
  if (product.stock <= product.predictedDemand * 0.6 || product.stock === 0) return "HIGH";
  if (product.stock < product.predictedDemand) return "MEDIUM";
  return "LOW";
}

export function getSmartBasketOptions(state: AppState): SmartBasketOption[] {
  const get = (id: string) => state.products.find(product => product.id === id)!;
  const milk = get("milk-sri");
  const bread = get("bread-sri");
  const eggsLow = get("eggs-sri");
  const eggsReliable = get("eggs-freshnest");
  const biscuits = get("biscuits-sri");
  const scoreFor = (items: CartItem[]) =>
    Math.round(items.reduce((sum, item) => {
      const product = get(item.productId);
      const store = state.stores.find(candidate => candidate.id === product.storeId)!;
      return sum + calculateAvailabilityConfidence(product, store).score;
    }, 0) / items.length);
  const total = (items: CartItem[]) => items.reduce((sum, item) => sum + get(item.productId).price * item.quantity, 0);
  const singleItems = [milk, bread, eggsLow, biscuits].map(product => ({ productId: product.id, quantity: 1 }));
  const reliableItems = [milk, bread, eggsReliable, biscuits].map(product => ({ productId: product.id, quantity: 1 }));
  const splitFastItems = [milk, bread, eggsReliable, biscuits].map(product => ({ productId: product.id, quantity: 1 }));
  return [
    {
      id: "reliable",
      label: "Most reliable",
      eyebrow: "Recommended",
      confidence: scoreFor(reliableItems),
      eta: 29,
      fee: 24,
      items: reliableItems,
      storeIds: ["sri", "freshnest"],
      explanation: "Splits only the risky egg line to FreshNest, protecting the basket from stale inventory at Sri Lakshmi.",
      tag: "Best balance",
    },
    {
      id: "fastest",
      label: "Fastest",
      eyebrow: "2 stores",
      confidence: Math.max(82, scoreFor(splitFastItems) - 2),
      eta: 24,
      fee: 31,
      items: splitFastItems,
      storeIds: ["sri", "freshnest"],
      explanation: "Uses available rider capacity across two nearby stores to save five minutes.",
      tag: "-5 min",
    },
    {
      id: "cost",
      label: "Lowest cost",
      eyebrow: "1 store",
      confidence: Math.max(58, scoreFor(singleItems) - 4),
      eta: 32,
      fee: 12,
      items: singleItems,
      storeIds: ["sri"],
      explanation: "Keeps the basket in one store and applies the lowest delivery fee, with lower confidence on eggs.",
      tag: "Save ₹12",
    },
    {
      id: "single",
      label: "Single store",
      eyebrow: "Sri Lakshmi",
      confidence: scoreFor(singleItems),
      eta: 31,
      fee: 18,
      items: singleItems,
      storeIds: ["sri"],
      explanation: "One familiar store, one handoff, but eggs have low confidence until inventory is refreshed.",
      tag: "1 handoff",
    },
  ].map(option => ({ ...option, fee: option.fee, confidence: clamp(option.confidence, 18, 98), eta: option.eta, total: total(option.items) } as SmartBasketOption & { total: number }));
}

export function getHealthMetrics(state: AppState) {
  const cancelled = state.orders.filter(order => order.status === "CANCELLED").length;
  const delayed = state.deliveries.filter(delivery => delivery.status === "DELAYED").length;
  const active = state.orders.filter(order => !["DELIVERED", "CANCELLED"].includes(order.status)).length;
  return {
    registered: 120000,
    activeUsers: 46000 + active * 3,
    orders: 38500 + state.orders.length,
    aov: 486,
    repeat: 27 + Math.min(4, state.orders.length),
    cancellation: Math.max(6.8, 11 - cancelled * 0.7),
    deliveryTime: 37 + delayed * 2,
    support: 5900 + state.tickets.length * 14,
    promoSpend: 1700000,
    revenue: 2610000 + state.orders.reduce((sum, order) => sum + order.total, 0),
  };
}

export function getBusinessHealthFindings(state: AppState) {
  const lowConfidence = state.products.filter(product => {
    const store = state.stores.find(candidate => candidate.id === product.storeId)!;
    return calculateAvailabilityConfidence(product, store).score < 60;
  }).length;
  const highRisk = state.products.filter(product => getStockoutRisk(product) === "HIGH").length;
  return [
    {
      label: "Product availability",
      risk: lowConfidence > 0 ? "HIGH" : "MEDIUM",
      value: `${lowConfidence ? 35 : 27}% of cancellations are associated with product unavailability.`,
      action: "Improve inventory freshness for high-demand stores.",
      icon: "inventory",
    },
    {
      label: "Delivery reliability",
      risk: "HIGH",
      value: `${highRisk + 12}% of orders arrive more than 15 minutes after estimated time.`,
      action: "Monitor overloaded stores and delivery capacity.",
      icon: "delivery",
    },
    {
      label: "Promotion efficiency",
      risk: "MEDIUM",
      value: "44% of issued coupons are never redeemed, increasing acquisition cost.",
      action: "Shift budget to reliability-led retention journeys.",
      icon: "promotion",
    },
  ] as const;
}

const stores: Store[] = [
  { id: "sri", name: "Sri Lakshmi Stores", city: "Bengaluru", zone: "Indiranagar", accent: "lime", inventoryAccuracy: 92, orderAcceptance: 96, onTimePreparation: 89, stockFreshness: 95, workload: 0.34, rejectionRate: 4, deliveryCapacity: 92 },
  { id: "freshnest", name: "FreshNest Market", city: "Bengaluru", zone: "Koramangala", accent: "violet", inventoryAccuracy: 96, orderAcceptance: 94, onTimePreparation: 93, stockFreshness: 98, workload: 0.28, rejectionRate: 6, deliveryCapacity: 96 },
  { id: "greenbasket", name: "GreenBasket Local", city: "Hyderabad", zone: "Banjara Hills", accent: "amber", inventoryAccuracy: 84, orderAcceptance: 88, onTimePreparation: 82, stockFreshness: 73, workload: 0.57, rejectionRate: 12, deliveryCapacity: 78 },
];

const products: Product[] = [
  { id: "milk-sri", name: "Amul Taaza Milk 1L", shortName: "Amul Milk 1L", category: "Dairy", price: 58, unit: "1 litre", icon: "🥛", accent: "#c9f16d", storeId: "sri", stock: 28, predictedDemand: 18, lastUpdatedMinutes: 8, accuracy: 96, eta: 26, tags: ["Daily essential", "High repeat"], alternativeIds: ["milk-freshnest"] },
  { id: "milk-freshnest", name: "Amul Taaza Milk 1L", shortName: "Amul Milk 1L", category: "Dairy", price: 59, unit: "1 litre", icon: "🥛", accent: "#c7b7ff", storeId: "freshnest", stock: 35, predictedDemand: 19, lastUpdatedMinutes: 4, accuracy: 98, eta: 28, tags: ["Fresh update"], alternativeIds: ["milk-sri"] },
  { id: "bread-sri", name: "Harvest Gold Bread", shortName: "Harvest Bread", category: "Bakery", price: 45, unit: "400 g", icon: "🍞", accent: "#f6c98a", storeId: "sri", stock: 18, predictedDemand: 14, lastUpdatedMinutes: 11, accuracy: 93, eta: 25, tags: ["Bestseller"], alternativeIds: ["bread-freshnest"] },
  { id: "bread-freshnest", name: "Harvest Gold Bread", shortName: "Harvest Bread", category: "Bakery", price: 46, unit: "400 g", icon: "🍞", accent: "#e6d8ff", storeId: "freshnest", stock: 22, predictedDemand: 16, lastUpdatedMinutes: 12, accuracy: 94, eta: 28, tags: ["Reliable"], alternativeIds: ["bread-sri"] },
  { id: "eggs-sri", name: "Farm Fresh Eggs 12 pack", shortName: "Farm Eggs 12 pack", category: "Pantry", price: 124, unit: "12 eggs", icon: "🥚", accent: "#ffcf93", storeId: "sri", stock: 7, predictedDemand: 18, lastUpdatedMinutes: 43, accuracy: 72, eta: 27, tags: ["Low confidence"], alternativeIds: ["eggs-freshnest"] },
  { id: "eggs-freshnest", name: "Farm Fresh Eggs 12 pack", shortName: "Farm Eggs 12 pack", category: "Pantry", price: 126, unit: "12 eggs", icon: "🥚", accent: "#d1c5ff", storeId: "freshnest", stock: 24, predictedDemand: 19, lastUpdatedMinutes: 6, accuracy: 97, eta: 29, tags: ["Recommended alternative"], alternativeIds: ["eggs-sri"] },
  { id: "biscuits-sri", name: "Parle-G Gold Biscuits", shortName: "Parle-G Gold", category: "Snacks", price: 30, unit: "800 g", icon: "🍪", accent: "#ff9e87", storeId: "sri", stock: 25, predictedDemand: 11, lastUpdatedMinutes: 17, accuracy: 94, eta: 25, tags: ["Family favourite"], alternativeIds: ["biscuits-greenbasket"] },
  { id: "coffee-greenbasket", name: "Filter Coffee Blend", shortName: "Filter Coffee", category: "Beverages", price: 210, unit: "250 g", icon: "☕", accent: "#a6decf", storeId: "greenbasket", stock: 9, predictedDemand: 15, lastUpdatedMinutes: 67, accuracy: 81, eta: 42, tags: ["Local pick"], alternativeIds: [] },
];

export function createSeedState(): AppState {
  return {
    role: "customer",
    search: "",
    category: "All",
    basketPreference: "reliable",
    selectedCity: "Bengaluru",
    products,
    stores,
    cart: [],
    orders: [
      { id: "NC10482", items: [{ productId: "milk-sri", quantity: 1 }, { productId: "bread-sri", quantity: 1 }], total: 127, status: "OUT_FOR_DELIVERY", storeIds: ["sri"], createdAt: "Today, 10:12 AM", eta: 18 },
    ],
    deliveries: [{ id: "D-482", orderId: "NC10482", status: "OUT_FOR_DELIVERY", eta: 18, partner: "Arjun · NC Rider 204", delayMinutes: 0, route: "Sri Lakshmi → 12th Main → Home" }],
    tickets: [{ id: "SUP-2219", category: "Refund status", orderId: "NC10482", status: "IN REVIEW", createdAt: "Today, 9:40 AM" }],
    refunds: [{ id: "RF-811", orderId: "NC10482", amount: 124, reason: "Missing product", status: "PROCESSING" }],
    notifications: [
      { id: "n-1", title: "Your rider is 3 stops away", body: "NC10482 is arriving in 18 minutes.", tone: "info", read: false },
      { id: "n-2", title: "FreshNest found an alternative", body: "Eggs have 92% confidence at a nearby store.", tone: "success", read: false },
      { id: "n-3", title: "Inventory pulse", body: "3 products need a stock update today.", tone: "warning", read: true },
    ],
    inventoryHistory: [
      { id: "h-1", productId: "eggs-sri", change: -4, label: "Morning order volume", minutesAgo: 42 },
      { id: "h-2", productId: "milk-sri", change: 12, label: "Stock received", minutesAgo: 96 },
      { id: "h-3", productId: "biscuits-sri", change: -3, label: "Store sale", minutesAgo: 126 },
    ],
    lastAction: "Ready for a more reliable basket.",
  };
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, role: action.role, lastAction: `Switched to ${action.role === "customer" ? "Customer" : action.role === "store" ? "Store Manager" : "Operations Admin"} demo.` };
    case "SET_SEARCH":
      return { ...state, search: action.search };
    case "SET_CATEGORY":
      return { ...state, category: action.category };
    case "SET_CITY":
      return { ...state, selectedCity: action.city };
    case "SET_BASKET_PREFERENCE":
      return { ...state, basketPreference: action.preference, lastAction: `Smart Basket optimized for ${action.preference === "reliable" ? "reliability" : action.preference === "fastest" ? "speed" : action.preference === "cost" ? "cost" : "one store"}.` };
    case "ADD_TO_CART": {
      const quantity = action.quantity ?? 1;
      const existing = state.cart.find(item => item.productId === action.productId);
      const cart = existing
        ? state.cart.map(item => item.productId === action.productId ? { ...item, quantity: item.quantity + quantity } : item)
        : [...state.cart, { productId: action.productId, quantity }];
      const product = state.products.find(item => item.id === action.productId);
      return { ...state, cart, lastAction: `${product?.shortName ?? "Product"} added to basket.` };
    }
    case "SET_CART_QTY":
      return { ...state, cart: action.quantity <= 0 ? state.cart.filter(item => item.productId !== action.productId) : state.cart.map(item => item.productId === action.productId ? { ...item, quantity: action.quantity } : item) };
    case "UPDATE_STOCK": {
      const product = state.products.find(item => item.id === action.productId);
      if (!product) return state;
      const nextStock = Math.max(0, action.stock);
      const products = state.products.map(item => item.id === action.productId ? { ...item, stock: nextStock, lastUpdatedMinutes: 0 } : item);
      return {
        ...state,
        products,
        inventoryHistory: [{ id: `h-${Date.now()}`, productId: action.productId, change: nextStock - product.stock, label: "Manual freshness update", minutesAgo: 0 }, ...state.inventoryHistory],
        notifications: [{ id: `n-${Date.now()}`, title: `${product.shortName} confidence updated`, body: `Fresh stock signal is now ${nextStock} units. Customer recommendations recalculated.`, tone: "success", read: false }, ...state.notifications],
        lastAction: `${product.shortName} updated to ${nextStock} units.`,
      };
    }
    case "PLACE_ORDER": {
      const items = action.items?.length ? action.items : state.cart;
      if (!items.length) return { ...state, lastAction: "Add a product before placing an order." };
      const getProduct = (id: string) => state.products.find(product => product.id === id)!;
      const total = items.reduce((sum, item) => sum + getProduct(item.productId).price * item.quantity, 0);
      const orderId = `NC${10483 + state.orders.length}`;
      const storeIds = [...new Set(items.map(item => getProduct(item.productId).storeId))];
      const products = state.products.map(product => {
        const line = items.find(item => item.productId === product.id);
        return line ? { ...product, stock: Math.max(0, product.stock - line.quantity) } : product;
      });
      return {
        ...state,
        products,
        cart: [],
        orders: [{ id: orderId, items, total: total + 24, status: "STORE_CONFIRMING", storeIds, createdAt: "Just now", eta: 27 }, ...state.orders],
        deliveries: [{ id: `D-${482 + state.orders.length}`, orderId, status: "STORE_CONFIRMING", eta: 27, partner: "Assigning nearby rider", delayMinutes: 0, route: "Store confirmation in progress" }, ...state.deliveries],
        notifications: [{ id: `n-${Date.now()}`, title: "Order placed — reliability check running", body: `${orderId} is being confirmed across ${storeIds.length} store${storeIds.length > 1 ? "s" : ""}.`, tone: "success", read: false }, ...state.notifications],
        lastAction: `${orderId} placed. Tracking is live.`,
      };
    }
    case "ADVANCE_ORDER": {
      const delivery = state.deliveries.find(item => item.orderId === action.orderId);
      const order = state.orders.find(item => item.id === action.orderId);
      if (!delivery || !order) return state;
      const steps: OrderStatus[] = ["STORE_CONFIRMING", "ITEMS_BEING_PICKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "ARRIVING_SOON", "DELIVERED"];
      const nextIndex = Math.min(steps.length - 1, Math.max(0, steps.indexOf(delivery.status) + 1));
      const nextStatus = steps[nextIndex];
      return {
        ...state,
        orders: state.orders.map(item => item.id === order.id ? { ...item, status: nextStatus, eta: Math.max(0, item.eta - 7) } : item),
        deliveries: state.deliveries.map(item => item.orderId === order.id ? { ...item, status: nextStatus, eta: Math.max(0, item.eta - 7), partner: nextStatus === "OUT_FOR_DELIVERY" ? "Arjun · NC Rider 204" : item.partner, route: nextStatus === "DELIVERED" ? "Delivered at your door" : item.route } : item),
        notifications: [{ id: `n-${Date.now()}`, title: `Order ${nextStatus.toLowerCase().replaceAll("_", " ")}`, body: `${order.id} has moved to the next reliable handoff.`, tone: "info", read: false }, ...state.notifications],
        lastAction: `${order.id} moved to ${nextStatus.replaceAll("_", " ")}.`,
      };
    }
    case "CANCEL_ORDER":
      return {
        ...state,
        orders: state.orders.map(order => order.id === action.orderId && !["DELIVERED", "CANCELLED"].includes(order.status) ? { ...order, status: "CANCELLED" } : order),
        deliveries: state.deliveries.map(delivery => delivery.orderId === action.orderId ? { ...delivery, status: "CANCELLED" } : delivery),
        notifications: [{ id: `n-${Date.now()}`, title: "Cancellation requested", body: `${action.orderId} is no longer being fulfilled.`, tone: "warning", read: false }, ...state.notifications],
        lastAction: `${action.orderId} cancellation recorded.`,
      };
    case "CREATE_TICKET": {
      const ticket: SupportTicket = { id: `SUP-${2220 + state.tickets.length}`, category: action.category, orderId: action.orderId, productName: action.productName, status: "OPEN", createdAt: "Just now" };
      return { ...state, tickets: [ticket, ...state.tickets], notifications: [{ id: `n-${Date.now()}`, title: "Support ticket created", body: `${ticket.id} is now in review.`, tone: "success", read: false }, ...state.notifications], lastAction: `${ticket.id} created with order context attached.` };
    }
    case "REQUEST_REFUND": {
      const refund: Refund = { id: `RF-${812 + state.refunds.length}`, orderId: action.orderId, amount: action.amount, reason: action.reason, status: "REQUESTED" };
      return { ...state, refunds: [refund, ...state.refunds], notifications: [{ id: `n-${Date.now()}`, title: "Refund request received", body: `${formatCurrency(action.amount)} is being validated for ${action.orderId}.`, tone: "info", read: false }, ...state.notifications], lastAction: `${refund.id} submitted for validation.` };
    }
    case "MARK_NOTIFICATION_READ":
      return { ...state, notifications: state.notifications.map(notification => notification.id === action.id ? { ...notification, read: true } : notification) };
    default:
      return state;
  }
}
