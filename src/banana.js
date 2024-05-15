const express = require('express');
const fetch = require('node-fetch').default;
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { jsonParser, checkRequestBody } = require('./common');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { requestTTS, loadJson } = require('./utils');
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

            busboy.on('file', async function (fieldname, file, info) {
                console.log('File [' + fieldname + ']: filename: ' + info.filename + ', encoding: ' + info.encoding + ', mimetype: ' + info.mimeType);

                fs.mkdirSync(saveFolder, { recursive: true });
                const saveTo = path.join(saveFolder, info.filename);
                file.pipe(fs.createWriteStream(saveTo));

                file.on('data', function (data) {
                    // console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
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
                    return response.status(500).send('An error occurred');
                }
            });

        }
    } catch (error) {
        console.error('Error:', error);
        const status = error.status || 500;
        return response.status(status).send(`An error occurred with status code: ${status}`);
    }
});

/**
 * This function handles POST requests to the '/text2speech' endpoint.
 * 
 * @param {Object} request - The request object, expected to contain a body with 'api_server', 'prompt', and optionally 'voice'.
 * @param {string} request.body.prompt - The text to convert to speech.
 * @param {string} request.body.voice - The voice to use for the speech.
 * @param {Object} request.body.settings - The settings to use for text to speech.
 * @param {string} request.body.settings.api_server - The API server to use for text to speech.
 */
router.post('/text2speech', jsonParser, checkRequestBody, async function (request, response) {
    console.log('Received TTS request:', request.body);
    try {
        const fetchResponse = await requestTTS(request.body.prompt, request.body.voice, request.body.settings, '/text2speech');
        

        const saveFolder = path.join('public', 'tts');
        fs.mkdirSync(saveFolder, { recursive: true });

        if (!request.body.voice) {
            request.body.voice = 'reference';
        }
        const filePath = path.join(saveFolder, `${request.body.voice}_${Date.now()}.wav`).replace(/\\/g, '/');

        const streamPipeline = promisify(pipeline);
        await streamPipeline(fetchResponse.body, fs.createWriteStream(filePath));

        console.log('The file has been saved!');
        return response.status(200).json({ message: 'TTS Complete', filepath: filePath });
    } catch (error) {
        console.error('Error:', error);
        const status = error.status || 500;
        return response.status(status).send(`An error occurred with status code: ${status}`);
    }
});

/**
 * This function handles POST requests to the '/text2speech/' endpoint.
 * 
 * @param {Object} request - The request object, expected to contain a body with 'api_server', 'prompt', and optionally 'voice'.
 * @param {string} request.body.context - The foldername containing the JSON and other related context files.
 * @param {string} request.body.voice - The voice to use for the speech.
 * @param {Object} request.body.settings - The settings to use for text to speech.
 * @param {string} request.body.settings.api_server - The API server to use for text to speech.
 */
router.post('/text2speech/context', jsonParser, async function (request, response) {
    const url = request.body.settings.api_server + '/text2speech/align';
    console.log('Received context TTS request:', request.body);
    const fileName = request.body.context;
    const filePath = `public/context/${fileName}/${fileName}.json`;

    let json;
    try {
        json = await fs.promises.readFile(filePath, 'utf8');
        json = JSON.parse(json);
    } catch (err) {
        console.error(`Failed to load JSON: ${err}`);
        return response.status(500).json({ error: 'Failed to load JSON' });
    }

    try {
        for (let key in json) {
            if (!json[key].hasOwnProperty('generatedResponse')) {
                console.log('generatedResponse does not exist in the JSON');
                return response.status(400).json({ error: 'generatedResponse does not exist in the JSON' });
            }

            const payload = {
                prompt: json[key].generatedResponse,
                voice: request.body.voice,
            };
            const fetchResponse = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!fetchResponse.ok) {
                throw new Error(`HTTP error ${fetchResponse.status}`);
            }

            const contentType = fetchResponse.headers.get('content-type');
            console.log('Received headers:', fetchResponse.headers);

            if (contentType && contentType.includes('multipart/form-data')) {
                const busboy = Busboy({ headers: { 'content-type': contentType } });
                fetchResponse.body.pipe(busboy);
                const saveFolder = path.join('public', 'context', fileName);

                busboy.on('file', function (fieldname, file, info) {
                    console.log('File [' + fieldname + ']: filename: ' + info.filename + ', encoding: ' + info.encoding + ', mimetype: ' + info.mimeType);
                    const saveTo = path.join(saveFolder, `${fileName}_${key}${path.extname(info.filename)}`);
                    file.on('data', function (data) {
                        console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
                    });

                    file.on('end', function () {
                        console.log('File [' + fieldname + '] Finished');
                    });

                    file.pipe(fs.createWriteStream(saveTo));
                });

                busboy.on('field', function (fieldname, val, info) {
                    console.log('Got ' + fieldname + '. Parsing to JSON');
                    const newData = JSON.parse(val);
                    for (let subKey in newData) {
                        if (!json[key].subs) {
                            json[key].subs = {};
                        }
                        json[key].subs[subKey] = newData[subKey];
                    }
                });

                await new Promise((resolve, reject) => {
                    busboy.on('close', () => {
                        console.log(key + ' of ' + json.length + ' done.');
                        resolve();
                    });
                    busboy.on('error', (err) => {
                        console.log('Error occurred: ', err);
                        reject(err);
                    });
                });
            }
        }

        // Write back the modified JSON to the original file after all modifications
        await fs.promises.writeFile(filePath, JSON.stringify(json, null, 2));
        console.log('Updated JSON saved.');
        response.status(200).json({ message: 'TTS Complete', filepath: fileName });
    } catch (error) {
        console.error('Error during processing:', error);
        response.status(500).send('An error occurred');
    }
});

module.exports = { router };