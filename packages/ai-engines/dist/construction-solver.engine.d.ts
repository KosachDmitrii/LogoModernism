export interface ConstructionInput {
    primitiveIds: string[];
    gridType?: 'modular' | 'radial' | 'golden' | 'baseline';
    targetComplexity?: 'minimal' | 'medium' | 'high';
}
export interface ConstructionStep {
    order: number;
    action: string;
    gridReference: string;
    measurement: string;
}
export interface ConstructionSolution {
    id: string;
    gridType: string;
    moduleSize: number;
    steps: ConstructionStep[];
    constraints: string[];
    validationChecks: string[];
    estimatedStrokeWeight: string;
}
export declare function solveConstruction(input: ConstructionInput): ConstructionSolution;
//# sourceMappingURL=construction-solver.engine.d.ts.map