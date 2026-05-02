import express from 'express';
import path from 'path';
import cors from 'cors';
import { env } from './env';
import { submitRouter } from './routes/submit';
import { consentRouter } from './routes/consent';
import { feedbackRouter } from './routes/feedback';
import { lookupRouter } from './routes/lookup';

const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

app.use(submitRouter);
app.use(consentRouter);
app.use(feedbackRouter);
app.use(lookupRouter);

const distDir = path.resolve(__dirname, '../dist/powercamp/browser');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
