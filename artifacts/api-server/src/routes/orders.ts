import { Router, type IRouter } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/orders/:sessionId", async (req, res): Promise<void> => {
  try {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.stripeSessionId, sessionId));

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({
      ...order,
      createdAt: order.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
