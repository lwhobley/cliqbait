import { Router, type IRouter } from "express";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
} from "../lib/printfulService";

const router: IRouter = Router();

router.get("/products", async (_req, res): Promise<void> => {
  const products = await getAllProducts();
  res.json(products);
});

router.get("/products/category/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const products = await getProductsByCategory(slug);
  res.json(products);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const product = await getProductById(id);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(product);
});

export default router;
