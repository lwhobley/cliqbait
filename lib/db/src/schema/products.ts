import { pgTable, text, serial, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  printfulId: integer("printful_id").unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url").notNull().default(""),
  thumbnailUrl: text("thumbnail_url"),
  additionalImages: jsonb("additional_images").$type<string[]>().default([]),
  description: text("description"),
  variants: jsonb("variants").$type<ProductVariantData[]>().default([]),
  cachedAt: timestamp("cached_at", { withTimezone: true }).defaultNow(),
});

export type ProductVariantData = {
  id: number;
  name: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  price: string;
  inStock: boolean;
};

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
