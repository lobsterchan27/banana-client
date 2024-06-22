const path = require("path");
const wavFileInfo = require("wav-file-info");
const { loadJson, saveJson, getJson } = require("./utils");
const { exec } = require('child_process');
const { PROJECT_ROOT } = require("../settings");
const fs = require('fs');

async function audioSilenceStitch(contextName) {
  const contextPath = path.join("public", "context", contextName);
  const jsonPath = await getJson(contextPath);
  const outputFile = path.join(contextPath, `${contextName}_final_output.wav`);

  let prevEntryTime = 0;
  let prevInfoDuration = 0;
  let ffmpegInputs = [];
  let concatFilter = [];
  let streamIndex = 0;
  const silenceDurations = [];
  const clipDurations = [];
  const audioPaths = [];

  const json = await loadJson(jsonPath);

  let info
  // creating ffmpeg command
  for (const [key, segment] of Object.entries(json.data)) {

    const entryTime = segment.segments[segment.segments.length - 1].end;
    const currentAudioFilePath = path.join(contextPath, segment.text2speech);
    audioPaths.push(currentAudioFilePath);
    info = await getAudioInfo(currentAudioFilePath);
    clipDurations.push(info.duration);
    // const silenceDuration = Math.max(0, (entryTime - prevEntryTime - prevInfoDuration).toFixed(6));
    const silenceDuration = parseFloat((entryTime - prevEntryTime - prevInfoDuration).toFixed(6));
    console.log("Entry time:", entryTime);
    console.log("Previous entry time:", prevEntryTime);
    console.log("Previous info duration:", prevInfoDuration);
    console.log("Silence duration:", silenceDuration);
    silenceDurations.push(silenceDuration);

    if (silenceDuration < 1.5) {
      adjustPreviousSilence(silenceDurations, silenceDurations.length - 1, 1.5);
    }

    // Update variables for next iteration
    prevInfoDuration = info.duration;
    prevEntryTime = entryTime;
  }

  for (let key in silenceDurations) {
    // Prepare FFmpeg command parts
    if (silenceDurations[key] > 0) {
      ffmpegInputs.push(`-f lavfi -t ${silenceDurations[key]} -i anullsrc=r=48000:cl=mono`);
      concatFilter.push(`[${streamIndex}:a]`);
      streamIndex++;
    }
    ffmpegInputs.push(`-i "${audioPaths[key]}"`);
    concatFilter.push(`[${streamIndex}:a]`);
    streamIndex++;
  }

  console.log('final info duration: ', info.duration)
  console.log('silence durations: ', silenceDurations)


  // update subs times
  let total = 0;
  const firstSubStart = Object.values(json.data)[0].subs[0].start;
  if (firstSubStart < silenceDurations[0]) {
    console.log("updating sub times");

    // Backup the original JSON file
    const backupPath = path.join(contextPath, 'json.bak');
    await fs.promises.copyFile(jsonPath, backupPath);

    for (const [key, segment] of Object.entries(json.data)) {
      total += silenceDurations[key];
      updateSubTimes(segment.subs, total);
      total += clipDurations[key];
      // console.log(prevEndTime);
    }
    // Save the updated contextChunks back to the JSON file
    json.overlayAudio = path.basename(outputFile);
    await saveJson(jsonPath, json);
  } else {
    console.log("subs already updated");
  }

  // Build and execute FFmpeg command
  let filterComplex = `${concatFilter.join("")}concat=n=${concatFilter.length}:v=0:a=1`;
  let ffmpegCmd = `ffmpeg ${ffmpegInputs.join(" ")} -filter_complex "${filterComplex}" "${outputFile}"`;
  // console.log("FFmpeg command:", ffmpegCmd);

  exec(ffmpegCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing FFmpeg: ${error}`);
      return;
    }
    console.log("FFmpeg operation completed successfully.");
  });
}

//this shit is so dummbbbbbbbbbbb
function updateSubTimes(subs, total) {
  for (const subKey of Object.keys(subs)) {
    subs[subKey].start = parseFloat((parseFloat(subs[subKey].start) + total).toFixed(6));
    subs[subKey].end = parseFloat((parseFloat(subs[subKey].end) + total).toFixed(6));
    subs[subKey].words = subs[subKey].words.map(word => ({
      ...word,
      start: parseFloat((parseFloat(word.start) + total).toFixed(6)),
      end: parseFloat((parseFloat(word.end) + total).toFixed(6))
    }));
  }
  return
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

function adjustPreviousSilence(silenceDurations, index, minSilenceDuration = 1.5) {
  // Base case: if the first index or no negative value, return
  if (index <= 0 || silenceDurations[index] >= minSilenceDuration) return;

  if (silenceDurations[index - 1] > minSilenceDuration) {
    let neededAdjustment = parseFloat((-silenceDurations[index] + minSilenceDuration).toFixed(6)); // Calculate the needed adjustment to reach the minimum silence
    let possibleAdjustment = parseFloat((Math.min(silenceDurations[index - 1] - minSilenceDuration, neededAdjustment)).toFixed(6));
    silenceDurations[index - 1] = parseFloat((silenceDurations[index - 1] - possibleAdjustment).toFixed(6));
    silenceDurations[index] = parseFloat((silenceDurations[index] + possibleAdjustment).toFixed(6));
  }

  // Recursive call to adjust the previous index if it turns negative or below the minimum threshold
  adjustPreviousSilence(silenceDurations, index - 1, minSilenceDuration);
}

function adjustSilenceDurations(silenceDurations) {
  let changesMade;
  do {
    changesMade = false; // Flag to check if any adjustments were made in the current pass
    for (let i = 1; i < silenceDurations.length; i++) {
      if (silenceDurations[i] < 0 && silenceDurations[i - 1] > 0) {
        let adjustment = Math.min(silenceDurations[i - 1], -silenceDurations[i]);
        silenceDurations[i - 1] -= adjustment; // Reduce the previous value by the adjustment amount
        silenceDurations[i] += adjustment; // Increase the current negative duration
        changesMade = true; // Mark that an adjustment was made
      }
    }
  } while (changesed); // Repeat if any adjustments were made

  return silenceDurations;
}

module.exports = audioSilenceStitch;
