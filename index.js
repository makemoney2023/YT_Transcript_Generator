require('dotenv').config();
const fs = require('fs')
const YoutubeMp3Downloader = require('youtube-mp3-downloader')
const { Deepgram } = require('@deepgram/sdk')
const ffmpeg = require('ffmpeg-static')

const deepgram = new Deepgram(process.env.DG_KEY)
const YD = new YoutubeMp3Downloader({
  ffmpegPath: ffmpeg,
  outputPath: './',
  youtubeVideoQuality: 'highestaudio'
})

YD.download('_BxzbGh9uvk')

YD.on('progress', data => {
  console.log(data.progress.percentage + '% downloaded')
})

YD.on('error', (err) => {
  console.error('Error during download:', err);
});

YD.on('finished', async (err, video) => {
  if (err) {
    console.error('Error after download:', err);
    return;
  }
  
  const videoFileName = video.file;
  console.log(`Downloaded ${videoFileName}`);

  try {
    const file = {
      buffer: fs.readFileSync(videoFileName),
      mimetype: 'audio/mp3'
    };
    const options = {
      punctuate: true
    };

    const result = await deepgram.transcription.preRecorded(file, options);
    const transcript = result.results.channels[0].alternatives[0].transcript;

    fs.writeFileSync(`${videoFileName}.txt`, transcript, () => `Wrote ${videoFileName}.txt`);
    fs.unlinkSync(videoFileName);
  } catch (e) {
    console.error('Error during transcription:', e);
  }
});
