export interface IPaperSections {
  abstract: string | null;
  introduction: string | null;
  relatedWork: string | null;
  methodology: string | null;
  results: string | null;
  discussion: string | null;
  conclusion: string | null;
  limitations: string | null;
  futureWork: string | null;
  references: string | null;
}

interface DetectedHeader {
  key: keyof IPaperSections;
  index: number;
  length: number;
}

const headingsConfig: { key: keyof IPaperSections; patterns: RegExp[] }[] = [
  {
    key: 'abstract',
    patterns: [
      /(?:^|\n)\s*Abstract\s*(?:\n|\.|—|:|$)/i,
      /(?:^|\n)\s*Abstract\s+and\s+Executive\s+Summary\s*(?:\n|\.|—|:|$)/i
    ]
  },
  {
    key: 'introduction',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Introduction\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Intro\s*(?:\n|$)/i
    ]
  },
  {
    key: 'relatedWork',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Related\s+Work\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Literature\s+Review\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Background\s*(?:\n|$)/i
    ]
  },
  {
    key: 'methodology',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Methodology\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Methods\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Materials\s+and\s+Methods\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Proposed\s+(?:Method|Model|Approach|System)\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?System\s+Model\s*(?:\n|$)/i
    ]
  },
  {
    key: 'results',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Results\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Evaluation\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Experiments\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Experimental\s+(?:Results|Evaluation|Setup)\s*(?:\n|$)/i
    ]
  },
  {
    key: 'discussion',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Discussion\s*(?:\n|$)/i
    ]
  },
  {
    key: 'conclusion',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Conclusion\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Conclusions\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Conclusions\s+and\s+Future\s+Work\s*(?:\n|$)/i
    ]
  },
  {
    key: 'limitations',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Limitations\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Discussion\s+of\s+Limitations\s*(?:\n|$)/i
    ]
  },
  {
    key: 'futureWork',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?Future\s+Work\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Future\s+Research\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Open\s+Problems\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Challenges\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Research\s+Directions\s*(?:\n|$)/i
    ]
  },
  {
    key: 'references',
    patterns: [
      /(?:^|\n)\s*(?:\d+\.?\s+)?References\s*(?:\n|$)/i,
      /(?:^|\n)\s*(?:\d+\.?\s+)?Bibliography\s*(?:\n|$)/i
    ]
  }
];

/**
 * Detect common academic sections in the cleaned text.
 * Returns section content or null if a section isn't found.
 */
export const detectSections = (text: string): IPaperSections => {
  const detectedHeaders: DetectedHeader[] = [];

  headingsConfig.forEach((headingInfo) => {
    for (const pattern of headingInfo.patterns) {
      const match = pattern.exec(text);
      if (match) {
        detectedHeaders.push({
          key: headingInfo.key,
          index: match.index,
          length: match[0].length
        });
        break; // Stop looking for other patterns once key is found
      }
    }
  });

  // Sort detected headings in the order of their appearance
  detectedHeaders.sort((a, b) => a.index - b.index);

  // Initialize all sections as null
  const sections: IPaperSections = {
    abstract: null,
    introduction: null,
    relatedWork: null,
    methodology: null,
    results: null,
    discussion: null,
    conclusion: null,
    limitations: null,
    futureWork: null,
    references: null
  };

  // Slice text content between detected headers
  detectedHeaders.forEach((header, idx) => {
    const startPos = header.index + header.length;
    const endPos = idx + 1 < detectedHeaders.length ? detectedHeaders[idx + 1].index : text.length;
    
    const sectionContent = text.substring(startPos, endPos).trim();
    sections[header.key] = sectionContent || null;
  });

  // Fallback: If no abstract heading was matched, but Introduction was found,
  // the text prior to Introduction often contains the abstract.
  if (!sections.abstract && sections.introduction) {
    const introIndex = detectedHeaders.find(h => h.key === 'introduction')?.index || text.length;
    const preText = text.substring(0, introIndex).trim();
    // Look for paragraph patterns inside the preText that might be the abstract
    const abstractMatch = /Abstract\s*[:\-\n]?\s*/i.exec(preText);
    if (abstractMatch) {
      sections.abstract = preText.substring(abstractMatch.index + abstractMatch[0].length).trim() || null;
    }
  }

  return sections;
};
