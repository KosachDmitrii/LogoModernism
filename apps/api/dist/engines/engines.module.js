"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnginesModule = void 0;
const common_1 = require("@nestjs/common");
const engines_controller_1 = require("./engines.controller");
const engines_service_1 = require("./engines.service");
let EnginesModule = class EnginesModule {
};
exports.EnginesModule = EnginesModule;
exports.EnginesModule = EnginesModule = __decorate([
    (0, common_1.Module)({
        controllers: [engines_controller_1.EnginesController],
        providers: [engines_service_1.EnginesService],
        exports: [engines_service_1.EnginesService],
    })
], EnginesModule);
//# sourceMappingURL=engines.module.js.map