import {ModuleWithProviders, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ECHO_CONFIG, EchoConfig, EchoService} from './services/lib.service';

@NgModule({
  imports: [CommonModule],
})
export class AngularLaravelEchoModule {
  public static forRoot(config: EchoConfig): ModuleWithProviders {
    return {
      ngModule: AngularLaravelEchoModule,
      providers: [
        EchoService,
        {provide: ECHO_CONFIG, useValue: config},
      ]
    }
  }
}
