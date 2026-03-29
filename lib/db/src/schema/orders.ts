import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type OrderLineItem = {
  productId: number;
  variantId: number;
  name: string;
  size: string | null;
  color: string | null;
  price: string;
  quantity: number;
  imageUrl: string;
};

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  printfulOrderId: text("printful_order_id"),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default("pending"),
  lineItems: jsonb("line_items").$type<OrderLineItem[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
