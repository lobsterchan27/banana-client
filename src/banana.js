const express = require('express');
const fetch = require('node-fetch').default;
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { jsonParser } = require('./common');
const Busboy = require('busboy');

const router = express.Router();

async function fetchTTS(url, payload) {
    const fetchResponse = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    });

    const data = await fetchResponse.buffer();
    const filepath = path.join(__dirname, 'public/tts', `audio_${Date.now()}.wav`)

    fs.writeFile(filepath, data, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });

    return filepath;
}

/**
 * Transcribes the audio from video at the provided URL.
 * Currently supports youtube.
 * Streaming response.
 * @param {string} url - The URL of the video to transcribe.
 * @param {string} language - The language of the video.
 * @param {boolean} text2speech - Whether to convert the transcription to speech.
 * @param {number} segment_length - The length of each segment in seconds.
 * @param {boolean} translate - Whether to translate the transcription.
 * @param {boolean} get_video - Whether to download the video.
 */
router.post('/transcribe/url', jsonParser, async function (request, response) {
    console.log('Transcribing URL:', request.body);
    if (!request.body) return response.sendStatus(400);

    if (request.body.api_server.indexOf('localhost') != -1) {
        request.body.api_server = request.body.api_server.replace('localhost', '127.0.0.1');
    }

    const url = request.body.api_server + '/transcribe/url';
    const form = new FormData();
    const fields = ['url', 'language', 'text2speech', 'segment_length', 'scene_threshold', 'minimum_interval', 'fixed_interval', 'translate', 'get_video'];
    fields.forEach(field => {
        if (request.body[field] !== null && request.body[field] !== undefined) {
            form.append(field, request.body[field]);
        }
    });

    try {
        const fetchResponse = await fetch(url, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (!fetchResponse.ok) {
            throw new Error(`HTTP error ${fetchResponse.status}`);
        }

        const contentType = fetchResponse.headers.get('content-type');
        console.log('Received headers:', fetchResponse.headers);

        if (contentType && contentType.includes('multipart/form-data')) {
            const busboy = Busboy({ headers: { 'content-type': contentType } });
            fetchResponse.body.pipe(busboy);

            busboy.on('file', function (fieldname, file, info) {
                console.log('File [' + fieldname + ']: filename: ' + info.filename + ', encoding: ' + info.encoding + ', mimetype: ' + info.mimeType);
                const saveTo = path.join(process.cwd(), info.filename);
                file.pipe(fs.createWriteStream(saveTo));
                file.on('data', function (data) {
                    console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
                });
                file.on('end', function () {
                    console.log('File [' + fieldname + '] Finished');
                });
            });
            
            busboy.on('field', function (fieldname, val, info) {
                console.log('Field [' + fieldname + ']: value: ' + val);
            });
            
            busboy.on('close', function () {
                console.log('Done parsing form!');
            });
        }
    } catch (error) {
        console.error('Error:', error);
        response.status(500).send('An error occurred');
    }
});

router.post('/text2speech', jsonParser, async function (request, response) {
    if (!request.body) return response.sendStatus(400);

    if (request.body.api_server.indexOf('localhost') != -1) {
        request.body.api_server = request.body.api_server.replace('localhost', '127.0.0.1');
    }

    const url = request.body.api_server + '/text2speech';
    const payload = {
        'prompt': request.body.prompt,
        'voice': request.body.voice || 'reference'
    }

    try {
        const filename = await fetchTTS(url, payload);
        response.status(200).json({ message: 'Transcription complete', filename: filename });
    } catch (error) {
        console.error('Error:', error);
        response.status(500).send('An error occurred');
    }
});

module.exports = { router, fetchTTS };