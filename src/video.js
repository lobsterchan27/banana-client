const express = require("express");
const path = require("path");
const { processVideo } = require("./processVideo");
const { jsonParser } = require("./common");
const { loadJson, getJson } = require("./utils");
const { generateASS } = require("./subtitles");
const fs = require("fs");

const { PROJECT_ROOT } = require("../settings");

const router = express.Router();

router.post('/generate/subs', jsonParser, async function (req, res) {
  const { contextName } = req.body;
  const contextPath = path.join("public", "context", contextName);
  const jsonPath = await getJson(contextPath);
  const outputPath = path.join(contextPath, `${contextName}.ass`);
  const data = await loadJson(jsonPath);

  const subtitles = Object.values(data)
    .map(item => Object.values(item.subs))
    .reduce((acc, val) => acc.concat(val), []);

  const assContent = generateASS(subtitles);
    
    // Write ASS content to a file
    fs.writeFile(outputPath, assContent, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        res.status(500).send({ message: 'Error generating subtitles' });
      } else {
        console.log('Successfully wrote to file.');
        res.send({ message: 'Subtitles generated' });
      }
    });
  });

router.post("/processvideo", async function (request, response) {
  const contextName = await request.body.contextName;
  const contextPath = path.join(PROJECT_ROOT, "public", "context", contextName);

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

router.post("/live2d"), jsonParser, async function(request, response) {


}

async function live2d(audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Path to your C++ executable
    const exePath = path.resolve(PROJECT_ROOT, 'live2d', 'live2d.exe');

    // Command-line arguments for the C++ executable
    const args = [audioPath, outputPath];

    // Execute the C++ program
    execFile(exePath, args, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing C++ program:', error);
        reject(error);
        return;
      }
      if (stderr) {
        console.error('C++ program stderr:', stderr);
      }
      console.log('C++ program stdout:', stdout);
      resolve(outputPath);
    });
  });
}

module.exports = { router };
