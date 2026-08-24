import { redact } from "./http.js";

function write(level, event, context = {}) {
  const payload = { timestamp: new Date().toISOString(), level, service: "proofpay-api", event, ...redact(context) };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event, context) => write("info", event, context),
  warn: (event, context) => write("warn", event, context),
  error: (event, context) => write("error", event, context),
};
