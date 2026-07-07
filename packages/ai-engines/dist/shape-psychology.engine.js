"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeShapePsychology = analyzeShapePsychology;
exports.getShapePsychologyForPrimitive = getShapePsychologyForPrimitive;
const geometry_primitives_1 = require("./geometry-primitives");
const SHAPE_PSYCHOLOGY = {
    circle: {
        emotions: ['trust', 'unity', 'harmony', 'protection'],
        associations: ['community', 'infinity', 'wholeness', 'global'],
        industries: ['tech', 'health', 'social', 'aviation'],
    },
    square: {
        emotions: ['stability', 'reliability', 'order', 'strength'],
        associations: ['foundation', 'structure', 'honesty', 'tradition'],
        industries: ['finance', 'legal', 'construction', 'insurance'],
    },
    triangle: {
        emotions: ['dynamism', 'power', 'direction', 'innovation'],
        associations: ['progress', 'hierarchy', 'energy', 'precision'],
        industries: ['tech', 'consulting', 'energy', 'sports'],
    },
    hexagon: {
        emotions: ['efficiency', 'balance', 'cooperation', 'intelligence'],
        associations: ['nature', 'engineering', 'modularity', 'network'],
        industries: ['tech', 'science', 'manufacturing', 'ai'],
    },
    organic: {
        emotions: ['warmth', 'approachability', 'creativity', 'humanity'],
        associations: ['nature', 'growth', 'flexibility', 'care'],
        industries: ['wellness', 'food', 'education', 'nonprofit'],
    },
    cross: {
        emotions: ['intersection', 'care', 'precision', 'guidance'],
        associations: ['health', 'navigation', 'faith', 'connection'],
        industries: ['medical', 'logistics', 'nonprofit'],
    },
    diamond: {
        emotions: ['luxury', 'exclusivity', 'precision', 'aspiration'],
        associations: ['premium', 'clarity', 'value', 'refinement'],
        industries: ['luxury', 'jewelry', 'fashion', 'real-estate'],
    },
    line: {
        emotions: ['clarity', 'direction', 'speed', 'minimalism'],
        associations: ['movement', 'connection', 'simplicity', 'modernity'],
        industries: ['transport', 'tech', 'media', 'architecture'],
    },
};
function analyzeShapePsychology(input) {
    return input.shapes.map((shape) => {
        const key = Object.keys(SHAPE_PSYCHOLOGY).find((k) => shape.toLowerCase().includes(k)) ?? 'circle';
        const profile = SHAPE_PSYCHOLOGY[key];
        let industryFit = 5;
        if (input.industry && profile.industries.some((i) => input.industry.toLowerCase().includes(i))) {
            industryFit = 9;
        }
        return {
            shape,
            emotions: profile.emotions,
            associations: profile.associations,
            industryFit,
            culturalNotes: getCulturalNotes(key),
            recommendedUsage: buildRecommendation(key, input.brandPersonality),
        };
    });
}
function getCulturalNotes(shape) {
    const notes = {
        circle: ['Universal symbol of unity across cultures', 'Avoid overuse in saturated tech markets'],
        triangle: ['Upward triangle suggests growth; downward suggests stability', 'Strong in European modernist tradition'],
        square: ['Conveys institutional trust in Western corporate identity', 'Can feel rigid without rounded corners'],
        hexagon: ['Associated with efficiency in tech/science branding', 'Honeycomb metaphor for collaboration'],
        organic: ['Signals human-centered brands', 'Requires careful scaling for small sizes'],
        cross: ['Medical cross is regulated in some jurisdictions', 'Strong navigational associations'],
        diamond: ['Premium positioning signal', 'Works best with restrained color palettes'],
        line: ['Swiss modernist tradition favors monoline', 'Requires consistent stroke weight'],
    };
    return notes[shape] ?? ['Consider cultural context for shape symbolism'];
}
function buildRecommendation(shape, personality) {
    if (personality === 'playful' && shape === 'organic')
        return 'Use soft organic forms with asymmetric balance';
    if (personality === 'technical' && shape === 'hexagon')
        return 'Combine hexagonal grid with precise monoline construction';
    if (personality === 'luxurious' && shape === 'diamond')
        return 'Pair diamond geometry with generous negative space';
    return `Leverage ${shape} psychology with modernist construction discipline`;
}
function getShapePsychologyForPrimitive(primitiveId) {
    const prim = geometry_primitives_1.GEOMETRY_PRIMITIVES.find((p) => p.id === primitiveId);
    if (!prim)
        return null;
    const results = analyzeShapePsychology({ shapes: [prim.name] });
    return results[0] ?? null;
}
//# sourceMappingURL=shape-psychology.engine.js.map