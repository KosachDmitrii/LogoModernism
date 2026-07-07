import type { ImageGenerationRequest, LogoMarkType } from '@logo-platform/shared';
import { lettermarkTextFromName } from '@logo-platform/shared';
export { lettermarkTextFromName as initialsFromName };
export declare function enhanceLogoPrompt(request: ImageGenerationRequest): string;
export declare function resolveMarkTypeFromPrompt(text: string): LogoMarkType | undefined;
//# sourceMappingURL=prompt-enhancer.d.ts.map