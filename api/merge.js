import express from 'express';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
app.use(express.json());

app.post('/merge', async (req, res) => {
  const { voiceUrl, musicUrl, musicVolume = 0.3 } = req.body;

  if (!voiceUrl || !musicUrl) {
    return res.status(400).send('Missing voiceUrl or musicUrl');
  }

  try {
    const voiceStream = await fetch(voiceUrl).then(r => r.body);
    const musicStream = await fetch(musicUrl).then(r => r.body);

    res.setHeader('Content-Type', 'audio/mpeg');

    ffmpeg()
      .input(voiceStream).inputFormat('mp3')
      .input(musicStream).inputFormat('mp3')
      .complexFilter([
        { filter: 'volume', options: '1', inputs: '0:a', outputs: 'v1' },
        { filter: 'volume', options: musicVolume.toString(), inputs: '1:a', outputs: 'v2' },
        { filter: 'amix', options: 'inputs=2:duration=first', inputs: ['v1', 'v2'], outputs: 'output' }
      ], 'output')
      .outputFormat('mp3')
      .on('error', err => {
        console.error('FFmpeg error:', err);
        res.status(500).send('Error merging audio');
      })
      .pipe(res, { end: true });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send('Internal server error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Audio merge API running on port ${PORT}`));
