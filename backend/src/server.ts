import express from 'express';
import path from 'path';
import cors from 'cors';
import { env } from './env';
import { submitRouter } from './routes/submit';
import { consentRouter } from './routes/consent';
import { feedbackRouter } from './routes/feedback';
import { lookupRouter } from './routes/lookup';
import { requestLinkRouter } from './routes/request-link';
import { verifyLinkRouter } from './routes/verify-link';
import { updateRouter } from './routes/update';
import { adminRouter } from './routes/admin';
import { leadersRouter } from './routes/leaders';
import { unsubscribeRouter } from './routes/unsubscribe';
import { statsRouter } from './routes/stats';
import { teamsRouter } from './routes/teams';
import { publicConfigRouter } from './routes/public-config';

const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Resolved here (rather than next to express.static below) because the
// SPA-fallback middleware further down references it before that block.
const distDir = path.resolve(__dirname, '../dist/powercamp/browser');

// Health check — used by Render to verify the service is up.
// Must be registered before the static-file and SPA fallback handlers
// so it isn't swallowed by the catch-all '*' route.
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// SPA fallback for browser navigations under /admin/*. Several admin
// routes overlap by name between the frontend (/admin/leaders /teams
// /bunks are Angular routes) and the backend (GET /admin/leaders /teams
// /bunks are JSON API routes). Without this middleware, refreshing on
// /admin/bunks hits the API, requireAdmin sees no Bearer token, returns
// 401 JSON, and the user never gets the SPA back.
//
// Detection by Accept header: browser navigations send
//   Accept: text/html,application/xhtml+xml,...
// and Angular's HttpClient fetch() sends
//   Accept: application/json, text/plain, */*
// so req.accepts(['html','json']) picks 'html' for the first and 'json'
// for the second. The API stays accessible to authed fetch() calls.
app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    req.path.startsWith('/admin/') &&
    req.accepts(['html', 'json']) === 'html'
  ) {
    return res.sendFile(path.join(distDir, 'index.html'));
  }
  next();
});

app.use(submitRouter);
app.use(consentRouter);
app.use(feedbackRouter);
app.use(lookupRouter);
app.use(requestLinkRouter);
app.use(verifyLinkRouter);
app.use(updateRouter);
app.use(adminRouter);
app.use(leadersRouter);
app.use(unsubscribeRouter);
app.use(statsRouter);
app.use(teamsRouter);
app.use(publicConfigRouter);

app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
