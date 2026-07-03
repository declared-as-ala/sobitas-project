import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.serialize(data)));
  }

  private serialize(obj: any): any {
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
      // Check if it is a Date object
      if (obj instanceof Date) {
        return obj;
      }
      
      const serializedObj: any = {};
      for (const key of Object.keys(obj)) {
        serializedObj[key] = this.serialize(obj[key]);
      }
      return serializedObj;
    }

    return obj;
  }
}
