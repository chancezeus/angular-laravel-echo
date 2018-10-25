import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {EchoService} from './lib.service';

/**
 * An http interceptor to automatically add the socket ID header, use this as something like
 * (or use the [[AngularLaravelEchoModule.forRoot]] method):
 *
 * ```js
 * @NgModule({
 *   ...
 *   providers: [
 *     ...
 *     { provide: HTTP_INTERCEPTORS, useClass: EchoInterceptor, multi: true }
 *     ...
 *   ]
 *   ...
 * })
 * ```
 */
@Injectable()
export class EchoInterceptor implements HttpInterceptor {
  constructor(private echoService: EchoService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const socketId = this.echoService.socketId;
    if (this.echoService.connected && socketId) {
      req = req.clone({headers: req.headers.append('X-Socket-ID', socketId)});
    }

    return next.handle(req);
  }
}
