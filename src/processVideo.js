const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

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

async function validateFiles({ baseVideoPath, overlays }) {
  const paths = [baseVideoPath, ...overlays.map((overlay) => overlay.path)];
  try {
    await Promise.all(paths.map((file) => checkFileExists(file)));
    console.log("All files are accessible.");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function processVideo({ baseVideoPath, overlays, outputPath }) {
    if (!(await validateFiles({ baseVideoPath, overlays }))) {
      console.error("Validation failed. Exiting process.");
      return null;
    }
  
    return new Promise((resolve, reject) => {
      let command = ffmpeg(baseVideoPath)
        .on('error', function(err) {
          console.error('Error processing video:', err.message);
          reject(err);
        })
        .on('end', function() {
          console.log('Processing finished.');
          resolve(outputPath);
        });
  
      // Prepare the complex filter string
      let filterComplex = '';
      let inputs = '0:v'; // Initial input from the base video
      let currentTime = 0; // Start time for the first overlay
  
      overlays.forEach((overlay, index) => {
        command.input(overlay.path);
        let overlayInput = `${index+1}:v`; // Label for the overlay input
        let nextInput = `tmp${index}`; // Temporary label for the next input
      
        // Configure the overlay filter
        let startTime = currentTime;
        let endTime = currentTime + overlay.duration;
        console.log(startTime, endTime)
        // If this is the second clip, add the reverse filter
        if (index === 1) {
          filterComplex += `[${overlayInput}]reverse[${overlayInput}rev];`;
          overlayInput += 'rev';
        }
      
        filterComplex += `[${inputs}][${overlayInput}]overlay=enable='between(t,${startTime},${endTime})'[${nextInput}];`;
        inputs = nextInput; // Update inputs for the next iteration
        currentTime += overlay.duration; // Update currentTime to the end time of the current overlay
      });
  
      // Apply the complex filter
      command.complexFilter(filterComplex.slice(0, -1), inputs)
        .output(outputPath)
        .videoCodec('libx264')
        .format('mp4')
        .run();
    });
  }


module.exports = { processVideo };