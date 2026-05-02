// Resolves at access time so a phone hitting http://<mac-ip>:4200 calls
// http://<mac-ip>:3000 instead of the phone's own localhost. Falls back to
// localhost for non-browser contexts (SSR / tests).
export const environment = {
  production: false,
  get baseApi(): string {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  },
  sheetUrl:
    'https://docs.google.com/spreadsheets/d/1emMbGwRAQ2fTkyRtLK7zS1hxIOx55jOCBurz1y-T5dE/edit',
};
