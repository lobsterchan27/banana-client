const express = require("express");
const path = require("path");
const { processVideo } = require("./processVideo");
const { jsonParser } = require("./common");
const { loadJson, getJson } = require("./utils");
const { generateASS } = require("./subtitles");
const { execFile } = require('child_process');

const fs = require("fs");

const { PROJECT_ROOT } = require("../settings");

const router = express.Router();

router.post('/generate/subs', jsonParser, async function (req, res) {
  const { contextName } = req.body;
  const contextPath = path.join("public", "context", contextName);
  const jsonPath = await getJson(contextPath);
  const outputPath = path.join(contextPath, `${contextName}.ass`);
  const json = await loadJson(jsonPath);

  const subtitles = Object.values(json.data)
    .map(item => Object.values(item.subs))
    .reduce((acc, val) => acc.concat(val), []);

  const assContent = generateASS(subtitles);

  // Write ASS content to a file
  try {
    await fs.promises.writeFile(outputPath, assContent, 'utf-8');
    console.log('Successfully wrote to file.');
    res.send({ message: 'Subtitles generated' });
  } catch (err) {
    console.error('Error writing to file:', err);
    res.status(500).send({ message: 'Error generating subtitles' });
  }
});

router.post("/live2d", jsonParser, async function (request, response) {
  console.log(request.body.contextName)
  const contextPath = path.join('public', 'context', request.body.contextName);
  const jsonPath = await getJson(contextPath);
  const json = await loadJson(jsonPath);

  const videoPath = path.join(contextPath, json.original)
  const audioPath = path.join(contextPath, json.overlayAudio)

  await live2d(audioPath, videoPath, "output")
    .then((outputPath) => {
      response.json({ outputPath });
    })
    .catch((error) => {
      response.status(500).send({ error });
    });
});

async function live2d(audioPath, videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    const exePath = path.resolve(PROJECT_ROOT, 'live2d', 'live2d.exe');
    const args = [
      '-a', audioPath,
      '-v', videoPath,
      '-o', outputPath
    ];

    console.log('Executing C++ program:', exePath, args);
    execFile(exePath, args, (error, stdout, stderr) => {
      if (error) {
        // console.error('Error executing C++ program:', error);
        reject(error);
        return;
      }
      if (stderr) {
        // console.error('C++ program stderr:', stderr);
      }
      // console.log('C++ program stdout:', stdout);
      resolve(outputPath);
    });
  });
}

module.exports = { router };