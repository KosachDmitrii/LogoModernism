import type { ConstructionSolution } from './construction-solver.engine';
export interface SVGBlueprintInput {
    primitiveIds: string[];
    construction?: ConstructionSolution;
    width?: number;
    height?: number;
    strokeColor?: string;
    fillColor?: string;
}
export interface SVGBlueprint {
    svg: string;
    viewBox: string;
    layers: {
        id: string;
        name: string;
        elements: string[];
    }[];
    constructionGuides: string;
    exportFormats: string[];
    metadata: {
        gridSize: number;
        strokeWeight: number;
        primitiveCount: number;
    };
}
export declare function generateSVGBlueprint(input: SVGBlueprintInput): SVGBlueprint;
//# sourceMappingURL=svg-blueprint.engine.d.ts.map