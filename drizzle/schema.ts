import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the starter Manus OAuth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  zone: varchar("zone", { length: 100 }).notNull(),
  inventoryAccuracy: int("inventoryAccuracy").notNull().default(0),
  orderAcceptance: int("orderAcceptance").notNull().default(0),
  onTimePreparation: int("onTimePreparation").notNull().default(0),
  stockFreshness: int("stockFreshness").notNull().default(0),
  workload: int("workload").notNull().default(0),
  deliveryCapacity: int("deliveryCapacity").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().references(() => stores.id),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  priceCents: int("priceCents").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  stock: int("stock").notNull().default(0),
  predictedDemand: int("predictedDemand").notNull().default(0),
  accuracy: int("accuracy").notNull().default(0),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  updatedBy: int("updatedBy").references(() => users.id),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => users.id),
  status: varchar("status", { length: 40 }).notNull(),
  totalCents: int("totalCents").notNull(),
  fulfillmentConfidence: int("fulfillmentConfidence").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  productId: int("productId").notNull().references(() => products.id),
  quantity: int("quantity").notNull().default(1),
  priceCents: int("priceCents").notNull(),
});

export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  status: varchar("status", { length: 40 }).notNull(),
  etaMinutes: int("etaMinutes").notNull(),
  partnerName: varchar("partnerName", { length: 120 }),
  delayMinutes: int("delayMinutes").notNull().default(0),
  route: text("route"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supportTickets = mysqlTable("supportTickets", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => users.id),
  orderId: int("orderId").references(() => orders.id),
  category: varchar("category", { length: 80 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("OPEN"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const refunds = mysqlTable("refunds", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  amountCents: int("amountCents").notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("REQUESTED"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
