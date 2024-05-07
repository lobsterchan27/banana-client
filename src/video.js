const express = require('express');

const { processVideo } = require('./processVideo');

const router = express.Router();

router.get('/processVideo', async function (request, response) {
    console.log('Processing Video:');
    const files = {
        baseVideoPath: 'C:/Users/luke/Desktop/input/March_video.webm',
        overlays: [
            { path: 'C:/Users/luke/Desktop/input/Scene1.mp4', duration: 8 },
            { path: 'C:/Users/luke/Desktop/input/Scene2.mp4', duration: 10 },
        ],
        outputPath: 'C:/Users/luke/Desktop/output.mp4'
    };
    const process = await processVideo(files);
    response.json({ process });
});

module.exports = { router };