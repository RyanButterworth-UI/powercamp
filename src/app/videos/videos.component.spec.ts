import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideosComponent } from './videos.component';
import { CAMP_VIDEOS } from '../data/videos';

describe('VideosComponent', () => {
  let fixture: ComponentFixture<VideosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [VideosComponent] });
    fixture = TestBed.createComponent(VideosComponent);
    fixture.detectChanges();
  });

  it('renders one embed per camp video', () => {
    const frames = fixture.nativeElement.querySelectorAll('iframe');
    expect(frames.length).toBe(CAMP_VIDEOS.length);
  });

  it('embeds through youtube-nocookie so no cookies are set before play', () => {
    const frames: HTMLIFrameElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('iframe')
    );
    for (const f of frames) {
      expect(f.getAttribute('src')).toContain('youtube-nocookie.com/embed/');
    }
  });

  it('lists the years newest first', () => {
    const headings: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('h2')
    ).map((h) => (h as HTMLElement).textContent!.trim());

    const years = headings.map((h) => Number(h.match(/\d{4}/)![0]));
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('labels a year that has more than one reel', () => {
    // 2023 has two entries; the note is what tells them apart.
    const withNote = CAMP_VIDEOS.filter((v) => v.note);
    for (const v of withNote) {
      const section = fixture.nativeElement.querySelector(
        `[data-testid="video-${v.youtubeId}"]`
      );
      expect(section.textContent).toContain(v.note);
    }
  });

  it('defers offscreen players rather than loading six at once', () => {
    const frames: HTMLIFrameElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('iframe')
    );
    for (const f of frames) {
      expect(f.getAttribute('loading')).toBe('lazy');
    }
  });
});
