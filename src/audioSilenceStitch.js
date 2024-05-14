const path = require("path");
const wavFileInfo = require("wav-file-info");
const { loadJson } = require("./utils");
const { exec } = require('child_process');

async function audioSilenceStitch(contextName) {
  const contextPath = path.join(process.cwd(), "public", "context", contextName);
  const jsonPath = path.join(contextPath, `${contextName}.json`);
  const contextChunks = await loadJson(jsonPath);
  const outputFile = path.join(contextPath, `${contextName}_final_output.wav`);

  let prevEntryTime = 0;
  let prevInfoDuration = 0;
  let ffmpegInputs = [];
  let concatFilter = [];
  let streamIndex = 0;  // Initialize stream index

  for (const [key, segment] of Object.entries(contextChunks)) {
    const entryTime = segment.segments[segment.segments.length - 1].end;
    const currentAudioFilePath = path.join(contextPath, `${contextName}_${key}.wav`);
    let info = await getAudioInfo(currentAudioFilePath);
    const silenceDuration = Math.max(0, Math.floor(entryTime - prevEntryTime - prevInfoDuration));

    // Prepare FFmpeg command parts
    if (silenceDuration > 0) {
      ffmpegInputs.push(`-f lavfi -t ${silenceDuration} -i anullsrc=r=44100:cl=mono`);
      concatFilter.push(`[${streamIndex}:a]`);
      streamIndex++;
    }
    ffmpegInputs.push(`-i "${currentAudioFilePath}"`);
    concatFilter.push(`[${streamIndex}:a]`);
    streamIndex++;

    prevInfoDuration = info.duration;
    prevEntryTime = entryTime;
  }

  // Build and execute FFmpeg command
  let filterComplex = `${concatFilter.join("")}concat=n=${concatFilter.length}:v=0:a=1`;
  let ffmpegCmd = `ffmpeg ${ffmpegInputs.join(" ")} -filter_complex "${filterComplex}" -ar 44100 "${outputFile}"`;

  exec(ffmpegCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing FFmpeg: ${error}`);
      return;
    }
    console.log("FFmpeg operation completed successfully.");
  });
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