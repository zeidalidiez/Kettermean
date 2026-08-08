const BLOCKED_CONTENT = [
  /\b(?:nsfw|porn(?:ography|ographic)?|sexual|erotic|obscene)\b/i,
  /\b(?:nude|nudity|naked|genitals?|fetish|incest|rape)\b/i,
  /\b(?:child\s*(?:porn|sexual|abuse)|underage\s+(?:sex|sexual|nude)|loli|shota)\b/i,
  /\bexplicit\s+(?:adult|sexual|sex)\b/i,
];

export function containsBlockedContent(input: string): boolean {
  return BLOCKED_CONTENT.some((pattern) => pattern.test(input));
}

export function sanitizeDisplayText(
  input: string,
  fallback: string,
  maxLength = 160,
): string {
  const normalized = input.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized || containsBlockedContent(normalized)) return fallback;
  return normalized.slice(0, maxLength);
}
