type LogFields = Record<string, string | number | boolean | null | undefined>;

const SECRET_KEYS = /token|secret|password|authorization|cookie|code/i;

function sanitize(fields?: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    if (SECRET_KEYS.test(key)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function write(
  level: "info" | "warn" | "error",
  message: string,
  fields?: LogFields,
): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...sanitize(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) =>
    write("error", message, fields),
};
