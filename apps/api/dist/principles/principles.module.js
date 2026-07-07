"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrinciplesModule = void 0;
const common_1 = require("@nestjs/common");
const principles_controller_1 = require("./principles.controller");
const principles_service_1 = require("./principles.service");
let PrinciplesModule = class PrinciplesModule {
};
exports.PrinciplesModule = PrinciplesModule;
exports.PrinciplesModule = PrinciplesModule = __decorate([
    (0, common_1.Module)({
        controllers: [principles_controller_1.PrinciplesController],
        providers: [principles_service_1.PrinciplesService],
    })
], PrinciplesModule);
//# sourceMappingURL=principles.module.js.map