import express from 'express';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { promisify } from 'util';

const app = express();
app.use(express.json({ limit: '10mb' }));

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post('/merge', async (req, res) => {
  const { voiceUrl, musicUrl, musicVolume = 0.3 } = req.body;

  if (!voiceUrl || !musicUrl) {
    console.error("Missing parameters");
    return res.status(400).send('Missing voiceUrl or musicUrl');
  }

  try {
    const voiceBuffer = await fetch(voiceUrl).then(r => r.buffer());
    const musicBuffer = await fetch(musicUrl).then(r => r.buffer());

    const voicePath = path.join(os.tmpdir(), 'voice.mp3');
    const musicPath = path.join(os.tmpdir(), 'music.mp3');
    const outputPath = path.join(os.tmpdir(), `merged-${Date.now()}.mp3`);

    await writeFile(voicePath, voiceBuffer);
    await writeFile(musicPath, musicBuffer);

    ffmpeg()
      .input(voicePath)
      .input(musicPath)
      .complexFilter([
        { filter: 'volume', options: '1', inputs: '0:a', outputs: 'v1' },
        { filter: 'volume', options: musicVolume.toString(), inputs: '1:a', outputs: 'v2' },
        { filter: 'amix', options: 'inputs=2:duration=first', inputs: ['v1', 'v2'], outputs: 'output' }
      ], 'output')
      .output(outputPath)
      .on('end', () => {
        const stream = fs.createReadStream(outputPath);
        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res).on('close', async () => {
          await unlink(voicePath);
          await unlink(musicPath);
          await unlink(outputPath);
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        res.status(500).send('Error merging audio');
      })
      .run();

  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).send('Internal server error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Audio merge API running on port ${PORT}`));
