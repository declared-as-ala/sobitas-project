"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigIntInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let BigIntInterceptor = class BigIntInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)((data) => this.serialize(data)));
    }
    serialize(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (typeof obj === 'bigint') {
            return Number(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.serialize(item));
        }
        if (typeof obj === 'object') {
            if (obj instanceof Date) {
                return obj;
            }
            const serializedObj = {};
            for (const key of Object.keys(obj)) {
                serializedObj[key] = this.serialize(obj[key]);
            }
            return serializedObj;
        }
        return obj;
    }
};
exports.BigIntInterceptor = BigIntInterceptor;
exports.BigIntInterceptor = BigIntInterceptor = __decorate([
    (0, common_1.Injectable)()
], BigIntInterceptor);
//# sourceMappingURL=bigint.interceptor.js.map