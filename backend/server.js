import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const staticPath = path.resolve(__dirname, '../dist/powercamp');
app.use(express.static(staticPath));

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

// fallback to index.html for Angular routing
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.resolve(__dirname, '../dist/powercamp');
  app.use(express.static(staticPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});
