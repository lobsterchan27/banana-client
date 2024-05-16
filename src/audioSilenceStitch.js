const path = require("path");
const wavFileInfo = require("wav-file-info");
const { loadJson, saveJson } = require("./utils");
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
  let streamIndex = 0;
  let silenceDurations = [];

  // creating ffmpeg command
  for (const [key, segment] of Object.entries(contextChunks)) {
    const entryTime = segment.segments[segment.segments.length - 1].end;
    const currentAudioFilePath = path.join(contextPath, `${contextName}_${key}.wav`);
    let info = await getAudioInfo(currentAudioFilePath);
    const silenceDuration = Math.max(0, (entryTime - prevEntryTime - prevInfoDuration).toFixed(3));
    silenceDurations.push(silenceDuration);

    // Prepare FFmpeg command parts
    if (silenceDuration > 0) {
      ffmpegInputs.push(`-f lavfi -t ${silenceDuration} -i anullsrc=r=48000:cl=mono`);
      concatFilter.push(`[${streamIndex}:a]`);
      streamIndex++;
    }
    ffmpegInputs.push(`-i "${currentAudioFilePath}"`);
    concatFilter.push(`[${streamIndex}:a]`);
    streamIndex++;

    // Update variables for next iteration
    prevInfoDuration = info.duration;
    prevEntryTime = entryTime;
  }

  // update subs times
  let endTime = 0;
  const firstSubStart = Object.values(contextChunks)[0].subs[0].start;
  console.log("firstSubStart", firstSubStart)
  console.log("silenceDurations", silenceDurations[0])
  if (firstSubStart < silenceDurations[0]) {
    console.log("updating sub times")
    for (const [key, segment] of Object.entries(contextChunks)) {
      const prevEndTime = updateSubTimes(segment.subs, silenceDurations[key], endTime);
      console.log(prevEndTime)
      endTime = prevEndTime;  
    }
  } else {
    console.log("subs already updated")
  }
  // Save the updated contextChunks back to the JSON file
  await saveJson(jsonPath, contextChunks);

  // Build and execute FFmpeg command
  let filterComplex = `${concatFilter.join("")}concat=n=${concatFilter.length}:v=0:a=1`;
  let ffmpegCmd = `ffmpeg ${ffmpegInputs.join(" ")} -filter_complex "${filterComplex}" "${outputFile}"`;
  console.log("FFmpeg command:", ffmpegCmd);

  exec(ffmpegCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing FFmpeg: ${error}`);
      return;
    }
    console.log("FFmpeg operation completed successfully.");
  });
}

function updateSubTimes(subs, silenceDuration, endTime) {
  let prevEndTime = 0;
  for (const subKey of Object.keys(subs)) {
    subs[subKey].start = parseFloat((parseFloat(subs[subKey].start) + silenceDuration + endTime).toFixed(3));
    subs[subKey].end = parseFloat((parseFloat(subs[subKey].end) + silenceDuration + endTime).toFixed(3));
    subs[subKey].words = subs[subKey].words.map(word => ({
      ...word,
      start: parseFloat((parseFloat(word.start) + silenceDuration + endTime).toFixed(3)),
      end: parseFloat((parseFloat(word.end) + silenceDuration + endTime).toFixed(3))
    }));
    prevEndTime = subs[subKey].end;
  }
  return prevEndTime;
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
