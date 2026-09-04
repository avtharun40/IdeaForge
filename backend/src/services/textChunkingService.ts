export interface TextChunk {
  chunkIndex: number;
  text: string;
  startPosition: number;
  endPosition: number;
}

/**
 * Split text into deterministic overlapping chunks of words.
 * Defaults: Size = 1200 words, Overlap = 150 words.
 */
export const chunkText = (text: string, chunkSize = 1200, overlap = 150): TextChunk[] => {
  const chunks: TextChunk[] = [];
  if (!text) return chunks;

  // Identify words and their character boundary positions using regex
  const wordRegex = /\S+/g;
  const words: { word: string; start: number; end: number }[] = [];
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    words.push({
      word: match[0],
      start: match.index,
      end: wordRegex.lastIndex
    });
  }

  if (words.length === 0) return chunks;

  let chunkIndex = 0;
  let i = 0;

  while (i < words.length) {
    const startWordIdx = i;
    const endWordIdx = Math.min(i + chunkSize, words.length);
    
    const chunkWords = words.slice(startWordIdx, endWordIdx);
    if (chunkWords.length === 0) break;

    const startPosition = chunkWords[0].start;
    const endPosition = chunkWords[chunkWords.length - 1].end;
    const chunkTextStr = text.substring(startPosition, endPosition);

    chunks.push({
      chunkIndex,
      text: chunkTextStr,
      startPosition,
      endPosition
    });

    chunkIndex++;

    // Slide window forward by (chunkSize - overlap)
    const step = chunkSize - overlap;
    const nextIndex = i + step;

    // Safety check to avoid infinite loops if parameters are configured incorrectly
    if (nextIndex <= i) {
      i += chunkSize;
    } else {
      i = nextIndex;
    }

    // Terminate loop if the previous iteration already processed the end of the text
    if (endWordIdx === words.length) {
      break;
    }
  }

  return chunks;
};
