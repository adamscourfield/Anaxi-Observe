type LogMeta = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", message: string, meta: LogMeta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // Structured logging baseline (JSON lines)
  console[level](JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: LogMeta) => emit("info", message, meta),
  warn: (message: string, meta?: LogMeta) => emit("warn", message, meta),
  error: (message: string, meta?: LogMeta) => emit("error", message, meta),
};
