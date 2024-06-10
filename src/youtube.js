const express = require('express');
const path = require('path');
const { jsonParser } = require('./common');
const { PROJECT_ROOT, YT_DLP_BINARY_PATH } = require("../settings");
const { loadJson, getJson } = require('./utils');
const fs = require('fs');

const YTDlpWrap = require('yt-dlp-wrap').default;
const ytDlpWrap = new YTDlpWrap('D:\\Cool\\banana-client\\bin\\yt-dlp');

const router = express.Router();

router.post('/download', jsonParser, async function (request, response) {
    const url = request.body.url;
    const outputPath = path.join('public', 'context', '%(title)s', '%(title)s.%(ext)s');
    // Configure yt-dlp options
    const options = [
        url,
        '-f', 'bestvideo+bestaudio',
        '-o', outputPath,
        '--restrict-filenames',
        '--write-info-json',
        '--no-overwrites',
        '--merge-output-format', 'mp4'
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

router.post('/download/context', jsonParser, async function (request, response) {
    const contextPath = path.join('public', 'context', request.body.context);
    const jsonPath = await getJson(contextPath, true);
    const json = await loadJson(jsonPath);
    const url = json.webpage_url;
    console.log(jsonPath)
    console.log('Downloading video:', url);
    const outputPath = path.join(contextPath, '%(title)s.%(ext)s');

    const dimension = json.width < json.height ? 'width' : 'height';
    const pixelLimit = 1080;
    const downloadFormat = `bestvideo[${dimension}<=${pixelLimit}]+bestaudio`;
    console.log('Dimension:', dimension, 'Limit:', pixelLimit);

    // Configure yt-dlp options
    const options = [
        '--load-info-json', jsonPath,
        '-f', downloadFormat,
        '-o', outputPath,
        '--restrict-filenames',
        '--no-overwrites',
        '--merge-output-format', 'mp4'
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