export declare class UserSession {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    roleId: number | null;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
