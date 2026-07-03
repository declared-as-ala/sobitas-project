"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.UserSession = void 0;
const common_1 = require("@nestjs/common");
class UserSession {
    id;
    name;
    email;
    phone;
    roleId;
}
exports.UserSession = UserSession;
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=current-user.decorator.js.map