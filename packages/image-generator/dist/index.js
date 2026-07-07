"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveProvider = resolveProvider;
exports.generateImages = generateImages;
exports.getAvailableProviders = getAvailableProviders;
const openai_provider_1 = require("./providers/openai.provider");
const mock_provider_1 = require("./providers/mock.provider");
__exportStar(require("./prompt-enhancer"), exports);
function resolveProvider(requested) {
    if (requested === 'mock')
        return 'mock';
    if (requested === 'openai')
        return 'openai';
    return process.env.OPENAI_API_KEY ? 'openai' : 'mock';
}
async function generateImages(request) {
    const provider = resolveProvider(request.provider);
    if (provider === 'openai') {
        return (0, openai_provider_1.generateWithOpenAI)(request);
    }
    return (0, mock_provider_1.generateWithMock)(request);
}
function getAvailableProviders() {
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    return [
        { id: 'openai', name: 'OpenAI DALL·E 3', available: hasOpenAI },
        { id: 'mock', name: 'Mock (local preview)', available: true },
    ];
}
//# sourceMappingURL=index.js.map