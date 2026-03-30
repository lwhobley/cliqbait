import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

router.post("/checkout/session", async (req, res): Promise<void> => {
  try {
    const { items, successUrl, cancelUrl } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Cart items are required" });
      return;
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      req.log.warn("Stripe not configured, returning mock checkout URL");
      res.json({
        url: `${successUrl}?session_id=mock_session_${Date.now()}`,
        sessionId: `mock_session_${Date.now()}`,
      });
      return;
    }

    // SEC1 FIX: Resolve prices server-side from the database.
    // Prices from the client request body are never trusted.
    type ResolvedItem = {
      productId: number;
      variantId: number;
      name: string;
      size: string | null;
      color: string | null;
      price: string;
      quantity: number;
      imageUrl: string;
    };

    const resolvedItems: ResolvedItem[] = [];

    for (const item of items as Array<{ productId: number; variantId: number; quantity: number; imageUrl?: string }>) {
      if (!item.productId || !item.variantId || !item.quantity || item.quantity < 1) {
        res.status(400).json({ error: "Invalid cart item: missing or invalid fields" });
        return;
      }

      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, item.productId));

      if (!product) {
        res.status(400).json({ error: `Product not found: ${item.productId}` });
        return;
      }

      const variants = product.variants ?? [];
      const variant = variants.find((v) => v.id === item.variantId);

      if (!variant) {
        res.status(400).json({ error: `Variant not found: ${item.variantId}` });
        return;
      }

      resolvedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        size: variant.size,
        color: variant.color,
        price: variant.price,          // authoritative price from DB
        quantity: item.quantity,
        imageUrl: item.imageUrl || product.imageUrl,
      });
    }

    const stripe = getStripe();

    const lineItems = resolvedItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
          metadata: {
            size: item.size || "",
            color: item.color || "",
          },
        },
        unit_amount: Math.round(parseFloat(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    const metadata: Record<string, string> = {
      items: JSON.stringify(
        resolvedItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          size: item.size || null,
          color: item.color || null,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        }))
      ),
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR"],
      },
      appearance: undefined,
    });

    res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    logger.error({ err }, "Checkout session creation failed");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
