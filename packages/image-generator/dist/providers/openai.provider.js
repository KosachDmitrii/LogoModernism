"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithOpenAI = generateWithOpenAI;
const prompt_enhancer_1 = require("../prompt-enhancer");
function getImageModel() {
    return process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
}
function isGptImageModel(model) {
    return model.startsWith('gpt-image');
}
function mapSizeForGptImage(size) {
    const map = {
        '1024x1024': '1024x1024',
        '1024x1792': '1024x1536',
        '1792x1024': '1536x1024',
    };
    return map[size] ?? '1024x1024';
}
function buildRequestBody(model, prompt, size, count) {
    const body = {
        model,
        prompt: prompt.slice(0, 4000),
    };
    if (isGptImageModel(model)) {
        // gpt-image-* returns base64 only; response_format is not supported
        body.n = 1;
        body.size = mapSizeForGptImage(size);
        body.quality = 'medium';
        body.output_format = 'png';
        // Opaque white background so dark marks stay visible on dark UI
        body.background = 'opaque';
        return body;
    }
    if (model === 'dall-e-3') {
        body.n = Math.min(count, 1);
        body.size = size;
        body.quality = 'standard';
        body.style = 'natural';
        return body;
    }
    // dall-e-2 and others
    body.n = Math.min(count, 4);
    body.size = size === '1024x1792' || size === '1792x1024' ? '1024x1024' : size;
    return body;
}
function toImageUrl(item) {
    if (item.url)
        return item.url;
    if (item.b64_json)
        return `data:image/png;base64,${item.b64_json}`;
    throw new Error('OpenAI response contained no image data');
}
async function generateWithOpenAI(request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    const enhancedPrompt = (0, prompt_enhancer_1.enhanceLogoPrompt)(request);
    const size = request.size ?? '1024x1024';
    const count = Math.min(request.count ?? 1, 4);
    const model = getImageModel();
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildRequestBody(model, enhancedPrompt, size, count)),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI image generation failed (${response.status}): ${errorBody}`);
    }
    const data = (await response.json());
    const [width, height] = size.split('x').map(Number);
    const images = data.data.map((item, index) => ({
        id: `img-openai-${Date.now()}-${index}`,
        url: toImageUrl(item),
        prompt: enhancedPrompt,
        provider: 'openai',
        model,
        revisedPrompt: item.revised_prompt,
        width,
        height,
        createdAt: new Date().toISOString(),
    }));
    if (!images.length) {
        throw new Error('OpenAI returned no images');
    }
    return { images, provider: 'openai', model, enhancedPrompt };
}
//# sourceMappingURL=openai.provider.js.map