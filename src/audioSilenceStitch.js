const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs").promises;
const wavFileInfo = require("wav-file-info");
const { loadJson } = require("./utils");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

ffmpeg.setFfmpegPath(ffmpegPath);

// FUCKED

async function audioSilenceStitch(contextName) {
  const contextPath = path.join(
    process.cwd(),
    "public",
    "context",
    contextName
  );
  const jsonPath = path.join(contextPath, `${contextName}.json`);
  const contextChunks = await loadJson(jsonPath);
  const outputFile = path.join(contextPath, `${contextName}_final_output.wav`);
  const processedFiles = [];
  let prevEntryTime = 0;
  let info = {};

  for (const key of Object.keys(contextChunks)) {
    const segment = contextChunks[key];
    const entryTime = segment.segments[segment.segments.length - 1].end;
    const currentAudioFilePath = path.join(
      contextPath,
      `${contextName}_${key}.wav`
    );

    const silenceDuration = Math.max(0, Math.floor(entryTime - prevEntryTime) - (prevEntryTime || 0));
    

    info = await getAudioInfo(currentAudioFilePath);

    const outputFile = path.join(
      contextPath, `${contextName}_${key}_output.wav`);
    processedFiles.push(outputFile);

    prevEntryTime = entryTime;
    await addSilence(currentAudioFilePath, outputFile, silenceDuration);
  }

  concatenateAudios(processedFiles, outputFile);
 
}

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

async function getAudioInfo(filePath) {
  return new Promise((resolve, reject) => {
    wavFileInfo.infoByFilename(filePath, (err, info) => {
      if (err) {
        console.error("Error getting audio info:", filePath, err);
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
}

module.exports = audioSilenceStitch;
