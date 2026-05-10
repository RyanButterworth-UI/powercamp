// In production the Express backend serves both the API and the Angular
// static files from the same origin, so all API calls are same-origin
// relative paths — no CORS, no hardcoded hostname to keep in sync with
// the Render service name or the custom domain.
export const environment = {
  production: true,
  baseApi: '',
  sheetUrl:
    'https://docs.google.com/spreadsheets/d/1emMbGwRAQ2fTkyRtLK7zS1hxIOx55jOCBurz1y-T5dE/edit',
};
