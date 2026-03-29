import { Router, type IRouter } from "express";
import Stripe from "stripe";
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

  const stripe = getStripe();

  const lineItems = items.map((item: {
    name: string;
    price: string;
    quantity: number;
    imageUrl: string;
    size?: string;
    color?: string;
  }) => ({
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
      items.map((item: { productId: number; variantId: number; name: string; size?: string; color?: string; price: string; quantity: number; imageUrl: string }) => ({
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
});

export default router;
