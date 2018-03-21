import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {EchoService} from "./services/lib.service";

@NgModule({
    imports: [CommonModule],
    providers: [EchoService],
})
export class AngularLaravelEchoModule {
}
