import fetch from 'node-fetch';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import ffmpeg from 'fluent-ffmpeg';

export default async function handler(req, res) {
  const { voiceUrl, musicUrl, musicVolume = 0.3 } = req.query;
  if (!voiceUrl || !musicUrl) {
    return res.status(400).send('Missing voiceUrl or musicUrl');
  }

  const voiceStream = await fetch(voiceUrl).then(r => r.body);
  const musicStream = await fetch(musicUrl).then(r => r.body);

  const merged = ffmpeg()
    .input(voiceStream).inputFormat('mp3')
    .input(musicStream).inputFormat('mp3')
    .complexFilter([
      { filter: 'volume', options: '1', inputs: '0:a', outputs: 'v1' },
      { filter: 'volume', options: musicVolume.toString(), inputs: '1:a', outputs: 'v2' },
      { filter: 'amix', options: 'inputs=2:duration=first', inputs: ['v1', 'v2'], outputs: 'output' },
    ], 'output')
    .outputFormat('mp3');

  res.setHeader('Content-Type', 'audio/mpeg');
  merged.pipe(res);
}
