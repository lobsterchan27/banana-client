const express = require('express');
const { jsonParser } = require('./common');

const audioSilenceStitch = require('./audioSilenceStitch');

const router = express.Router();

router.post('/generate/final', jsonParser, async function (request, response) {
    console.log('Silence Stitching:');
    const contextName = request.body.contextName;
    console.log(contextName);
    const savepath = await audioSilenceStitch(contextName);
    response.json({ savepath });
});

module.exports = { router };