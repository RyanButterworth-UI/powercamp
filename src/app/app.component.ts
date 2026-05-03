import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteNavComponent } from './site-nav/site-nav.component';
import { UiHostComponent } from './ui/ui-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteNavComponent, UiHostComponent],
  template: `
    <app-site-nav></app-site-nav>
    <router-outlet></router-outlet>
    <app-ui-host></app-ui-host>
  `,
  styles: [],
})
export class AppComponent {}
