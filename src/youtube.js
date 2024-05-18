const express = require('express');
const path = require('path');
const { jsonParser } = require('./common');
const { PROJECT_ROOT, YT_DLP_BINARY_PATH } = require("../settings");
const fs = require('fs');

const YTDlpWrap = require('yt-dlp-wrap').default;
const ytDlpWrap = new YTDlpWrap('D:\\Cool\\banana-client\\bin\\yt-dlp');

const router = express.Router();

router.post('/download', jsonParser, async function (request, response) {
    const url = request.body.url;
    const outputPath = 'public/context/%(title)s/%(title)s.%(ext)s';
    // Configure yt-dlp options
    const options = [
        url,
        '-f', 'bestvideo',
        '-o', outputPath,
        '--restrict-filenames',
        '--write-info-json',
        '--no-overwrites'
    ];

    // Execute download
    try {
        const result = await ytDlpWrap.execPromise(options);
        console.log(result);

        const downloadedFile = parseFilenameFromResult(result);
        console.log('Downloaded file:', downloadedFile);

        response.json({ filename: downloadedFile });
    } catch (error) {
        console.error('Download failed:', error);
        response.status(500).send('Download failed');
    }
});

function parseFilenameFromResult(result) {
    let destinationLine = result.split('\n').find(line => line.includes('[download] Destination:'));
    
    if (!destinationLine) {
        destinationLine = result.split('\n').find(line => line.includes('has already been downloaded'));
    }

    if (destinationLine) {
        const parts = destinationLine.split(' ');
        return parts.slice(1, parts.length - 5).join(' ').trim();
    }

    return null;
}



module.exports = { router };