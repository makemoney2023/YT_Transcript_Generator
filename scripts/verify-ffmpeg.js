const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function verifyFfmpeg() {
  console.log('Verifying ffmpeg installation...');

  if (!ffmpeg) {
    console.error('ffmpeg-static not found in node_modules');
    process.exit(1);
  }

  console.log('ffmpeg path:', ffmpeg);

  if (!fs.existsSync(ffmpeg)) {
    console.error('ffmpeg binary not found at path:', ffmpeg);
    process.exit(1);
  }

  try {
    const { stdout, stderr } = await execAsync(`"${ffmpeg}" -version`);
    console.log('ffmpeg version information:');
    console.log(stdout);
    if (stderr) {
      console.warn('stderr:', stderr);
    }
    console.log('ffmpeg verification successful!');
  } catch (error) {
    console.error('Error running ffmpeg:', error);
    process.exit(1);
  }
}

verifyFfmpeg().catch(console.error); 