const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

async function checkFileExists(file) {
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`File does not exist: ${file}`);
        reject(`File does not exist: ${file}`);
      } else {
        resolve(true);
      }
    });
  });
}

async function validateFiles(files) {
  const paths = [files.baseVideoPath, files.baseAudioPath, files.overlay];
  try {
    await Promise.all(paths.map(file => checkFileExists(file)));
    console.log("All files are accessible.");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function processVideo({ baseVideoPath, baseAudioPath, overlay, outputPath }) {
  if (!(await validateFiles({ baseVideoPath, baseAudioPath, overlay }))) {
    console.error("Validation failed. Exiting process.");
    return null;
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(baseVideoPath)
      .addInput(baseAudioPath)
      .addInput(overlay)
      .complexFilter([
        '[0:v][2:v]overlay=shortest=1[outv]',       // Overlay video on base video
        '[1:a]aformat=sample_fmts=s16:channel_layouts=stereo[basea]', // Convert base audio to a common format
        '[2:a]aformat=sample_fmts=s16:channel_layouts=stereo[overa]', // Convert overlay audio to a common format
        '[basea][overa]amix=inputs=2:duration=longest[outa]'          // Mix base audio and overlay audio
      ])
      .outputOptions([
        '-map [outv]', // Map the video output from the filter graph
        '-map [outa]'  // Map the audio output from the filter graph
      ])
      .on('error', (err) => {
        console.error('Error processing video:', err);
        reject(err);
      })
      .on('end', () => {
        console.log('Video processing completed.');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}


module.exports = { processVideo };
