const express = require('express');

const { audioSilenceStitch } = require('./audioSilenceStitch');

const router = express.Router();

router.get('/silence-stitch', async function (request, response) {
    console.log('Silence Stitching:');
    const savepath = await audioSilenceStitch();
    response.json({ savepath });
});

module.exports = { router };