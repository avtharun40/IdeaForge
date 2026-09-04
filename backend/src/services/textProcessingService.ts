/**
 * Clean and normalize raw extracted text from a PDF.
 * Removes null characters, page numbers, normalizes whitespace and line breaks.
 */
export const cleanExtractedText = (text: string): string => {
  if (!text) return '';

  let cleaned = text
    .replace(/\0/g, '')           // Remove null characters
    .replace(/\r\n/g, '\n')       // Standardize line endings
    .replace(/\r/g, '\n');

  // Remove common repeated page number and running footer/header patterns
  // Pattern 1: Page X or Page X of Y
  cleaned = cleaned.replace(/\n\s*Page\s+\d+(?:\s+of\s+\d+)?\s*\n/gi, '\n');
  // Pattern 2: Centered hyphens around page number: - X - or [ X ]
  cleaned = cleaned.replace(/\n\s*-\s*\d+\s*-\s*\n/g, '\n');
  cleaned = cleaned.replace(/\n\s*\[\s*\d+\s*\]\s*\n/g, '\n');
  // Pattern 3: Lone digits representing page numbers at boundary boundaries
  cleaned = cleaned.replace(/\n\s*\d+\s*\n/g, '\n');

  // Collapse multiple horizontal spaces and tabs into a single space
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Standardize excessive newlines: collapse 3+ consecutive newlines to 2 newlines (preserves paragraph splits)
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return cleaned.trim();
};
