import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CAMP_VIDEOS, youtubeEmbedUrl } from '../data/videos';

// Public "Videos" page — every camp reel we have, newest first.
@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-3xl page-fade-in">
      <h1 class="text-3xl font-bold mb-2">Power Camp on video</h1>
      <p class="text-sm mb-6" style="color: var(--color-saga-text-muted)">
        The highlights reels, year by year. Turn the sound up.
      </p>

      @for (v of videos; track v.url) {
        <section class="mb-6" [attr.data-testid]="'video-' + v.youtubeId">
          <h2 class="text-lg font-semibold mb-2">
            Power Camp {{ v.year }}
            @if (v.note) {
              <span class="text-sm font-normal" style="color: var(--color-saga-text-muted)">
                · {{ v.note }}
              </span>
            }
          </h2>
          <div
            class="rounded-lg overflow-hidden"
            style="border: 1px solid var(--color-saga-border);"
          >
            <!-- 16:9 via padding-top so it scales with the column. -->
            <div style="position: relative; width: 100%; padding-top: 56.25%;">
              <iframe
                [src]="v.url"
                [title]="'Power Camp ' + v.year + ' highlights'"
                style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                loading="lazy"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: ``,
})
export class VideosComponent {
  private readonly sanitizer = inject(DomSanitizer);

  // The URLs are hardcoded constants, not user input — trusting them is safe,
  // and Angular needs to be told so before it will bind an iframe src.
  readonly videos: {
    year: number;
    youtubeId: string;
    note?: string;
    url: SafeResourceUrl;
  }[] = CAMP_VIDEOS.map((v) => ({
    ...v,
    url: this.sanitizer.bypassSecurityTrustResourceUrl(
      youtubeEmbedUrl(v.youtubeId)
    ),
  }));
}
