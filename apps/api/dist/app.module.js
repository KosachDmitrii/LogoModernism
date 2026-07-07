"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prompts_module_1 = require("./prompts/prompts.module");
const principles_module_1 = require("./principles/principles.module");
const engines_module_1 = require("./engines/engines.module");
const images_module_1 = require("./images/images.module");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [prompts_module_1.PromptsModule, principles_module_1.PrinciplesModule, engines_module_1.EnginesModule, images_module_1.ImagesModule],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map