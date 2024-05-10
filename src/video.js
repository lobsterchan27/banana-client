const express = require("express");
const path = require("path");
const { processVideo } = require("./processVideo");
const { loadJson } = require("./utils");

const router = express.Router();

router.get("/processVideo", async function (request, response) {
  const contextPath = path.join(
    __dirname,
    "../public",
    "context",
    "context.jsonl"
  );
  const contextChunks = await loadJson(contextPath);
  console.log("Processing Video:");
  const files = {
    baseVideoPath: "C:/Users/luke/Desktop/input/March_video.webm",
    baseAudioPath: "C:/Users/luke/Desktop/input/March_audio.webm",
    overlay: "C:/Users/luke/Desktop/input/scene1.mp4",
    outputPath: "C:/Users/luke/Desktop/output.mp4",
  };
  const process = await processVideo(files);
  response.json({ process });
});

module.exports = { router };
