"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceLogoPrompt = enhanceLogoPrompt;
const LOGO_SUFFIX = ' Professional logo design, flat vector style, clean white background, ' +
    'no text unless specified, scalable icon, modernist Swiss design, ' +
    'no gradients, no shadows, no photorealism, centered composition.';
function enhanceLogoPrompt(request) {
    const base = request.prompt.trim();
    const company = request.companyName ? ` for "${request.companyName}"` : '';
    if (base.toLowerCase().includes('logo')) {
        return `${base}${company}. ${LOGO_SUFFIX}`;
    }
    return `Minimal geometric logo${company}: ${base}. ${LOGO_SUFFIX}`;
}
//# sourceMappingURL=prompt-enhancer.js.map