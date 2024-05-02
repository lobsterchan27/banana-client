const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { loadJson } = require("./utils");
const wavFileInfo = require("wav-file-info");

function addSilence(inputFile, outputFile, silenceDuration) {
  return new Promise((resolve, reject) => {
    console.log(silenceDuration);
    ffmpeg()
      .input("anullsrc=channel_layout=stereo:sample_rate=44100")
      .inputFormat("lavfi")
      .inputOptions(["-t", silenceDuration])
      .input(inputFile)
      .complexFilter(["[0:a][1:a]concat=n=2:v=0:a=1"])
      .output(outputFile)
      .on("end", () => {
        console.log("Silence added to audio file");
        resolve();
      })
      .on("error", (err) => {
        console.log("Error adding silence to audio file", err);
        reject(err);
      })
      .run();
  });
}

const audioSilenceStitch = async () => {
  const contextPath = path.join(
    __dirname,
    "../public",
    "context",
    "context.jsonl"
  );
  const contextChunks = await loadJson(contextPath);
  let prevEndTime = 0;
  let prevAudioFile = 0;
  const entries = Object.entries(contextChunks);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const lastEntry = value["segments"][value.segments.length - 1]["end"];
    const currentAudioFilePath = path.join(
      __dirname,
      "../public",
      "context",
      `audio${i}.wav`
    );
    const silenceDuration = Math.max(
      0,
      Math.floor(lastEntry - prevEndTime) - (prevAudioFile || 0)
    );

    await new Promise((resolve, reject) => {
      wavFileInfo.infoByFilename(currentAudioFilePath, function (err, info) {
        if (err) reject(err);
        prevAudioFile = info.duration;
        resolve();
      });
    });

    prevEndTime = value["segments"][value.segments.length - 1]["end"];
    console.log(`Silence duration ${silenceDuration} `);
    addSilence(currentAudioFilePath, `public/context/output${i}.wav`, silenceDuration);
  }
};

module.exports = { audioSilenceStitch };