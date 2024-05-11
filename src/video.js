const express = require("express");
const path = require("path");
const { processVideo } = require("./processVideo");

const router = express.Router();

router.post("/processVideo", async function (request, response) {
  const contextName = request.body.contextName;
  const contextPath = path.join(process.cwd(), "public", "context", contextName);

  console.log("Processing Video:");
  const files = {
    baseVideoPath: `${contextPath}/${contextName}_video.mp4`,
    baseAudioPath: `${contextPath}/${contextName}.webm`,
    overlay: `${contextPath}/Scene.mp4`,
    outputPath: `${contextPath}/output.mp4`,
  };
  const outputVideo = await processVideo(files);
  response.json({ outputVideo });
});

module.exports = { router };
