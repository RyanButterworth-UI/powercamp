export interface CampVideo {
  year: number;
  youtubeId: string;
  /** Shown next to the year when one year has more than one reel. */
  note?: string;
}

// Camp reels, newest first. Single source of truth — the landing page shows the
// most recent one, the Videos page shows the lot.
//
// NOTE: 2023 has two entries because two links were supplied for that year. If
// one of them is actually a different year, fix the `year` here and it'll move
// itself into place.
export const CAMP_VIDEOS: CampVideo[] = [
  { year: 2026, youtubeId: '80OJqIUfw_U' },
  { year: 2025, youtubeId: 'JFfmb47m2vc' },
  { year: 2024, youtubeId: '82xPVgB9qBI' },
  { year: 2023, youtubeId: 'pb7IZvADMvY' },
  { year: 2023, youtubeId: 'J6iJFKr-Qi8', note: 'second reel' },
  { year: 2022, youtubeId: 'WhFqf1QFhUk' },
];

// The most recent reel — what the landing page embeds.
export const LATEST_VIDEO = CAMP_VIDEOS[0];

// youtube-nocookie rather than youtube.com: same player, but it doesn't set
// tracking cookies until someone actually presses play. Worth having on a site
// used mostly by under-18s and their parents.
export function youtubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
}
