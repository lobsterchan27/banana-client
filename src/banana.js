const express = require('express');
const fetch = require('node-fetch').default;
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const { jsonParser } = require('./common');
const { fetchTTS, checkRequestBody } = require('./utils');
const Busboy = require('busboy');

const router = express.Router();

/**
 * Transcribes the audio from video at the provided URL.
 * Currently supports youtube.
 * @param {string} url - The URL of the video to transcribe.
 * @param {string} language - The language of the video.
 * @param {boolean} text2speech - Whether to convert the transcription to speech.
 * @param {number} segment_length - The length of each segment in seconds.
 * @param {boolean} translate - Whether to translate the transcription.
 * @param {boolean} get_video - Whether to download the video.
 * @returns {String} The savepath of the json and corresponding storyboards. 
 * The json(savepath/savepath.json) uses the image as the index with array of the corresponding transcription.
 */
router.post('/transcribe/url', jsonParser, checkRequestBody, async function (request, response) {
    console.log('Transcribing URL:', request.body);
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
            const base_filename = fetchResponse.headers.get('Base-Filename');
            const saveFolder = path.join('public', 'context', base_filename);

            busboy.on('file', function (fieldname, file, info) {
                console.log('File [' + fieldname + ']: filename: ' + info.filename + ', encoding: ' + info.encoding + ', mimetype: ' + info.mimeType);
                
                
                if (!fs.existsSync(saveFolder)){
                    fs.mkdirSync(saveFolder, { recursive: true });
                }
                
                const saveTo = path.join(saveFolder, info.filename);
                file.pipe(fs.createWriteStream(saveTo));
                
                file.on('data', function (data) {
                    console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
                });
                file.on('end', function () {
                    console.log('File [' + fieldname + '] Finished');
                });
            });
            
            const combinedData = {};
            busboy.on('field', function (fieldname, val, info) {
                console.log('Field [' + fieldname + ']: ' + val);
                const data = JSON.parse(val);
                for (let key in data) {
                    if (combinedData[key]) {
                        combinedData[key] = combinedData[key].concat(data[key]);
                    } else {
                        combinedData[key] = data[key];
                    }
                }
            });
            
            busboy.on('close', async function () {
                console.log('Done parsing form!');
                const saveTo = path.join(saveFolder, fetchResponse.headers.get('Base-Filename') + '.json');
                
                try {
                  await fs.promises.writeFile(saveTo, JSON.stringify(combinedData, null, 2));
                  response.json({ folderPath: base_filename });
                } catch (error) {
                  console.error('Error:', error);
                  response.status(500).send('An error occurred');
                }
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

module.exports = { router };