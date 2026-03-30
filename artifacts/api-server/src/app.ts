import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import webhookRouter from "./routes/webhook";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// SEC3 FIX: Restrict CORS to the known storefront origin.
// Set ALLOWED_ORIGIN env var in production (e.g. "https://cliqbait.com").
// Falls back to permissive mode only if the var is explicitly left unset (dev convenience).
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
  cors({
    origin: allowedOrigin || "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// SEC5 FIX: Rate limiting.
// General limit: 120 req / min per IP across all API routes.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});

// Tighter limit on checkout: 10 sessions / min per IP.
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout requests, please try again later" },
});

app.use("/api", generalLimiter);
app.use("/api/checkout", checkoutLimiter);

app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
