const PRIVATE_FIELD = /(?:lat|lng|coord|origin|destination|user|email|cookie|token|secret|key|password)/i;

/**
 * @param {string} event
 * @param {Record<string, string | number | boolean | null | undefined>} fields
 */
export function recordOperationalEvent(event, fields) {
  const safeFields = Object.fromEntries(Object.entries(fields)
    .filter(([name, value]) => !PRIVATE_FIELD.test(name) && ["string", "number", "boolean"].includes(typeof value))
    .map(([name, value]) => [name, typeof value === "string" ? value.slice(0, 80) : value]));
  console.info("[wave-operation]", JSON.stringify({ event: event.slice(0, 60), ...safeFields }));
}
