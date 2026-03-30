import { Router, type IRouter, type Request } from "express";
import Stripe from "stripe";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { submitOrderToPrintful } from "../lib/printfulService";

const router: IRouter = Router();

router.post("/webhook", async (req: Request, res): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    res.json({ received: true });
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

  let event: Stripe.Event;

  if (webhookSecret) {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).json({ error: "No stripe signature" });
      return;
    }

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        webhookSecret
      );
    } catch (err) {
      logger.error({ err }, "Webhook signature verification failed");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }
  } else {
    // SEC2 FIX: Never process unverified webhook events.
    // Without a webhook secret, any caller could forge a checkout.session.completed
    // event and trigger free order fulfillment via Printful.
    logger.error("STRIPE_WEBHOOK_SECRET is not configured; refusing to process unverified webhook");
    res.status(400).json({ error: "Webhook secret not configured" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const lineItemsRaw = session.metadata?.items;
      const lineItems = lineItemsRaw ? JSON.parse(lineItemsRaw) : [];

      const [existing] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.stripeSessionId, session.id));

      if (!existing) {
        await db.insert(ordersTable).values({
          stripeSessionId: session.id,
          customerEmail: session.customer_details?.email || null,
          status: "processing",
          lineItems,
        });
      } else {
        await db
          .update(ordersTable)
          .set({ status: "processing" })
          .where(eq(ordersTable.stripeSessionId, session.id));
      }

      const shippingAddress = session.shipping_details?.address;
      const customerName = session.shipping_details?.name || session.customer_details?.name || "";

      if (shippingAddress && lineItems.length > 0) {
        const printfulItems = lineItems.map((item: { variantId: number; quantity: number }) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        }));

        const printfulOrderId = await submitOrderToPrintful(printfulItems, {
          name: customerName,
          email: session.customer_details?.email || "",
          address1: shippingAddress.line1 || "",
          city: shippingAddress.city || "",
          state_code: shippingAddress.state || "",
          country_code: shippingAddress.country || "US",
          zip: shippingAddress.postal_code || "",
        });

        await db
          .update(ordersTable)
          .set({
            printfulOrderId,
            status: "fulfilled",
          })
          .where(eq(ordersTable.stripeSessionId, session.id));
      }

      logger.info({ sessionId: session.id }, "Order processed successfully");
    } catch (err) {
      logger.error({ err, sessionId: session.id }, "Failed to process order");
    }
  }

  res.json({ received: true });
});

export default router;
