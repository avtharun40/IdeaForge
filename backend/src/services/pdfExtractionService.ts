import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  info?: Record<string, any>;
}

/**
 * Extracts raw text and page count from a PDF file on disk.
 * Handles missing, empty, invalid, and corrupted PDFs.
 */
export const extractTextFromPdf = async (filePath: string): Promise<PDFExtractionResult> => {
  // 1. Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF extraction failed: File does not exist at "${filePath}"`);
  }

  // 2. Try reading file buffer
  let dataBuffer: Buffer;
  try {
    dataBuffer = fs.readFileSync(filePath);
  } catch (readErr: any) {
    throw new Error(`PDF extraction failed: Unable to read file. ${readErr.message}`);
  }

  // 3. Handle empty PDF (0 bytes)
  if (dataBuffer.length === 0) {
    throw new Error('PDF extraction failed: The file is empty (0 bytes).');
  }

  // 4. Handle invalid PDF signature (must start with %PDF)
  const fileSignature = dataBuffer.toString('utf8', 0, 4);
  if (fileSignature !== '%PDF') {
    throw new Error('PDF extraction failed: The file is not a valid PDF document (missing %PDF header).');
  }

  // 5. Parse PDF content
  try {
    const parsedData = await pdf(dataBuffer);
    
    if (!parsedData) {
      throw new Error('Parser returned an empty response.');
    }

    const text = parsedData.text ? parsedData.text : '';
    if (!text || text.trim().length === 0) {
      throw new Error('No readable text content could be extracted from the PDF.');
    }
    const pageCount = parsedData.numpages || 1;

    return {
      text: text.trim(),
      pageCount,
      info: parsedData.info || {}
    };
  } catch (parseErr: any) {
    // 6. Handle corrupted / unreadable PDF
    throw new Error(`PDF extraction failed: The document appears to be corrupted or password-protected. Details: ${parseErr.message}`);
  }
};
