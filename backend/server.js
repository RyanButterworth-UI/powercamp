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

// serve Angular static files
app.use(express.static(path.join(__dirname, '../dist/powercamp')));

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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/powercamp/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
