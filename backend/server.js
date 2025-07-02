import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ✅ add CORS for local Angular dev
app.use(
  cors({
    origin: [
      'http://localhost:4200',
      'https://powercamp-registration.onrender.com',
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/powercamp/browser')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/powercamp/browser/index.html'));
});

app.post('/submit', async (req, res) => {
  console.log('Received data:', req.body);

  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbxAJI1fVRvfpLlg35GyEMFUBZzNfepfU3b-NJRZZvS7Y2QnEdiYEo5qEUhESDQmoHIgHQ/exec',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to forward data' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});
