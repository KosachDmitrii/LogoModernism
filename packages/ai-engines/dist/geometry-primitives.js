"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEOMETRY_PRIMITIVES = void 0;
exports.getPrimitiveById = getPrimitiveById;
exports.getPrimitivesByCategory = getPrimitivesByCategory;
exports.GEOMETRY_PRIMITIVES = [
    {
        id: 'prim-circle',
        name: 'Circle',
        category: 'circle',
        svgPath: 'M 50,10 A 40,40 0 1,1 49.9,10',
        constructionSteps: ['Define center point', 'Set radius on grid unit', 'Draw perfect arc'],
        gridAlignment: ['radial-grid', 'modular-grid'],
        psychologyTags: ['unity', 'wholeness', 'trust'],
        compatibleWith: ['prim-square', 'prim-cross', 'prim-concentric'],
    },
    {
        id: 'prim-square',
        name: 'Square',
        category: 'polygon',
        svgPath: 'M 10,10 L 90,10 L 90,90 L 10,90 Z',
        constructionSteps: ['Define corner on grid', 'Equal side lengths', 'Right angles at vertices'],
        gridAlignment: ['modular-grid', 'grid-based'],
        psychologyTags: ['stability', 'order', 'reliability'],
        compatibleWith: ['prim-circle', 'prim-triangle', 'prim-cross'],
    },
    {
        id: 'prim-triangle',
        name: 'Equilateral Triangle',
        category: 'polygon',
        svgPath: 'M 50,10 L 90,85 L 10,85 Z',
        constructionSteps: ['Base on grid line', 'Apex at 60° intersection', 'Equal side verification'],
        gridAlignment: ['modular-grid', 'isometric'],
        psychologyTags: ['dynamism', 'direction', 'innovation'],
        compatibleWith: ['prim-circle', 'prim-hexagon'],
    },
    {
        id: 'prim-hexagon',
        name: 'Hexagon',
        category: 'polygon',
        svgPath: 'M 50,5 L 90,27.5 L 90,72.5 L 50,95 L 10,72.5 L 10,27.5 Z',
        constructionSteps: ['Circle inscribed', 'Six vertices at 60° intervals', 'Equal edge lengths'],
        gridAlignment: ['modular-grid', 'radial-grid'],
        psychologyTags: ['efficiency', 'technology', 'structure'],
        compatibleWith: ['prim-circle', 'prim-triangle'],
    },
    {
        id: 'prim-cross',
        name: 'Cross',
        category: 'compound',
        svgPath: 'M 40,10 L 60,10 L 60,40 L 90,40 L 90,60 L 60,60 L 60,90 L 40,90 L 40,60 L 10,60 L 10,40 L 40,40 Z',
        constructionSteps: ['Define arm width', 'Center intersection', 'Equal arm proportions'],
        gridAlignment: ['grid-based', 'modular-grid'],
        psychologyTags: ['intersection', 'balance', 'medical'],
        compatibleWith: ['prim-circle', 'prim-square'],
    },
    {
        id: 'prim-concentric',
        name: 'Concentric Rings',
        category: 'compound',
        svgPath: 'M 50,10 A 40,40 0 1,1 49.9,10 M 50,25 A 25,25 0 1,1 49.9,25',
        constructionSteps: ['Shared center', 'Nested radii at grid intervals', 'Equal ring spacing'],
        gridAlignment: ['radial-grid'],
        psychologyTags: ['focus', 'expansion', 'targeting'],
        compatibleWith: ['prim-circle'],
    },
    {
        id: 'prim-arc',
        name: 'Quarter Arc',
        category: 'curve',
        svgPath: 'M 10,90 A 80,80 0 0,1 90,10',
        constructionSteps: ['Anchor at corner', 'Radius equals side length', '90° sweep'],
        gridAlignment: ['modular-grid', 'circle-in-square'],
        psychologyTags: ['movement', 'openness', 'progress'],
        compatibleWith: ['prim-square', 'prim-circle'],
    },
    {
        id: 'prim-organic',
        name: 'Organic Blob',
        category: 'organic',
        svgPath: 'M 30,20 C 10,20 10,50 25,60 C 40,70 60,80 75,60 C 90,40 80,15 55,15 C 40,15 30,20 30,20 Z',
        constructionSteps: ['Bezier control points on grid', 'Smooth tangent continuity', 'Optical balance check'],
        gridAlignment: ['optical-correction'],
        psychologyTags: ['humanity', 'warmth', 'approachability'],
        compatibleWith: ['prim-circle'],
    },
    {
        id: 'prim-monoline',
        name: 'Monoline Path',
        category: 'line',
        svgPath: 'M 15,50 L 35,50 L 50,20 L 65,80 L 85,50',
        constructionSteps: ['Single continuous stroke', 'Equal width throughout', 'Corner radius consistency'],
        gridAlignment: ['baseline-grid', 'modular-grid'],
        psychologyTags: ['clarity', 'precision', 'craft'],
        compatibleWith: ['prim-cross', 'prim-arc'],
    },
    {
        id: 'prim-diamond',
        name: 'Diamond',
        category: 'polygon',
        svgPath: 'M 50,10 L 90,50 L 50,90 L 10,50 Z',
        constructionSteps: ['Square rotated 45°', 'Diagonal axes alignment', 'Equal vertex angles'],
        gridAlignment: ['modular-grid', 'diagonal-split'],
        psychologyTags: ['luxury', 'precision', 'exclusivity'],
        compatibleWith: ['prim-square', 'prim-triangle'],
    },
];
function getPrimitiveById(id) {
    return exports.GEOMETRY_PRIMITIVES.find((p) => p.id === id);
}
function getPrimitivesByCategory(category) {
    return exports.GEOMETRY_PRIMITIVES.filter((p) => p.category === category);
}
//# sourceMappingURL=geometry-primitives.js.map