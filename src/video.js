const express = require("express");
const path = require("path");
const { processVideo } = require("./processVideo");
const { jsonParser } = require("./common");
const { generateASS, loadJson } = require("./utils");
const fs = require("fs");

const router = express.Router();

router.post('/generate/ass', jsonParser, async function (req, res) {
  const contextName = req.body.contextName;
  const contextPath = path.join(process.cwd(), "public", "context", contextName);
  const jsonPath = path.join(contextPath, `${contextName}.json`);
  const outputPath = path.join(contextPath, `${contextName}.ass`);
  const data = await loadJson(jsonPath);

  const subtitles = Object.values(data)
    .map(item => Object.values(item.subs))
    .reduce((acc, val) => acc.concat(val), []);

  console.log(subtitles)

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

router.post("/processVideo", async function (request, response) {
  const contextName = await request.body.contextName;
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
