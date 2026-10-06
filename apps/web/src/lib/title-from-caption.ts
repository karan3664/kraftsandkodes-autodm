/** First line, code-point truncated so we never split an emoji (hydration-safe). */
export function titleFromCaption(
  caption: string | null,
  maxChars = 48,
  fallback = "Untitled",
) {
  const line = (caption ?? fallback).split("\n")[0]?.trim() || fallback;
  const chars = Array.from(line);
  return chars.length > maxChars
    ? `${chars.slice(0, maxChars).join("")}…`
    : line;
}
