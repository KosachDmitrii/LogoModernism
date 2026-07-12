import pdfParse from 'pdf-parse';

const OCR_PAGES_PER_REQUEST = 5;
const DEFAULT_MAX_OCR_PAGES = 50;

function maxOcrPages(): number {
  const raw = Number(process.env.PDF_OCR_MAX_PAGES ?? DEFAULT_MAX_OCR_PAGES);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_MAX_OCR_PAGES;
  return Math.min(200, Math.floor(raw));
}

interface VisionPageResult {
  pageNumber: number;
  text: string;
}

async function ocrPdfBatch(
  pdfBase64: string,
  pageNumbers: number[],
): Promise<VisionPageResult[]> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GOOGLE_CLOUD_VISION_API_KEY is required for scanned PDF OCR. Get a key from Google Cloud Vision API.',
    );
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/files:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            inputConfig: {
              mimeType: 'application/pdf',
              content: pdfBase64,
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            pages: pageNumbers,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision OCR failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    responses?: Array<{
      responses?: Array<{
        fullTextAnnotation?: { text?: string };
        context?: { pageNumber?: number };
        error?: { message?: string };
      }>;
      error?: { message?: string };
    }>;
  };

  const batchError = data.responses?.[0]?.error?.message;
  if (batchError) {
    throw new Error(`Google Vision OCR failed: ${batchError}`);
  }

  const pageResponses = data.responses?.[0]?.responses ?? [];
  const results: VisionPageResult[] = [];

  for (let index = 0; index < pageResponses.length; index++) {
    const page = pageResponses[index];
    if (page?.error?.message) continue;

    const text = page?.fullTextAnnotation?.text?.trim() ?? '';
    if (!text) continue;

    results.push({
      pageNumber: page?.context?.pageNumber ?? pageNumbers[index] ?? index + 1,
      text,
    });
  }

  return results;
}

export async function extractPdfTextWithOcr(buffer: Buffer): Promise<{
  pages: string[];
  pageCount: number;
  ocrUsed: boolean;
  ocrPages: number;
}> {
  const parsed = await pdfParse(buffer);
  const embeddedText = parsed.text.replace(/\s+/g, ' ').trim();
  const pageCount = Math.max(1, parsed.numpages || 1);
  const charsPerPage = embeddedText.length / pageCount;

  if (embeddedText.length >= 120 && charsPerPage >= 40) {
    return {
      pages: splitPdfPages(embeddedText, pageCount),
      pageCount,
      ocrUsed: false,
      ocrPages: 0,
    };
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    throw new Error(
      'PDF contains no extractable text. Set GOOGLE_CLOUD_VISION_API_KEY for scanned-book OCR (~$1.50 per 1000 pages).',
    );
  }

  const pdfBase64 = buffer.toString('base64');
  const maxPages = Math.min(pageCount, maxOcrPages());
  const ocrPages: string[] = [];

  for (let start = 1; start <= maxPages; start += OCR_PAGES_PER_REQUEST) {
    const batch = Array.from(
      { length: Math.min(OCR_PAGES_PER_REQUEST, maxPages - start + 1) },
      (_, index) => start + index,
    );

    const batchResults = await ocrPdfBatch(pdfBase64, batch);
    for (const result of batchResults.sort((a, b) => a.pageNumber - b.pageNumber)) {
      ocrPages[result.pageNumber - 1] = result.text;
    }
  }

  const pages = ocrPages
    .map((text) => text?.replace(/\s+/g, ' ').trim() ?? '')
    .filter((text) => text.length >= 40);

  if (!pages.length) {
    throw new Error('OCR did not extract readable text from this PDF.');
  }

  return {
    pages,
    pageCount,
    ocrUsed: true,
    ocrPages: pages.length,
  };
}

function splitPdfPages(text: string, pageCount: number): string[] {
  if (!text.trim()) return [];

  const formFeedSplit = text.split('\f').map((page) => page.trim()).filter(Boolean);
  if (formFeedSplit.length > 1) {
    return formFeedSplit;
  }

  if (pageCount <= 1) {
    return [text];
  }

  const pageSize = Math.ceil(text.length / pageCount);
  const pages: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    pages.push(text.slice(i * pageSize, (i + 1) * pageSize));
  }
  return pages;
}
