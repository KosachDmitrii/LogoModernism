"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSVGBlueprint = generateSVGBlueprint;
const geometry_primitives_1 = require("./geometry-primitives");
function generateSVGBlueprint(input) {
    const width = input.width ?? 100;
    const height = input.height ?? 100;
    const stroke = input.strokeColor ?? '#000000';
    const fill = input.fillColor ?? 'none';
    const gridSize = input.construction?.moduleSize ?? 12;
    const strokeWeight = gridSize / 8;
    const primitives = input.primitiveIds
        .map((id) => geometry_primitives_1.GEOMETRY_PRIMITIVES.find((p) => p.id === id))
        .filter(Boolean);
    const constructionGuides = buildConstructionGuides(width, height, gridSize);
    const markPaths = primitives.map((p) => `<path d="${p.svgPath}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWeight}" />`);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g id="construction-guides" opacity="0.15">
    ${constructionGuides}
  </g>
  <g id="mark">
    ${markPaths.join('\n    ')}
  </g>
</svg>`;
    return {
        svg,
        viewBox: `0 0 ${width} ${height}`,
        layers: [
            { id: 'construction-guides', name: 'Construction Guides', elements: [constructionGuides] },
            { id: 'mark', name: 'Logo Mark', elements: markPaths },
        ],
        constructionGuides,
        exportFormats: ['svg', 'pdf', 'png', 'eps'],
        metadata: {
            gridSize,
            strokeWeight,
            primitiveCount: primitives.length,
        },
    };
}
function buildConstructionGuides(width, height, gridSize) {
    const lines = [];
    const step = width / gridSize;
    for (let i = 0; i <= gridSize; i++) {
        const pos = i * step;
        lines.push(`<line x1="${pos}" y1="0" x2="${pos}" y2="${height}" stroke="#ccc" stroke-width="0.5" />`);
        lines.push(`<line x1="0" y1="${pos}" x2="${width}" y2="${pos}" stroke="#ccc" stroke-width="0.5" />`);
    }
    lines.push(`<line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#f00" stroke-width="0.5" stroke-dasharray="2" />`);
    lines.push(`<line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="#f00" stroke-width="0.5" stroke-dasharray="2" />`);
    return lines.join('\n    ');
}
//# sourceMappingURL=svg-blueprint.engine.js.map