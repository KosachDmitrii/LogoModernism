"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveConstruction = solveConstruction;
const geometry_primitives_1 = require("./geometry-primitives");
function solveConstruction(input) {
    const gridType = input.gridType ?? 'modular';
    const moduleSize = input.targetComplexity === 'minimal' ? 8 : input.targetComplexity === 'high' ? 16 : 12;
    const steps = [
        { order: 1, action: 'Establish construction grid', gridReference: `${gridType}-grid`, measurement: `${moduleSize}x${moduleSize} units` },
        { order: 2, action: 'Define primary axis of symmetry', gridReference: 'center-line', measurement: 'Vertical bisector' },
        { order: 3, action: 'Place primary primitive', gridReference: 'module-center', measurement: `${moduleSize / 2} unit radius` },
    ];
    let order = 4;
    for (const primId of input.primitiveIds) {
        const prim = geometry_primitives_1.GEOMETRY_PRIMITIVES.find((p) => p.id === primId);
        if (!prim)
            continue;
        for (const step of prim.constructionSteps) {
            steps.push({
                order: order++,
                action: step,
                gridReference: prim.gridAlignment[0] ?? 'modular-grid',
                measurement: `${moduleSize / 4} unit increment`,
            });
        }
    }
    steps.push({
        order: order++,
        action: 'Apply optical corrections',
        gridReference: 'optical-adjustment',
        measurement: '1-2% overshoot on curves',
    });
    steps.push({
        order: order,
        action: 'Validate stroke consistency',
        gridReference: 'stroke-grid',
        measurement: `${moduleSize / 8} unit stroke weight`,
    });
    const constraints = [
        'All elements align to grid intersections',
        'Stroke weight uniform across entire mark',
        'Minimum clear space = 1 module on all sides',
        'No elements smaller than 1/4 module at final size',
    ];
    const validationChecks = [
        'Bilateral symmetry check',
        '16px favicon legibility test',
        'Stroke weight consistency audit',
        'Negative space balance verification',
        'Grid alignment pixel-snap validation',
    ];
    return {
        id: `construction-${Date.now()}`,
        gridType,
        moduleSize,
        steps,
        constraints,
        validationChecks,
        estimatedStrokeWeight: `${moduleSize / 8}px at 100px canvas`,
    };
}
//# sourceMappingURL=construction-solver.engine.js.map