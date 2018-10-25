import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS} from '@angular/common/http';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {EchoInterceptor} from './services/interceptor.service';
import {ECHO_CONFIG, EchoConfig, EchoService} from './services/lib.service';

/**
 * Module definition, use [[forRoot]] for easy configuration
 * of the service and interceptor
 */
@NgModule({
  imports: [CommonModule],
})
export class AngularLaravelEchoModule {
  /**
   * Make the service and interceptor available for the current (root) module, it is recommended that this method
   * is only called from the root module otherwise multiple instances of the service and interceptor will be created
   * (one for each module it is called in)
   */
  public static forRoot(config: EchoConfig): ModuleWithProviders {
    return {
      ngModule: AngularLaravelEchoModule,
      providers: [
        EchoService,
        {provide: HTTP_INTERCEPTORS, useClass: EchoInterceptor, multi: true},
        {provide: ECHO_CONFIG, useValue: config},
      ]
    }
  }
}
