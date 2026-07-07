"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePageWithVision = analyzePageWithVision;
exports.analyzePages = analyzePages;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const storage_1 = require("./storage");
const normalize_1 = require("./normalize");
const PRINCIPLE_LIST = [
    'era-swiss', 'era-bauhaus', 'era-corporate-identity', 'era-1960s', 'era-1970s',
    'geo-circle', 'geo-square', 'geo-triangle', 'geo-angular',
    'comp-negative-space', 'comp-symmetry', 'comp-overlay',
    'con-modular-grid', 'con-equal-width-lines', 'con-grid-based',
    'typ-geometric-sans', 'typ-swiss-typography', 'typ-wordmark',
    'cx-minimal-complexity', 'render-flat-vector', 'color-one-color',
];
const SYSTEM_PROMPT = `You are a design historian analyzing catalog pages from "Logo Modernism" by Jens Müller (1940–1980 trademarks).

Extract EVERY logo entry visible on the page. Each entry in the book shows:
- Logo graphic
- Company/brand name
- Industry/category (one line)
- Year · Designer/Studio · Country code

Return ONLY a JSON array. Each object:
{
  "name": "Company name",
  "industry": "industry category",
  "designer": "designer or studio",
  "year": 1965,
  "country": "DE",
  "section_hint": "book section if visible in header (e.g. Arrow, Circle, Overlay)",
  "geometry": ["circle", "triangle"],
  "composition": ["symmetry", "negative-space"],
  "construction": ["grid-based"],
  "typography": ["geometric-sans"],
  "mark_type": "symbol|wordmark|lettermark|combination|emblem",
  "era": "swiss|bauhaus|corporate_identity|1960s|1970s",
  "minimalism_level": 8,
  "visual_complexity": "minimal|medium|high",
  "color_count": 1,
  "significance": "One sentence original analysis of the design approach",
  "keywords": ["tag1", "tag2"]
}

Use only these principle IDs when relevant: ${PRINCIPLE_LIST.join(', ')}
Skip blank pages, pure text essays, and designer profile portraits without a trademark.
If page is a case study, set section_hint to the case study name.`;
async function analyzePageWithVision(options) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    const imagePath = (0, node_path_1.join)(storage_1.PIPELINE_DIR, options.pageImagePath);
    const imageB64 = (0, node_fs_1.readFileSync)(imagePath).toString('base64');
    const model = options.model ?? process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: 4096,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analyze catalog page ${options.page}. Extract all logo entries as JSON array.`,
                        },
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/png;base64,${imageB64}`, detail: 'high' },
                        },
                    ],
                },
            ],
        }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Vision API failed (${response.status}): ${err.slice(0, 300)}`);
    }
    const data = (await response.json());
    const content = data.choices?.[0]?.message?.content ?? '[]';
    const entries = (0, normalize_1.parseVisionResponse)(content);
    return entries.map((entry, index) => visionEntryToCandidate(entry, options.page, options.pageImagePath, index, content));
}
function visionEntryToCandidate(entry, page, pageImagePath, index, rawContent) {
    const section = (0, normalize_1.normalizeSection)(entry.section_hint ?? entry.page_section);
    const era = (0, normalize_1.normalizeEra)(entry.era, entry.year);
    const principleIds = (0, normalize_1.inferPrincipleIds)(entry);
    return {
        id: (0, storage_1.candidateId)(page, index, entry.name),
        status: 'pending',
        sourcePage: page,
        sourceIndex: index,
        pageImagePath,
        name: entry.name.trim(),
        industry: (entry.industry ?? 'general').toLowerCase().trim(),
        designer: entry.designer?.trim(),
        year: entry.year,
        country: entry.country?.trim().toUpperCase(),
        catalogChapter: (0, normalize_1.chapterFromSection)(section),
        catalogSection: section,
        era,
        markType: (0, normalize_1.normalizeMarkType)(entry.mark_type),
        entryKind: 'logo',
        geometry: entry.geometry ?? [],
        construction: entry.construction ?? [],
        composition: entry.composition ?? [],
        typography: entry.typography ?? ['sans-serif'],
        keywords: entry.keywords ?? [section ?? 'catalog', entry.industry ?? ''].filter(Boolean),
        principleIds,
        significance: entry.significance ?? `Modernist trademark for ${entry.name} (${entry.year ?? 'c. 1960s'}).`,
        minimalismLevel: entry.minimalism_level ?? 7,
        visualComplexity: entry.visual_complexity ?? 'minimal',
        colorCount: entry.color_count ?? 1,
        confidence: 0.75,
        rawVision: { entry, snippet: rawContent.slice(0, 500) },
    };
}
async function analyzePages(pages, options) {
    const all = [];
    for (const p of pages) {
        const candidates = await analyzePageWithVision({
            page: p.page,
            pageImagePath: p.file,
            model: options?.model,
        });
        all.push(...candidates);
        options?.onProgress?.(p.page, candidates.length);
        // Rate limit courtesy
        await new Promise((r) => setTimeout(r, 500));
    }
    return all;
}
//# sourceMappingURL=vision-analyzer.js.map