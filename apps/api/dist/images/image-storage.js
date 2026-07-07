"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeneratedDir = getGeneratedDir;
exports.persistImageUrl = persistImageUrl;
exports.resolveGeneratedFile = resolveGeneratedFile;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const GENERATED_DIR = (0, node_path_1.join)(process.cwd(), 'generated');
function getGeneratedDir() {
    if (!(0, node_fs_1.existsSync)(GENERATED_DIR)) {
        (0, node_fs_1.mkdirSync)(GENERATED_DIR, { recursive: true });
    }
    return GENERATED_DIR;
}
function persistImageUrl(url, id) {
    if (!url.startsWith('data:image/')) {
        return url;
    }
    const match = url.match(/^data:image\/([\w+]+);base64,(.+)$/);
    if (!match)
        return url;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const filename = `${id}.${ext}`;
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(getGeneratedDir(), filename), buffer);
    return `/api/images/files/${filename}`;
}
function resolveGeneratedFile(filename) {
    if (!/^img-[\w-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
        return null;
    }
    const filePath = (0, node_path_1.join)(getGeneratedDir(), filename);
    return (0, node_fs_1.existsSync)(filePath) ? filePath : null;
}
//# sourceMappingURL=image-storage.js.map