const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { loadJson } = require("./utils");
const wavFileInfo = require("wav-file-info");

function addSilence(inputFile, outputFile, silenceDuration) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input("anullsrc=channel_layout=stereo:sample_rate=44100")
      .inputFormat("lavfi")
      .inputOptions(["-t", silenceDuration])
      .input(inputFile)
      .complexFilter(["[0:a][1:a]concat=n=2:v=0:a=1"])
      .output(outputFile)
      .on("end", () => resolve())
      .on("error", err => reject(err))
      .run();
  });
}

function concatenateAudios(filePaths, outputFile) {
  const merged = ffmpeg();
  filePaths.forEach(filePath => {
    merged.input(filePath);
  });
  merged
    .complexFilter([
      'concat=n=' + filePaths.length + ':v=0:a=1'
    ])
    .on('end', () => console.log('Files were merged'))
    .on('error', err => console.log('Error merging files', err))
    .save(outputFile);
}

const audioSilenceStitch = async () => {
  const contextPath = path.join(__dirname, "../public", "context", "context.jsonl");
  const contextChunks = await loadJson(contextPath);
  let prevEndTime = 0;
  let prevAudioFile = 0;
  const entries = Object.entries(contextChunks);
  const processedFiles = [];

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const lastEntry = value["segments"][value.segments.length - 1]["end"];
    const filename = value.filename; // Assuming the filename is in the value object
    const currentAudioFilePath = path.join(__dirname, "../public", "context", `${filename}`);
    const silenceDuration = Math.max(0, Math.floor(lastEntry - prevEndTime) - (prevAudioFile || 0));
    const outputFile = `public/context/${filename}`; // Also replacing it here
    processedFiles.push(outputFile);

    await new Promise((resolve, reject) => {
      wavFileInfo.infoByFilename(currentAudioFilePath, (err, info) => {
        if (err) return reject(err);
        prevAudioFile = info.duration;
        resolve();
      });
    });

    prevEndTime = lastEntry;
    await addSilence(currentAudioFilePath, outputFile, silenceDuration);
  }

  concatenateAudios(processedFiles, 'public/context/final_output.wav');
};

module.exports = { audioSilenceStitch };
