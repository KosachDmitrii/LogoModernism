export interface GeometryPrimitive {
    id: string;
    name: string;
    category: 'circle' | 'polygon' | 'curve' | 'line' | 'compound' | 'organic';
    svgPath: string;
    constructionSteps: string[];
    gridAlignment: string[];
    psychologyTags: string[];
    compatibleWith: string[];
}
export declare const GEOMETRY_PRIMITIVES: GeometryPrimitive[];
export declare function getPrimitiveById(id: string): GeometryPrimitive | undefined;
export declare function getPrimitivesByCategory(category: GeometryPrimitive['category']): GeometryPrimitive[];
//# sourceMappingURL=geometry-primitives.d.ts.map