import DOMPurify from "dompurify";

/**
 * Sanitize user input to prevent XSS attacks.
 * Strips all HTML tags by default.
 */
export function sanitizeText(input: string): string {
  if (!input) return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitize HTML content, allowing safe tags only.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "a", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/**
 * Sanitize an object's string values recursively.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return result;
}
