import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const corsOriginEnv = process.env.CORS_ORIGIN?.trim() ?? "";
const configuredOrigins = corsOriginEnv
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (configuredOrigins.includes(origin)) return true;

  // Railway fallback: allow animestream -> api-server cross-origin calls
  if (origin.endsWith(".up.railway.app") && origin.includes("animestream")) {
    return true;
  }

  return false;
}

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
app.use(cors({
  origin(origin, cb) {
    // Allow non-browser and same-origin server-to-server calls
    if (!origin) {
      cb(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      cb(null, origin);
      return;
    }

    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
