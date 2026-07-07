"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const app_module_1 = require("./app.module");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), '../../.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), '../.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), '.env') });
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:3000'] });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`Logo Platform API running on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map