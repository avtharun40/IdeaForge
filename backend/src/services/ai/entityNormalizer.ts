import crypto from 'crypto';

const ABBREVIATIONS: Record<string, string> = {
  'cnn': 'convolutional neural network',
  'svm': 'support vector machine',
  'fl': 'federated learning',
  'nlp': 'natural language processing',
  'gans': 'generative adversarial network',
  'gan': 'generative adversarial network',
  'llm': 'large language model',
  'llms': 'large language model',
  'rnn': 'recurrent neural network',
  'lstm': 'long short-term memory',
  'dpr': 'dense passage retriever',
  'rag': 'retrieval augmented generator',
  'fid': 'fusion in decoder',
  'realm': 'retrieval augmented language model',
  'dense passage retrieval': 'dense passage retriever',
  'dense passage retriever': 'dense passage retriever',
  'retrieval augmented generation': 'retrieval augmented generator',
  'retrieval augmented generator': 'retrieval augmented generator',
  'fusion in decoder': 'fusion in decoder',
  'fusion in decoders': 'fusion in decoder'
};

/**
 * Standardizes a concept name by lowercasing, collapsing spaces, suffix equivalence, and resolving common abbreviations.
 */
export const normalizeEntityName = (name: string): string => {
  if (!name) return '';
  
  // Collapse whitespace and lowercase
  let normalized = name.trim().toLowerCase().replace(/[\s\-_]+/g, ' ');

  // Check direct abbreviation lookup first
  if (ABBREVIATIONS[normalized]) {
    return ABBREVIATIONS[normalized];
  }

  // Extract parenthetical abbreviation if present: "Dense Passage Retriever (DPR)"
  const parenMatch = /\(([^)]+)\)/.exec(normalized);
  if (parenMatch && parenMatch[1]) {
    const inside = parenMatch[1].trim();
    if (ABBREVIATIONS[inside]) {
      // If parenthetical abbreviation is known, resolve directly
      return ABBREVIATIONS[inside];
    }
  }

  // Remove parenthetical terms: "Dense Passage Retriever (DPR)" -> "Dense Passage Retriever"
  normalized = normalized.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  // Strip standalone leading/trailing punctuation like quotes or stray brackets
  normalized = normalized.replace(/^['"\[\(]+|['"\]\)]+$/g, '').trim();

  // Word-boundary-aware suffix equivalence normalization
  normalized = normalized
    .replace(/\bretrieval\b/g, 'retriever')
    .replace(/\bgeneration\b/g, 'generator')
    .replace(/\bclassification\b/g, 'classifier')
    .replace(/\bdetection\b/g, 'detector')
    .replace(/\bsegmentation\b/g, 'segmenter')
    .replace(/\boptimization\b/g, 'optimizer')
    .replace(/\bencoding\b/g, 'encoder')
    .replace(/\bdecoding\b/g, 'decoder');

  // Singularize trailing 's' if not a special word
  if (normalized.endsWith('s') && !['keras', 'postgres', 'gans', 'llms', 'process', 'analysis', 'gaps', 'pass'].includes(normalized)) {
    normalized = normalized.slice(0, -1);
  }

  // Re-check abbreviation lookup after cleaning
  if (ABBREVIATIONS[normalized]) {
    return ABBREVIATIONS[normalized];
  }

  return normalized.trim();
};

/**
 * Generates a deterministic 24-character hexadecimal unique identifier for an Entity.
 * Formatted as: SHA-256(normalized_name:normalized_type) truncated.
 */
export const generateEntityId = (name: string, type: string): string => {
  const normName = normalizeEntityName(name);
  const normType = type.trim().toUpperCase();
  const rawKey = `${normName}:${normType}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 24);
};

/**
 * Generates a deterministic 24-character hexadecimal unique identifier for a Paper Claim.
 */
export const generateClaimId = (paperId: string, text: string): string => {
  const rawKey = `${paperId}:claim:${text.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 24);
};

/**
 * Generates a deterministic 24-character hexadecimal unique identifier for a Limitation.
 */
export const generateLimitationId = (paperId: string, text: string): string => {
  const rawKey = `${paperId}:limitation:${text.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 24);
};

/**
 * Generates a deterministic 24-character hexadecimal unique identifier for Future Work.
 */
export const generateFutureWorkId = (paperId: string, text: string): string => {
  const rawKey = `${paperId}:futurework:${text.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 24);
};

/**
 * Heuristically identifies the matching chunk index for text provenance mapping.
 */
export const findSourceChunkId = (text: string | null, chunks: any[]): string | null => {
  if (!text || !chunks || chunks.length === 0) return null;
  const lowerText = text.toLowerCase().trim();

  // 1. Check exact match or contains
  for (const chunk of chunks) {
    if (chunk.text.toLowerCase().includes(lowerText) || lowerText.includes(chunk.text.toLowerCase())) {
      return String(chunk.chunkIndex);
    }
  }

  // 2. Fallback fuzzy: Find chunk with highest word overlap
  const wordsText = new Set(lowerText.split(/\s+/));
  let bestChunkIndex: string | null = null;
  let maxOverlap = 0;

  chunks.forEach(chunk => {
    const chunkWords = chunk.text.toLowerCase().split(/\s+/);
    let overlap = 0;
    chunkWords.forEach((w: string) => {
      if (wordsText.has(w)) overlap++;
    });

    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestChunkIndex = String(chunk.chunkIndex);
    }
  });

  // Only return if at least 3 words overlap (or all words if short)
  if (maxOverlap >= Math.min(3, wordsText.size)) {
    return bestChunkIndex;
    }
  
  return null;
};
