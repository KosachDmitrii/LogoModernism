"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePageRangeArgs = normalizePageRangeArgs;
/** Normalize CLI args to --start / --end flags (supports both styles). */
function normalizePageRangeArgs(argv) {
    if (argv.includes('--force')) {
        const rest = normalizePageRangeArgs(argv.filter((a) => a !== '--force'));
        return [...rest, '--force'];
    }
    const hasFlags = argv.some((a) => a === '--start' || a.startsWith('--start=') || a === '--end' || a.startsWith('--end='));
    if (hasFlags)
        return argv;
    const nums = argv.filter((a) => /^\d+$/.test(a));
    if (nums.length >= 2)
        return ['--start', nums[0], '--end', nums[1]];
    if (nums.length === 1)
        return ['--start', nums[0], '--end', nums[0]];
    return argv;
}
//# sourceMappingURL=parse-args.js.map