import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Clock3,
  Command,
  Database,
  Heart,
  LayoutDashboard,
  MapPin,
  Menu,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  calculateAvailabilityConfidence,
  calculateStoreReliability,
  formatCurrency,
  getBusinessHealthFindings,
  getHealthMetrics,
  getSmartBasketOptions,
  getStockoutRisk,
  type AppState,
  type BasketPreference,
  type Product,
  type Role,
} from "@shared/localsync";
import { useLocalSync } from "../contexts/LocalSyncContext";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const categories = ["All", "Dairy", "Bakery", "Pantry", "Snacks", "Beverages"];
const cities = ["Bengaluru", "Hyderabad", "Chennai"];

const roleMeta: Record<Role, { label: string; sublabel: string; icon: LucideIcon }> = {
  customer: { label: "Customer", sublabel: "Shop with confidence", icon: ShoppingBag },
  store: { label: "Store Manager", sublabel: "Inventory command center", icon: Store },
  admin: { label: "Operations Admin", sublabel: "Business health engine", icon: LayoutDashboard },
};

const money = (value: number) => formatCurrency(value);
const getStore = (state: AppState, storeId: string) => state.stores.find(store => store.id === storeId)!;
const getProduct = (state: AppState, productId: string) => state.products.find(product => product.id === productId);

function scoreColor(score: number) {
  if (score >= 78) return "#8fd640";
  if (score >= 55) return "#f2b65f";
  return "#e57b65";
}

function riskColor(risk: string) {
  return risk === "HIGH" ? "#e57b65" : risk === "MEDIUM" ? "#f2b65f" : "#8fd640";
}

function ConfidenceMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  const color = scoreColor(score);
  return (
    <div className={compact ? "confidence confidence-compact" : "confidence"}>
      <div className="confidence-track"><span style={{ width: `${score}%`, background: color }} /></div>
      <span className="confidence-value" style={{ color }}>{score}%</span>
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "violet" }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="section-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, delta, icon: Icon, tone = "lime", detail }: { label: string; value: string; delta?: string; icon: LucideIcon; tone?: string; detail?: string }) {
  return (
    <div className="metric-card">
      <div className="metric-topline"><span className={`metric-icon ${tone}`}><Icon size={16} /></span>{delta && <span className="metric-delta">{delta}</span>}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}

function Modal({ title, eyebrow, onClose, children, width = "520px" }: { title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div><div className="eyebrow">{eyebrow ?? "LocalSync"}</div><h3>{title}</h3></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductCard({ product, state, onOpen, onAdd }: { product: Product; state: AppState; onOpen: () => void; onAdd: () => void }) {
  const store = getStore(state, product.storeId);
  const confidence = calculateAvailabilityConfidence(product, store);
  return (
    <article className="product-card">
      <button className="product-art" style={{ background: product.accent }} onClick={onOpen} aria-label={`Open ${product.name}`}><span>{product.icon}</span><Heart size={16} /></button>
      <div className="product-copy">
        <div className="product-category">{product.category} · {product.unit}</div>
        <h3>{product.name}</h3>
        <div className="product-store"><Store size={13} /> {store.name}</div>
        <div className="product-price-row"><strong>{money(product.price)}</strong><span>per unit</span></div>
        <div className="product-signal"><div><span className="mini-label">Availability confidence</span><ConfidenceMeter score={confidence.score} compact /></div><span className="eta-badge"><Clock3 size={13} /> {product.eta}m</span></div>
        <div className="product-actions"><button className="text-button" onClick={onOpen}>View details <ArrowUpRight size={14} /></button><button className="add-button" onClick={onAdd}><Plus size={16} /> Add</button></div>
      </div>
    </article>
  );
}

function TopBar({ state, onSearch, onNotifications, onCart, onMenu }: { state: AppState; onSearch: (value: string) => void; onNotifications: () => void; onCart: () => void; onMenu: () => void }) {
  const unread = state.notifications.filter(notification => !notification.read).length;
  return (
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button>
      <div className="search-wrap"><Search size={17} /><input value={state.search} onChange={event => onSearch(event.target.value)} placeholder="Search products, stores, or signals" /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <button className="location-chip"><MapPin size={15} /><span>{state.selectedCity}</span><ChevronDown size={14} /></button>
        <button className="icon-button notification-button" onClick={onNotifications} aria-label="Notifications"><Bell size={18} />{unread > 0 && <span className="notification-dot">{unread}</span>}</button>
        <button className="cart-chip" onClick={onCart}><ShoppingBag size={16} /><span>{state.cart.reduce((sum, item) => sum + item.quantity, 0)}</span><strong>{money(state.cart.reduce((sum, item) => sum + (getProduct(state, item.productId)?.price ?? 0) * item.quantity, 0))}</strong></button>
        <div className="avatar">AV</div>
      </div>
    </header>
  );
}

function Sidebar({ role, onRoleChange, open, onClose }: { role: Role; onRoleChange: (role: Role) => void; open: boolean; onClose: () => void }) {
  const active = roleMeta[role];
  const roleItems: Record<Role, { label: string; icon: LucideIcon; anchor: string }[]> = {
    customer: [{ label: "Discover", icon: Sparkles, anchor: "discover" }, { label: "Smart Basket", icon: Zap, anchor: "smart-basket" }, { label: "Your orders", icon: Package, anchor: "orders" }, { label: "Support", icon: CircleHelp, anchor: "support" }],
    store: [{ label: "Command center", icon: LayoutDashboard, anchor: "store-overview" }, { label: "Inventory pulse", icon: Database, anchor: "inventory" }, { label: "Smart assistant", icon: Bot, anchor: "assistant" }, { label: "Order capacity", icon: Truck, anchor: "store-orders" }],
    admin: [{ label: "Business health", icon: Activity, anchor: "business-health" }, { label: "Delivery ops", icon: Truck, anchor: "delivery-ops" }, { label: "Retention", icon: Users, anchor: "retention" }, { label: "Promotions", icon: Tags, anchor: "promotions" }],
  };
  const items = roleItems[role];
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><div className="brand-name">NOVA<span>/</span>CART</div><div className="brand-sub">LOCALSYNC <i>•</i> 01</div></div><button className="sidebar-close icon-button" onClick={onClose}><X size={18} /></button></div>
      <div className="mode-label">Demo mode</div>
      <div className="role-switcher">
        {(Object.keys(roleMeta) as Role[]).map(option => { const meta = roleMeta[option]; const Icon = meta.icon; return <button key={option} className={role === option ? "role-option active" : "role-option"} onClick={() => { onRoleChange(option); onClose(); }}><Icon size={16} /><span><b>{meta.label}</b><small>{meta.sublabel}</small></span>{role === option && <CircleCheck size={15} />}</button>; })}
      </div>
      <div className="nav-label">Workspace</div>
      <nav className="side-nav">{items.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => { document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth" }); onClose(); }}><Icon size={17} /><span>{item.label}</span><ArrowUpRight size={13} /></button>; })}</nav>
      <div className="sidebar-bottom"><div className="network-status"><span className="live-dot" /><div><b>Network healthy</b><span>620 stores connected</span></div><Activity size={16} /></div><div className="sidebar-foot"><span>v0.9 prototype</span><span>Help <CircleHelp size={13} /></span></div></div>
      <div className="sidebar-scrim" onClick={onClose} />
    </aside>
  );
}

function CustomerView({ state, onOpenProduct, onCheckout, onSupport, onRefund, onTrack }: { state: AppState; onOpenProduct: (product: Product) => void; onCheckout: () => void; onSupport: () => void; onRefund: (orderId: string) => void; onTrack: (orderId: string) => void }) {
  const { dispatch } = useLocalSync();
  const options = getSmartBasketOptions(state);
  const selectedOption = options.find(option => option.id === state.basketPreference) ?? options[0];
  const visibleProducts = state.products.filter(product => {
    const matchesSearch = !state.search || `${product.name} ${product.category} ${getStore(state, product.storeId).name}`.toLowerCase().includes(state.search.toLowerCase());
    const matchesCategory = state.category === "All" || product.category === state.category;
    return matchesSearch && matchesCategory;
  }).filter(product => product.storeId !== "freshnest" || state.search.length > 0);
  const activeOrder = state.orders[0];
  const activeDelivery = state.deliveries.find(delivery => delivery.orderId === activeOrder?.id);
  const cartTotal = state.cart.reduce((sum, item) => sum + (getProduct(state, item.productId)?.price ?? 0) * item.quantity, 0);
  return (
    <div className="page-stack customer-page">
      <section className="customer-hero" id="discover">
        <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> LIVE NETWORK · BENGALURU <span className="hero-kicker-divider" /> PROTOTYPE INTELLIGENCE MODEL</div><h1>Confidence<br /><em>before</em> convenience.</h1><p>LocalSync connects what a store says it has to what you can actually rely on. Every basket is a reliability decision.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById("smart-basket")?.scrollIntoView({ behavior: "smooth" })}>Optimize a basket <ArrowRight size={16} /></button><button className="quiet-button" onClick={() => document.getElementById("why-localsync")?.scrollIntoView({ behavior: "smooth" })}>Why LocalSync <ArrowUpRight size={15} /></button></div></div>
        <div className="hero-signal-card"><div className="signal-orbit orbit-one" /><div className="signal-orbit orbit-two" /><div className="signal-card-label"><span className="live-dot" /> NETWORK PULSE <span>11:42:06</span></div><div className="hero-confidence"><strong>94</strong><span>%</span><div>confidence<br /><b>high</b></div></div><div className="signal-trace"><span /><span /><span /><span /><span /></div><div className="signal-card-footer"><span>Amul Milk 1L</span><span><MapPin size={13} /> 8 min ago</span></div></div>
      </section>
      <section className="metric-strip"><MetricCard label="Monthly active users" value="46k" delta="+18%" icon={Users} detail="retention-led growth" /><MetricCard label="Orders this month" value="38.5k" delta="+23%" icon={ShoppingBag} detail="across 620 local stores" tone="violet" /><MetricCard label="Average delivery" value="37 min" delta="−4m" icon={Clock3} detail="targeting < 30 min" tone="amber" /><MetricCard label="Reliability pulse" value="89%" delta="+7 pts" icon={ShieldCheck} detail="confidence-weighted" tone="coral" /></section>
      <section className="section-block" id="smart-basket"><SectionTitle eyebrow="Smart Basket / 01" title="Build a basket that will actually arrive." description="Tell us what you need. LocalSync checks nearby stock, store workload, rider capacity, and freshness before recommending a fulfillment plan." action={<span className="prototype-chip"><Sparkles size={13} /> Transparent intelligence</span>} /><div className="basket-layout"><div className="basket-input-card"><div className="input-label">Your shopping list</div><div className="basket-input"><Command size={17} /><span>Milk, bread, eggs and biscuits</span><span className="input-ready"><CircleCheck size={14} /> parsed</span></div><div className="basket-tags"><span>4 products</span><span>2 nearby stores</span><span>₹258 before fees</span></div><div className="preference-tabs">{options.map(option => <button key={option.id} className={state.basketPreference === option.id ? "preference-tab active" : "preference-tab"} onClick={() => dispatch({ type: "SET_BASKET_PREFERENCE", preference: option.id })}><span>{option.label}</span><small>{option.tag}</small></button>)}</div></div><div className="recommendation-card"><div className="recommendation-head"><span className="recommendation-badge"><Sparkles size={14} /> {selectedOption.eyebrow}</span><span className="recommendation-mode">{selectedOption.label}</span></div><div className="recommendation-main"><div className="recommendation-score"><strong>{selectedOption.confidence}</strong><span>%</span><small>fulfillment confidence</small></div><div className="recommendation-reasons"><div><Clock3 size={15} /><span><b>{selectedOption.eta} min</b><small>estimated arrival</small></span></div><div><Store size={15} /><span><b>{selectedOption.storeIds.length} store{selectedOption.storeIds.length > 1 ? "s" : ""}</b><small>{selectedOption.storeIds.map(id => getStore(state, id).name.split(" ")[0]).join(" + ")}</small></span></div><div><WalletCards size={15} /><span><b>{money(selectedOption.fee)} delivery</b><small>transparent fee</small></span></div></div></div><div className="recommendation-explanation"><Zap size={15} /><span>{selectedOption.explanation}</span></div><button className="secondary-button full-width" onClick={() => { selectedOption.items.forEach(item => dispatch({ type: "ADD_TO_CART", productId: item.productId, quantity: item.quantity })); toast.success("Smart Basket added", { description: `${selectedOption.label} plan is ready in your basket.` }); onCheckout(); }}>Use this basket <ArrowRight size={15} /></button></div></div></section>
      <section className="section-block" id="catalog"><SectionTitle eyebrow="Local discovery / 02" title="Good products. Better signals." description="Shop nearby, see the confidence behind every availability claim." action={<button className="filter-button"><SlidersHorizontal size={15} /> More filters</button>} /><div className="category-row">{categories.map(category => <button key={category} className={state.category === category ? "category-pill active" : "category-pill"} onClick={() => dispatch({ type: "SET_CATEGORY", category })}>{category}</button>)}</div><div className="product-grid">{visibleProducts.slice(0, 6).map(product => <ProductCard key={product.id} product={product} state={state} onOpen={() => onOpenProduct(product)} onAdd={() => { dispatch({ type: "ADD_TO_CART", productId: product.id }); toast.success(`${product.shortName} added`, { description: "Your basket has been updated." }); }} />)}</div>{visibleProducts.length === 0 && <div className="empty-card"><Search size={22} /><h3>No products matched that signal.</h3><p>Try a different product, category, or city.</p></div>}</section>
      <section className="split-section" id="orders"><div className="section-block compact-block"><SectionTitle eyebrow="Live order / 03" title="A useful tracker, not a spinner." description="Every handoff is visible, with a human-readable reason for the ETA." /><div className="order-card"><div className="order-card-head"><div><span className="order-id">ORDER #{activeOrder.id}</span><h3>{activeOrder.status === "DELIVERED" ? "Delivered safely" : "Your order is moving"}</h3></div><StatusPill tone={activeOrder.status === "CANCELLED" ? "bad" : "good"}>{activeOrder.status.replaceAll("_", " ")}</StatusPill></div><div className="order-route"><div className="route-line"><span className="route-node done"><Check size={12} /></span><span className="route-node active"><Truck size={13} /></span><span className="route-node" /></div><div className="route-copy"><div><b>Order confirmed</b><span>Items are verified at {getStore(state, activeOrder.storeIds[0]).name}</span></div><div><b>{activeDelivery?.partner ?? "Rider assignment"}</b><span>{activeDelivery?.route ?? "Preparing your next handoff"}</span></div><div><b>Arriving in {activeOrder.eta} min</b><span>Live ETA based on route and workload</span></div></div></div><div className="order-actions"><button className="secondary-button" onClick={() => onTrack(activeOrder.id)}>Open live tracking <ArrowUpRight size={15} /></button><button className="text-button" onClick={() => onRefund(activeOrder.id)}>Request refund</button><button className="text-button danger-text" onClick={() => { dispatch({ type: "CANCEL_ORDER", orderId: activeOrder.id }); toast.success("Cancellation recorded"); }}>Cancel</button></div></div></div><div className="section-block compact-block" id="support"><SectionTitle eyebrow="Support / 04" title="Context travels with the issue." description="No retyping an order number you already gave us." /><div className="support-card"><div className="support-icon"><CircleHelp size={22} /></div><div><h3>Need help with #{activeOrder.id}?</h3><p>Refund status, delayed delivery, missing product, coupon issue, incorrect order, or anything else.</p></div><button className="icon-button" onClick={onSupport} aria-label="Open support"><ArrowUpRight size={17} /></button></div><div className="ticket-row"><span><span className="live-dot amber-dot" /> {state.tickets[0]?.id ?? "SUP-2219"}</span><b>{state.tickets[0]?.category ?? "Refund status"}</b><StatusPill tone="warn">{state.tickets[0]?.status ?? "IN REVIEW"}</StatusPill></div></div></section>
      <section className="why-section" id="why-localsync"><div className="why-visual"><div className="why-grid" /><div className="why-orbit"><div className="orbit-label">AVAILABLE</div><div className="orbit-label second">RELIABLE</div><span className="orbit-core"><ShieldCheck size={32} /></span></div></div><div className="why-copy"><div className="eyebrow">The LocalSync difference</div><h2>Availability is a claim.<br /><em>Reliability is a promise.</em></h2><p>When 29% of customers see products disappear after ordering, “in stock” is not enough. We turn freshness, store behavior, and delivery capacity into one confidence signal before you pay.</p><div className="proof-row"><div><b>94%</b><span>high-confidence<br />milk signal</span></div><div><b>−35%</b><span>avoidable stockout<br />cancellations</span></div><div><b>+12 pts</b><span>repeat purchase<br />opportunity</span></div></div></div></section>
    </div>
  );
}

function StoreView() {
  const { state, dispatch } = useLocalSync();
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("All");
  const [assistantPrompt, setAssistantPrompt] = useState("What should I restock today?");
  const store = state.stores[0];
  const products = state.products.filter(product => product.storeId === store.id && (inventoryCategory === "All" || product.category === inventoryCategory) && (!inventorySearch || product.name.toLowerCase().includes(inventorySearch.toLowerCase())));
  const reliability = calculateStoreReliability(store);
  const highRisk = state.products.filter(product => product.storeId === store.id && getStockoutRisk(product) === "HIGH");
  const assistantAnswer = useMemo(() => {
    const fastest = [...state.products].sort((a, b) => b.predictedDemand - a.predictedDemand)[0];
    if (assistantPrompt.includes("restock")) return `${highRisk.length ? highRisk.map(product => product.shortName).join(" and ") : fastest.shortName} should be restocked first. Demand is running at ${fastest.predictedDemand} units against ${fastest.stock} on hand.`;
    if (assistantPrompt.includes("tonight")) return highRisk.length ? `${highRisk[0].shortName} has ${highRisk[0].stock} units left against ${highRisk[0].predictedDemand} predicted. Refresh the count before 8 PM.` : "No high-risk stockout is currently predicted for your catalog.";
    if (assistantPrompt.includes("faster")) return `${fastest.shortName} is selling fastest at ${fastest.predictedDemand} predicted units. Keep the shelf signal fresh every 30 minutes.`;
    if (assistantPrompt.includes("accuracy")) return `Your accuracy is ${store.inventoryAccuracy}%. The stale egg count is the biggest drag; one fresh update can lift confidence immediately.`;
    if (assistantPrompt.includes("promote")) return "Promote Filter Coffee Blend after a fresh stock update: it has local demand but is under-discovered in the Bengaluru feed.";
    return `You can safely accept ${Math.max(6, Math.round((1 - store.workload) * 18))} more orders. Current workload is ${Math.round(store.workload * 100)}% with ${store.deliveryCapacity}% rider capacity.`;
  }, [assistantPrompt, highRisk, state.products, store]);
  return (
    <div className="page-stack" id="store-overview"><section className="page-heading store-heading"><div><div className="hero-kicker"><span className="live-dot" /> STORE MANAGER DEMO · SRI LAKSHMI STORES</div><h1>Make every shelf<br /><em>trustworthy.</em></h1><p>Your command center for fresher inventory, safer orders, and fewer avoidable cancellations.</p></div><div className="store-score-card"><div className="score-card-top"><span>Fulfillment reliability</span><ShieldCheck size={17} /></div><div className="score-big">{reliability}<small>/100</small></div><ConfidenceMeter score={reliability} /><div className="score-foot"><span>+4 pts this week</span><span>top 12% in Bengaluru</span></div></div></section><section className="metric-strip four"><MetricCard label="Inventory accuracy" value={`${store.inventoryAccuracy}%`} delta="+3.2 pts" icon={Database} detail="freshness-weighted" /><MetricCard label="Predicted stockouts" value={`${highRisk.length}`} delta="needs action" icon={AlertTriangle} tone="amber" detail="before tonight" /><MetricCard label="Safe order capacity" value="12" delta="+4" icon={Truck} tone="violet" detail="orders right now" /><MetricCard label="On-time preparation" value={`${store.onTimePreparation}%`} delta="+2.1%" icon={Clock3} tone="coral" detail="last 7 days" /></section><section className="section-block" id="inventory"><SectionTitle eyebrow="Inventory pulse / 01" title="The shelf, before the order." description="One-tap updates change customer confidence immediately. No spreadsheets, no stale green dots." action={<button className="primary-button small" onClick={() => { const target = state.products.find(product => getStockoutRisk(product) === "HIGH"); if (target) { dispatch({ type: "UPDATE_STOCK", productId: target.id, stock: target.predictedDemand + 5 }); toast.success(`${target.shortName} signal refreshed`); } }}>Refresh highest risk <RefreshCw size={14} /></button>} /><div className="alert-grid">{state.products.filter(product => product.storeId === store.id).slice(0, 3).map(product => { const risk = getStockoutRisk(product); const confidence = calculateAvailabilityConfidence(product, store); return <div className={`inventory-alert ${risk.toLowerCase()}`} key={product.id}><div className="alert-art" style={{ background: product.accent }}>{product.icon}</div><div className="alert-copy"><span className="mini-label">{risk === "HIGH" ? "Predicted stockout" : "Signal healthy"}</span><h3>{product.shortName}</h3><p>{product.stock} on hand · {product.predictedDemand} predicted demand</p><ConfidenceMeter score={confidence.score} compact /></div><button className="icon-button" onClick={() => dispatch({ type: "UPDATE_STOCK", productId: product.id, stock: product.stock + 6 })} aria-label={`Update ${product.shortName}`}><Plus size={16} /></button></div>; })}</div><div className="inventory-toolbar"><div className="inventory-search"><Search size={15} /><input placeholder="Search inventory" value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} /></div><div className="category-row compact">{["All", "Dairy", "Bakery", "Pantry", "Snacks"].map(category => <button key={category} className={inventoryCategory === category ? "category-pill active" : "category-pill"} onClick={() => setInventoryCategory(category)}>{category}</button>)}</div></div><div className="inventory-table"><div className="inventory-table-head"><span>Product</span><span>On hand</span><span>Demand / day</span><span>Stockout risk</span><span>Confidence</span><span>Quick update</span></div>{products.map(product => { const risk = getStockoutRisk(product); const confidence = calculateAvailabilityConfidence(product, store); return <div className="inventory-row" key={product.id}><div className="inventory-product"><span className="inventory-emoji" style={{ background: product.accent }}>{product.icon}</span><span><b>{product.shortName}</b><small>{product.category} · updated {product.lastUpdatedMinutes === 0 ? "just now" : `${product.lastUpdatedMinutes}m ago`}</small></span></div><strong>{product.stock}</strong><span>{product.predictedDemand}</span><StatusPill tone={risk === "HIGH" ? "bad" : risk === "MEDIUM" ? "warn" : "good"}>{risk}</StatusPill><div className="confidence-cell"><ConfidenceMeter score={confidence.score} compact /></div><div className="qty-control"><button onClick={() => dispatch({ type: "UPDATE_STOCK", productId: product.id, stock: product.stock - 1 })}><Minus size={13} /></button><span>{product.stock}</span><button onClick={() => dispatch({ type: "UPDATE_STOCK", productId: product.id, stock: product.stock + 1 })}><Plus size={13} /></button></div></div>; })}</div></section><section className="split-section store-panels"><div className="section-block compact-block" id="assistant"><SectionTitle eyebrow="Smart Store Assistant / 02" title="Ask the shelf." description="Answers are generated from the current inventory and workload signals." /><div className="assistant-card"><div className="assistant-orb"><Bot size={23} /></div><div className="assistant-answer"><div className="assistant-answer-label"><span>LOCALSYNC INTELLIGENCE</span><span className="live-dot" /></div><p>{assistantAnswer}</p></div></div><div className="assistant-prompts">{["What should I restock today?", "Which products may run out tonight?", "What is selling faster than usual?", "Why is my inventory accuracy low?", "Which products should I promote?", "How many orders can I safely accept right now?"].map(prompt => <button key={prompt} className={assistantPrompt === prompt ? "assistant-prompt active" : "assistant-prompt"} onClick={() => setAssistantPrompt(prompt)}>{prompt}<ArrowUpRight size={13} /></button>)}</div></div><div className="section-block compact-block" id="store-orders"><SectionTitle eyebrow="Store health / 03" title="Capacity with context." description="A store’s reliability is a combination of measurable signals, not a hidden rating." /><div className="reliability-list"><ReliabilityRow label="Inventory accuracy" value={store.inventoryAccuracy} /><ReliabilityRow label="Order acceptance" value={store.orderAcceptance} /><ReliabilityRow label="On-time preparation" value={store.onTimePreparation} /><ReliabilityRow label="Stock freshness" value={store.stockFreshness} /></div><div className="capacity-card"><div><span className="mini-label">Safe to accept</span><strong>12 orders</strong><span>until next rider wave</span></div><div className="capacity-ring"><span>68%</span><small>workload</small></div></div><div className="store-note"><Zap size={15} /><span>Keep eggs fresh to unlock +6 more safe orders during the evening peak.</span></div></div></section></div>
  );
}

function ReliabilityRow({ label, value }: { label: string; value: number }) { return <div className="reliability-row"><span>{label}</span><div className="reliability-track"><span style={{ width: `${value}%` }} /></div><b>{value}%</b></div>; }

function AdminView() {
  const { state } = useLocalSync();
  const [city, setCity] = useState("All cities");
  const [range, setRange] = useState("30D");
  const metrics = getHealthMetrics(state);
  const findings = getBusinessHealthFindings(state);
  const chartData = [{ day: "01", orders: 980, cancellations: 132 }, { day: "05", orders: 1110, cancellations: 118 }, { day: "10", orders: 1240, cancellations: 127 }, { day: "15", orders: 1180, cancellations: 96 }, { day: "20", orders: 1390, cancellations: 112 }, { day: "25", orders: 1470, cancellations: 94 }, { day: "30", orders: 1580, cancellations: 88 }];
  const deliveryData = [{ label: "On time", value: 71, color: "#8fd640" }, { label: "< 15m late", value: 16, color: "#f2b65f" }, { label: "> 15m late", value: 13, color: "#e57b65" }];
  return <div className="page-stack admin-page"><section className="page-heading admin-heading"><div><div className="hero-kicker"><span className="live-dot" /> OPERATIONS ADMIN · NETWORK HEALTH</div><h1>See the problem<br /><em>before the metric.</em></h1><p>Root-cause intelligence for a local commerce network that wants to grow reliably.</p></div><div className="filter-cluster"><button className="filter-select"><MapPin size={14} /> {city}<ChevronDown size={14} /></button><button className="filter-select">{range}<ChevronDown size={14} /></button><button className="filter-select"><SlidersHorizontal size={14} /> Filters</button></div></section><section className="metric-strip admin-metrics"><MetricCard label="Registered users" value="1.20L" delta="+46%" icon={Users} detail="82k → 120k in 6 months" /><MetricCard label="Monthly orders" value={`${(metrics.orders / 1000).toFixed(1)}k`} delta="+23%" icon={ShoppingBag} tone="violet" detail="AOV ₹486" /><MetricCard label="Repeat purchase" value={`${metrics.repeat}%`} delta="−14 pts" icon={RefreshCw} tone="amber" detail="reliability is the lever" /><MetricCard label="Support tickets" value={`${(metrics.support / 1000).toFixed(1)}k`} delta="+90%" icon={CircleHelp} tone="coral" detail="9.2h avg resolution" /></section><section className="section-block" id="business-health"><SectionTitle eyebrow="Business Health Engine / 01" title="The network is telling us where to look." description="Recommendations are generated from the same inventory, order, delivery, and support signals powering the product." action={<span className="prototype-chip"><Database size={13} /> {range} · {city}</span>} /><div className="finding-grid">{findings.map(finding => <div className="finding-card" key={finding.label}><div className="finding-top"><span className="finding-icon" style={{ color: riskColor(finding.risk), background: `${riskColor(finding.risk)}18` }}>{finding.icon === "inventory" ? <Database size={17} /> : finding.icon === "delivery" ? <Truck size={17} /> : <Tags size={17} />}</span><StatusPill tone={finding.risk === "HIGH" ? "bad" : "warn"}>{finding.risk} PRIORITY</StatusPill></div><h3>{finding.label}</h3><p>{finding.value}</p><div className="finding-action"><ArrowRight size={14} /><span>{finding.action}</span></div></div>)}</div><div className="admin-chart-grid"><div className="chart-card"><div className="chart-card-head"><div><span className="mini-label">ORDER RELIABILITY TREND</span><h3>More orders. Fewer surprises.</h3></div><span className="chart-legend"><i className="legend-dot lime" /> orders <i className="legend-dot coral" /> cancellations</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="orderFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8fd640" stopOpacity={0.28} /><stop offset="95%" stopColor="#8fd640" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e7df" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8b9387" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8b9387" }} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e7df", boxShadow: "0 8px 30px #0c201512" }} /><Area type="monotone" dataKey="orders" stroke="#7cae37" strokeWidth={2.5} fill="url(#orderFill)" /><Area type="monotone" dataKey="cancellations" stroke="#df846f" strokeWidth={2} fill="none" /></AreaChart></ResponsiveContainer></div></div><div className="chart-card delivery-chart" id="delivery-ops"><div className="chart-card-head"><div><span className="mini-label">DELIVERY HEALTH</span><h3>Reliability at the door</h3></div><Truck size={17} /></div><div className="delivery-pie"><ResponsiveContainer width="56%" height="100%"><PieChart><Pie data={deliveryData} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none"><Cell fill="#8fd640" /><Cell fill="#f2b65f" /><Cell fill="#e57b65" /></Pie></PieChart></ResponsiveContainer><div className="pie-center"><strong>71%</strong><span>on time</span></div></div><div className="delivery-legend">{deliveryData.map(item => <div key={item.label}><span className="legend-dot" style={{ background: item.color }} />{item.label}<b>{item.value}%</b></div>)}</div></div></div></section><section className="split-section admin-panels"><div className="section-block compact-block" id="retention"><SectionTitle eyebrow="Customer health / 02" title="Reliability compounds." description="The strongest retention cohort is the one that experiences three reliable orders." /><div className="retention-funnel"><FunnelRow label="First order" value="54%" width={100} tone="light" /><FunnelRow label="Second order / 30d" value="31%" width={67} tone="mid" /><FunnelRow label="Third order" value="18%" width={47} tone="dark" /><FunnelRow label="Next-month repeat probability" value="72%" width={78} tone="lime" /></div><div className="segment-row"><span>Segments</span><StatusPill tone="violet">NEW 36%</StatusPill><StatusPill tone="good">REPEAT 27%</StatusPill><StatusPill tone="warn">AT-RISK 21%</StatusPill></div></div><div className="section-block compact-block" id="promotions"><SectionTitle eyebrow="Promotion intelligence / 03" title="Spend where trust sticks." description="A discount is not a retention strategy when 44% of coupons are never redeemed." /><div className="promotion-highlight"><div className="promotion-number">44<span>%</span></div><div><b>unused coupon inventory</b><p>₹9.86L of issued promotion value never becomes a basket.</p></div></div><div className="promotion-table"><div><span>Coupon issued</span><b>24,800</b></div><div><span>Viewed</span><b>17,920</b></div><div><span>Redeemed</span><b>13,888</b></div><div><span>Repeat customers</span><b>3,846</b></div></div><button className="secondary-button full-width" onClick={() => toast.success("Scenario ready", { description: "Reliability-led retention is now the selected growth lever." })}>Model a better spend mix <ArrowRight size={15} /></button></div></section><section className="scenario-section"><div><div className="eyebrow">Impact scenario / 04</div><h2>What if reliability<br /><em>became the acquisition loop?</em></h2><p>Move the levers that matter and see the business effect in plain language.</p></div><div className="scenario-controls"><div className="scenario-control"><span>Inventory freshness</span><b>+18 pts</b><input type="range" min="0" max="30" defaultValue="18" /></div><div className="scenario-control"><span>On-time delivery</span><b>+9 pts</b><input type="range" min="0" max="20" defaultValue="9" /></div><div className="scenario-results"><div><b>−3.8 pts</b><span>cancellation rate</span></div><div><b>+8.4 pts</b><span>repeat purchase</span></div><div><b>₹6.2L</b><span>monthly recovered revenue</span></div></div></div></section></div>;
}

function FunnelRow({ label, value, width, tone }: { label: string; value: string; width: number; tone: string }) { return <div className="funnel-row"><span>{label}</span><div className="funnel-track"><span className={tone} style={{ width: `${width}%` }} /></div><b>{value}</b></div>; }

export default function Home() {
  const [location] = useLocation();
  const { state, dispatch } = useLocalSync();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modal, setModal] = useState<"cart" | "support" | "refund" | "order" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const role: Role = location === "/store" ? "store" : location === "/operations" ? "admin" : state.role;
  const currentMeta = roleMeta[role];
  const activeOrder = state.orders[0];
  const selectedStore = selectedProduct ? getStore(state, selectedProduct.storeId) : null;
  const selectedConfidence = selectedProduct && selectedStore ? calculateAvailabilityConfidence(selectedProduct, selectedStore) : null;
  const cartTotal = state.cart.reduce((sum, item) => sum + (getProduct(state, item.productId)?.price ?? 0) * item.quantity, 0);
  const placeOrder = () => { dispatch({ type: "PLACE_ORDER" }); setModal(null); toast.success("Order placed", { description: "Your reliability check is live." }); };
  return <div className="app-shell"><Sidebar role={role} onRoleChange={nextRole => dispatch({ type: "SET_ROLE", role: nextRole })} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} /><div className="main-column"><TopBar state={state} onSearch={value => dispatch({ type: "SET_SEARCH", search: value })} onNotifications={() => setNotificationsOpen(value => !value)} onCart={() => setModal("cart")} onMenu={() => setMobileNavOpen(true)} />{notificationsOpen && <div className="notification-panel"><div className="notification-panel-head"><b>Network notifications</b><button className="text-button" onClick={() => state.notifications.forEach(notification => dispatch({ type: "MARK_NOTIFICATION_READ", id: notification.id }))}>Mark read</button></div>{state.notifications.slice(0, 5).map(notification => <button className={`notification-row ${notification.read ? "read" : ""}`} key={notification.id} onClick={() => dispatch({ type: "MARK_NOTIFICATION_READ", id: notification.id })}><span className={`notification-icon ${notification.tone}`}><Bell size={14} /></span><span><b>{notification.title}</b><small>{notification.body}</small></span></button>)}</div>}<div className="content-wrap"><div className="context-bar"><div><span className="context-dot" />{currentMeta.label} workspace <span className="context-sep">/</span> {currentMeta.sublabel}</div><span className="context-note"><ShieldCheck size={13} /> Demo data · connected state</span></div>{role === "customer" ? <CustomerView state={state} onOpenProduct={setSelectedProduct} onCheckout={() => setModal("cart")} onSupport={() => setModal("support")} onRefund={orderId => setModal("refund")} onTrack={orderId => setModal("order")} /> : role === "store" ? <StoreView /> : <AdminView />}</div><footer className="app-footer"><span>© 2026 NOVA CART LOCALSYNC</span><span>FROM AVAILABLE TO RELIABLE.</span><span><span className="live-dot" /> system status nominal</span></footer></div>{selectedProduct && selectedStore && selectedConfidence && <Modal title={selectedProduct.name} eyebrow="Product detail / confidence trace" onClose={() => setSelectedProduct(null)}><div className="product-detail"><div className="detail-art" style={{ background: selectedProduct.accent }}>{selectedProduct.icon}</div><div className="detail-meta"><div className="product-category">{selectedProduct.category} · {selectedProduct.unit}</div><div className="detail-price">{money(selectedProduct.price)}</div><div className="product-store"><Store size={13} /> {selectedStore.name} · {selectedStore.zone}</div></div><div className="detail-confidence"><div className="detail-score"><strong>{selectedConfidence.score}</strong><span>%</span></div><div><b>{selectedConfidence.band} confidence</b><small>Inventory updated {selectedProduct.lastUpdatedMinutes === 0 ? "just now" : `${selectedProduct.lastUpdatedMinutes} minutes ago`}</small></div></div><div className="detail-facts"><div><span>Estimated delivery</span><b>{selectedProduct.eta}–{selectedProduct.eta + 5} min</b></div><div><span>Store reliability</span><b>{calculateStoreReliability(selectedStore)}%</b></div><div><span>Stock cover</span><b>{selectedConfidence.stockCover}%</b></div></div><div className="detail-explanation"><Sparkles size={16} /><span>{selectedConfidence.reason}</span></div><div className="detail-alternatives"><div className="mini-label">Possible alternatives</div>{selectedProduct.alternativeIds.map(id => { const alternative = getProduct(state, id); if (!alternative) return null; const store = getStore(state, alternative.storeId); const confidence = calculateAvailabilityConfidence(alternative, store); return <button key={id} onClick={() => setSelectedProduct(alternative)}><span>{store.name}</span><b>{confidence.score}% confidence</b><ArrowRight size={14} /></button>; })}</div><button className="primary-button full-width" onClick={() => { dispatch({ type: "ADD_TO_CART", productId: selectedProduct.id }); setSelectedProduct(null); toast.success("Added to basket"); }}>Add to basket <Plus size={16} /></button></div></Modal>}{modal === "cart" && <Modal title="Your basket" eyebrow={`${state.cart.length} product lines`} onClose={() => setModal(null)}><div className="modal-list">{state.cart.length ? state.cart.map(item => { const product = getProduct(state, item.productId); if (!product) return null; return <div className="modal-list-row" key={item.productId}><span className="modal-thumb" style={{ background: product.accent }}>{product.icon}</span><span><b>{product.shortName}</b><small>{money(product.price)} · {getStore(state, product.storeId).name}</small></span><div className="qty-control"><button onClick={() => dispatch({ type: "SET_CART_QTY", productId: item.productId, quantity: item.quantity - 1 })}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => dispatch({ type: "SET_CART_QTY", productId: item.productId, quantity: item.quantity + 1 })}><Plus size={13} /></button></div></div>; }) : <div className="empty-card small"><ShoppingBag size={22} /><h3>Your basket is waiting.</h3><p>Add a reliable product to begin.</p></div>}</div>{state.cart.length > 0 && <div className="checkout-summary"><div><span>Items</span><b>{money(cartTotal)}</b></div><div><span>Reliability delivery fee</span><b>₹24</b></div><div className="summary-total"><span>Total</span><strong>{money(cartTotal + 24)}</strong></div><button className="primary-button full-width" onClick={placeOrder}>Place reliable order <ArrowRight size={16} /></button></div>}</Modal>}{modal === "support" && <Modal title="How can we help?" eyebrow={`Order context attached · #${activeOrder.id}`} onClose={() => setModal(null)}><div className="support-form"><p className="modal-intro">We already attached your latest order, store, and item history. Choose the issue and we’ll keep the context intact.</p>{["Refund status", "Delayed delivery", "Missing product", "Coupon issue", "Incorrect order", "Other"].map(category => <button key={category} className="support-option" onClick={() => { dispatch({ type: "CREATE_TICKET", category, orderId: activeOrder.id, productName: "Eggs 12 pack" }); setModal(null); toast.success("Support ticket created", { description: "A resolution path is already attached." }); }}><span>{category}</span><ArrowRight size={15} /></button>)}</div></Modal>}{modal === "refund" && <Modal title="Request a refund" eyebrow={`Refund workflow · #${activeOrder.id}`} onClose={() => setModal(null)}><div className="refund-flow"><div className="refund-order"><span className="modal-thumb" style={{ background: "#ffcf93" }}>🥚</span><span><b>Missing product · Eggs 12 pack</b><small>Order #{activeOrder.id} · expected ₹124 refund</small></span></div><div className="refund-steps"><div className="active"><span>1</span><b>Request</b></div><div><span>2</span><b>Validate</b></div><div><span>3</span><b>Process</b></div><div><span>4</span><b>Completed</b></div></div><p className="modal-intro">We’ll validate the order record and send status updates through Support and Notifications.</p><button className="primary-button full-width" onClick={() => { dispatch({ type: "REQUEST_REFUND", orderId: activeOrder.id, amount: 124, reason: "Missing product" }); setModal(null); toast.success("Refund requested", { description: "₹124 is being validated." }); }}>Submit refund request <ArrowRight size={16} /></button></div></Modal>}{modal === "order" && <Modal title={`Order #${activeOrder.id}`} eyebrow="Live reliability tracker" onClose={() => setModal(null)}><div className="tracking-modal"><div className="tracking-hero"><div className="tracking-icon"><Truck size={22} /></div><div><span className="mini-label">CURRENT STATUS</span><h3>{activeOrder.status.replaceAll("_", " ")}</h3><p>{state.deliveries.find(delivery => delivery.orderId === activeOrder.id)?.route}</p></div><div className="tracking-eta"><strong>{activeOrder.eta}</strong><span>min</span></div></div><div className="tracking-timeline">{["ORDER_PLACED", "STORE_CONFIRMING", "ITEMS_BEING_PICKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "ARRIVING_SOON", "DELIVERED"].map((status, index) => { const activeIndex = ["ORDER_PLACED", "STORE_CONFIRMING", "ITEMS_BEING_PICKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "ARRIVING_SOON", "DELIVERED"].indexOf(activeOrder.status); return <div className={index <= activeIndex ? "timeline-step complete" : "timeline-step"} key={status}><span>{index <= activeIndex ? <Check size={12} /> : index + 1}</span><b>{status.replaceAll("_", " ")}</b></div>; })}</div><button className="primary-button full-width" onClick={() => { dispatch({ type: "ADVANCE_ORDER", orderId: activeOrder.id }); toast.success("Delivery signal advanced"); }}>{activeOrder.status === "DELIVERED" ? "Delivered" : "Simulate next handoff"} <ArrowRight size={16} /></button></div></Modal>}</div>;
}
