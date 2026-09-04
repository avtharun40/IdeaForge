import fs from 'fs';
import Paper from '../models/Paper.js';
import { extractTextFromPdf } from './pdfExtractionService.js';
import { cleanExtractedText } from './textProcessingService.js';
import { detectSections } from './sectionDetectionService.js';
import { chunkText } from './textChunkingService.js';
import { extractResearchMetadata } from './metadataExtractionService.js';
import { analyzePaper } from './aiPaperAnalysisService.js';

export const activeProcessingJobs = new Set<string>();

export const cancelAllProcessingJobs = () => {
  activeProcessingJobs.clear();
};

/**
 * Main orchestration service for processing uploaded PDF papers.
 * Performs PDF parsing, text cleaning, section mapping, text chunking, and metadata parsing.
 */
export const processPaper = async (paperId: string): Promise<void> => {
  if (activeProcessingJobs.has(paperId)) {
    console.log(`[ProcessingWorker] Job for paper ${paperId} is already active. Skipping duplicate.`);
    return;
  }

  activeProcessingJobs.add(paperId);

  try {
    // 1. Retrieve paper document from MongoDB
    const paper = await Paper.findById(paperId);
    if (!paper) {
      console.log(`[ProcessingWorker] Paper record not found (or deleted) for ID ${paperId}. Aborting.`);
      return;
    }

    // Set status to extracting with explicit progress
    paper.status = 'processing';
    paper.processingStage = 'extracting';
    paper.processingProgress = 20;
    paper.processingMessage = 'Extracting PDF content and document structure...';
    paper.processingError = null;
    await paper.save();

    console.log(`Starting background processing pipeline for paper: "${paper.title}" (${paperId})`);

    // 2. Verify physical PDF file exists on the filesystem
    if (!fs.existsSync(paper.filePath)) {
      throw new Error(`Physical PDF file not found on disk at "${paper.filePath}"`);
    }

    // 3. Step A: PDF text extraction (including embedded metadata)
    const { text: rawText, pageCount, info } = await extractTextFromPdf(paper.filePath);

    // 4. Step B: Clean extracted text
    const cleanedText = cleanExtractedText(rawText);

    // 5. Calculate string statistics
    const characterCount = cleanedText.length;
    const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;

    // 6. Step C: Section Detection
    const sections = detectSections(cleanedText);

    // 7. Step D: Text Chunking (sliding window: ~1200 words, ~150 words overlap)
    const chunks = chunkText(cleanedText, 1200, 150);

    // 8. Step E: Research Metadata extraction as fallback before Gemini AI analysis
    const metadata = extractResearchMetadata(cleanedText, sections);

    // 9. Extract and validate Publication Year
    const currentYear = new Date().getFullYear();
    const userSuppliedYear = paper.year && paper.year >= 1900 && paper.year <= currentYear + 1 ? paper.year : undefined;

    let detectedYear: number | undefined = undefined;

    // Heuristic A: First-page text inspection (~first 3000 characters) for venue, arXiv, and copyright patterns
    const frontText = cleanedText.substring(0, 3000);

    // Check Venue + Year patterns (e.g. NeurIPS 2020, ICLR 2021, ACL 2019, etc.)
    const venueMatch = /\b(?:NeurIPS|NIPS|ICLR|ICML|ACL|EMNLP|NAACL|EACL|AAAI|IJCAI|CVPR|ICCV|ECCV|KDD|SIGIR|WWW|WSDM|COLING|Interspeech|CoNLL|TACL|PLoS|Nature|Science)\s*['’]?\s*(19\d\d|20\d\d)\b/i.exec(frontText);
    if (venueMatch && venueMatch[1]) {
      const y = parseInt(venueMatch[1], 10);
      if (y >= 1900 && y <= currentYear + 1) detectedYear = y;
    }

    // Check arXiv identifier patterns (e.g. arXiv:2005.11401 -> 2020)
    if (!detectedYear) {
      const arxivMatch = /arXiv:\s*(\d{2})(\d{2})\.\d+/i.exec(frontText);
      if (arxivMatch && arxivMatch[1]) {
        const yy = parseInt(arxivMatch[1], 10);
        const y = yy >= 90 ? 1900 + yy : 2000 + yy;
        if (y >= 1900 && y <= currentYear + 1) detectedYear = y;
      }
    }

    // Check copyright/published patterns (e.g. © 2020, Copyright 2020, 2020 Association for Computational Linguistics)
    if (!detectedYear) {
      const copyMatch = /(?:©|Copyright|Published)\s+(?:by\s+)?(?:in\s+)?(19\d\d|20\d\d)\b/i.exec(frontText) ||
                         /(19\d\d|20\d\d)\s+Association for Computational Linguistics/i.exec(frontText);
      if (copyMatch && copyMatch[1]) {
        const y = parseInt(copyMatch[1], 10);
        if (y >= 1900 && y <= currentYear + 1) detectedYear = y;
      }
    }

    // Check Month + Year patterns (e.g. May 2020)
    if (!detectedYear) {
      const monthMatch = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d\d|20\d\d)\b/i.exec(frontText);
      if (monthMatch && monthMatch[1]) {
        const y = parseInt(monthMatch[1], 10);
        if (y >= 1900 && y <= currentYear + 1) detectedYear = y;
      }
    }

    // Heuristic B: Embedded PDF CreationDate / ModDate (format: D:YYYYMMDD...)
    if (!detectedYear && info) {
      const pdfDateStr = String(info.CreationDate || info.ModDate || '');
      const pdfDateMatch = /D:(\d{4})/.exec(pdfDateStr);
      if (pdfDateMatch && pdfDateMatch[1]) {
        const y = parseInt(pdfDateMatch[1], 10);
        if (y >= 1900 && y <= currentYear + 1) detectedYear = y;
      }
    }

    // Assign final year based on priority: Textual/Venue Extraction > PDF Date > User-supplied > undefined (do NOT default to current year)
    if (detectedYear) {
      paper.year = detectedYear;
    } else if (userSuppliedYear) {
      paper.year = userSuppliedYear;
    } else {
      paper.year = undefined;
    }

    // 10. Title and Authors extraction
    const isGenericTitle = !paper.title || 
                           paper.title.toLowerCase().endsWith('.pdf') || 
                           paper.title.toLowerCase() === 'ui test paper' || 
                           paper.title.toLowerCase() === 'test paper title' || 
                           paper.title.toLowerCase() === 'sample' ||
                           paper.title.toLowerCase() === 'untitled';

    const isInvalidAuthor = !paper.authors || 
                            paper.authors.length === 0 || 
                            paper.authors.some(a => {
                              const n = (a.name || '').trim();
                              return n === 'Unknown Author' || 
                                     n === 'UI Author' || 
                                     n.length > 50 || 
                                     n.includes('[') || 
                                     n.includes(']') || 
                                     n.includes('(') ||
                                     /\b(information|shown|task|tasks|models?|data|from|with|can|that|answers?|answering|is|are|large|scale|using|based|for|open|domain|question|nlp|intensive|retrieval|generation)\b/i.test(n);
                            });

    // A. Embedded PDF info metadata check
    if (isGenericTitle && info?.Title && typeof info.Title === 'string') {
      const cleanInfoTitle = info.Title.trim();
      if (
        cleanInfoTitle.length > 5 && 
        cleanInfoTitle.length < 200 && 
        !cleanInfoTitle.toLowerCase().endsWith('.pdf') && 
        !cleanInfoTitle.includes(':\\') && 
        !cleanInfoTitle.toLowerCase().startsWith('microsoft word')
      ) {
        paper.title = cleanInfoTitle;
      }
    }

    if (isInvalidAuthor && info?.Author && typeof info.Author === 'string') {
      const cleanInfoAuthor = info.Author.trim();
      if (
        cleanInfoAuthor.length > 2 && 
        cleanInfoAuthor.length < 150 && 
        !cleanInfoAuthor.toLowerCase().includes('microsoft') &&
        !cleanInfoAuthor.includes('[')
      ) {
        const parsed = cleanInfoAuthor
          .split(/[,;]|\band\b/i)
          .map(name => ({ name: name.trim().replace(/^[0-9*†‡\s]+|[0-9*†‡\s]+$/g, '') }))
          .filter(a => a.name.length > 1 && !a.name.includes('@') && !/\b(data|information|models?)\b/i.test(a.name));
        if (parsed.length > 0) {
          paper.authors = parsed;
        }
      }
    }

    // B. First-page text heuristic (Scan ONLY first 2000 chars of raw text, NEVER sections.introduction)
    const frontLines = cleanedText.substring(0, 2000)
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let titleIndex = -1;

    if (isGenericTitle && (!paper.title || paper.title.toLowerCase().endsWith('.pdf') || paper.title.toLowerCase() === 'sample')) {
      for (let i = 0; i < Math.min(8, frontLines.length); i++) {
        const line = frontLines[i];
        const lower = line.toLowerCase();
        // Skip obvious header or metadata noise
        if (
          lower.startsWith('abstract') || 
          lower.startsWith('introduction') || 
          lower.startsWith('1 ') || 
          lower.startsWith('1.') || 
          lower.startsWith('http') || 
          lower.startsWith('doi:') || 
          lower.startsWith('arxiv:') || 
          lower.startsWith('©') || 
          lower.startsWith('copyright') ||
          lower.startsWith('vol.') ||
          lower.startsWith('proceedings of') ||
          lower.startsWith('under review')
        ) {
          continue;
        }
        if (line.length >= 10 && line.length <= 180 && !line.includes('@')) {
          paper.title = line;
          titleIndex = i;
          break;
        }
      }
    }

    if (isInvalidAuthor) {
      const startIndex = titleIndex >= 0 ? titleIndex + 1 : 1;
      for (let i = startIndex; i < Math.min(startIndex + 6, frontLines.length); i++) {
        const line = frontLines[i];
        const lower = line.toLowerCase();
        if (
          lower.startsWith('abstract') || 
          lower.startsWith('introduction') || 
          lower.startsWith('1 ') || 
          lower.startsWith('http') || 
          lower.startsWith('doi:') || 
          lower.startsWith('for ') || 
          line.includes('[') ||
          lower.startsWith('facebook')
        ) {
          continue;
        }
        if (
          line.length >= 3 && 
          line.length <= 120 && 
          !line.includes('@') && 
          !lower.includes('university') && 
          !lower.includes('department') &&
          !/\b(data|information|shown|task|tasks|answers?|answering|models?|is|are|nlp|retrieval|generation|learning|neural|conference|proceedings|question|domain|intensive)\b/i.test(line)
        ) {
          const parsed = line
            .split(/[,;]|\band\b/i)
            .map(name => ({ name: name.trim().replace(/^[0-9*†‡\s]+|[0-9*†‡\s]+$/g, '') }))
            .filter(a => a.name.length > 1 && !a.name.includes('@') && !a.name.toLowerCase().includes('abstract') && a.name.split(' ').length <= 5);
          if (parsed.length > 0) {
            paper.authors = parsed;
            break;
          }
        }
      }
    }

    // Check if paper was deleted during extraction
    const stillExists = await Paper.exists({ _id: paperId });
    if (!stillExists) {
      console.log(`[ProcessingWorker] Paper ${paperId} was deleted during extraction. Aborting.`);
      return;
    }

    // 11. Update model fields with extracted sections & chunks
    paper.abstract = sections.abstract || 'Not detected';
    paper.pageCount = pageCount;
    paper.wordCount = wordCount;
    paper.characterCount = characterCount;
    paper.concepts = metadata.concepts;
    paper.methods = metadata.methods;
    paper.datasets = metadata.datasets;
    paper.limitations = metadata.limitations;
    paper.futureWork = metadata.futureWork;

    paper.processing = {
      pageCount,
      characterCount,
      wordCount,
      processedAt: new Date(),
      extractionVersion: '1.0.0'
    };
    paper.sections = sections;
    paper.chunks = chunks;

    // Transition to analyzing stage
    paper.processingStage = 'analyzing';
    paper.processingProgress = 60;
    paper.processingMessage = 'Analyzing paper with Gemini deep learning...';
    await paper.save();

    console.log(`PDF text extraction complete for: "${paper.title}" (${paperId}). Triggering AI analysis...`);

    // Execute AI analysis and Knowledge Graph building
    await analyzePaper(paperId);

  } catch (err: any) {
    console.error(`Paper Processing Pipeline Failure for ID ${paperId}:`, err);
    try {
      const exists = await Paper.exists({ _id: paperId });
      if (exists) {
        await Paper.findByIdAndUpdate(paperId, {
          status: 'failed',
          processingStage: 'failed',
          processingProgress: 0,
          processingError: err.message || 'Unknown error occurred during PDF parsing.'
        });
      }
    } catch (dbErr) {
      console.error('Critical database update failure after pipeline error:', dbErr);
    }
  } finally {
    activeProcessingJobs.delete(paperId);
  }
};
