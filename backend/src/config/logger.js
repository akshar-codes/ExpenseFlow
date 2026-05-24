import pino from "pino";

// ─── Transport ────────────────────────────────────────────────────────────────

const usePretty =
  process.env.LOG_PRETTY === "true" ||
  (process.env.LOG_PRETTY !== "false" && process.env.NODE_ENV !== "production");

const transport = usePretty
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    }
  : undefined;

// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = pino(
  {
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === "production" ? "info" : "debug"),

    timestamp: pino.stdTimeFunctions.isoTime,

    base: { pid: process.pid },

    // ── Redaction ─────────────────────────────────────────────────────────────

    redact: {
      paths: [
        "req.headers.authorization", // Bearer <accessToken>
        "req.headers.cookie", // refreshToken cookie

        "*.password",
        "*.currentPassword",
        "*.newPassword",
        "*.refreshToken",
        "*.accessToken",
      ],
      censor: "[REDACTED]",
    },
  },
  transport,
);

export default logger;
