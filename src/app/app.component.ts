import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteNavComponent } from './site-nav/site-nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteNavComponent],
  template: `
    <app-site-nav></app-site-nav>
    <router-outlet></router-outlet>
  `,
  styles: [],
})
export class AppComponent {}
