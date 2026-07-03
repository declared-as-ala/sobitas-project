"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bigint_interceptor_1 = require("./bigint.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalInterceptors(new bigint_interceptor_1.BigIntInterceptor());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Protein.tn Fitness API')
        .setDescription('API documentation for Protein.tn Fitness ecosystem mobile features. Links with Laravel MySQL tables.')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`✓ NestJS Fitness API is running on: http://localhost:${port}`);
    console.log(`✓ Swagger API Documentation at: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map