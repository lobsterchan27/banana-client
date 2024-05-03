const express = require('express');
const path = require('path');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const { jsonParser, checkRequestBody } = require('./common');
const {
    createAbortController,
    delay,
    forwardFetchResponse,
    convertImagesToBase64,
    loadJson,
    handleStream,
} = require('./utils');
const fs = require('fs');


const router = express.Router();

/**
 * Makes a request with image and prompt context.
 * The request body should contain the base folder name of the images and the JSON.
 * @param {Object} request - The request object.
 * @param {String} request.body.context - The base folder name of the images and the JSON.
 * @param {Object} request.body.settings - The settings to use for text generation.
 * @param {String} request.body.settings.api_server - The API server to use for text generation.
 * @param {Boolean} request.body.settings.streaming - Whether to stream the response.
 * @returns {Object} The response object. If the request was successful message or error will be returned.
 */
router.post('/generate/context', jsonParser, checkRequestBody, async function (request, response) {
    console.log('Received Kobold context generation request:', request.body);
    const fileName = request.body.context;

    let json;
    try {
        json = await loadJson(`public/context/${fileName}/${fileName}.json`);
    } catch (err) {
        console.error(`Failed to load JSON: ${err}`);
        return response.status(500).json({ error: 'Failed to load JSON' });
    }

    const controller = createAbortController(request, response);
    for (let key in json) {
        if (json[key].hasOwnProperty('generatedResponse')) {
            console.log(`Skipping ${json[key].filename} because a response has already been generated.`);
            continue;
        }
        const imagefile = json[key].filename;
        const concatenatedText = json[key].segments.map(segment => segment.text).join(' ');
        console.log(`Generating text for ${imagefile} with prompt: ${concatenatedText}\n`);
        const imageLocation = path.join('public', 'context', fileName, imagefile);
        try {
            const fetchResponse = await makeRequest(concatenatedText, [imageLocation], request.body.settings, controller);
            if (request.body.settings.streaming) {
                const data = await handleStream(fetchResponse, response);
                json[key].generatedResponse = data;
            } else {
                const fullResponse = await fetchResponse.json();
                const data = fullResponse.results[0].text;
                console.log('Response:', data);
                json[key].generatedResponse = data;
            }
        } catch (error) {
            console.error('Error occurred during request:', error);
            return response.status(error.status || 500).send({ error: error.error || { message: 'An error occurred' } });
        }
    }
    await fs.promises.writeFile(`public/context/${fileName}/${fileName}.json`, JSON.stringify(json, null, 2));
    console.log('Text generation completed successfully. Results saved to json.');
    response.json({ done: true, message: 'Text generation completed successfully. Results saved to json.' });
});

/**
 * Generates text from a prompt.
 * @param {Object} request - The request object.
 * @param {String} request.body.prompt - The prompt to use for text generation.
 * @param {String[]} request.body.images - The filepath to images to use for text generation. Uses banana-client as working directory.
 * @param {Object} request.body.settings - The settings to use for text generation.
 * @param {String} request.body.settings.api_server - The API server to use for text generation.
 * @param {Boolean} request.body.settings.streaming - Whether to stream the response.
 */
router.post('/generate', jsonParser, checkRequestBody, async function (request, response) {
    console.log('Received Kobold generation request:', request.body);
    const controller = createAbortController(request, response);
    try {
        const fetchResponse = await makeRequest(request.body.prompt, request.body.images, request.body.settings, controller);
        if (request.body.settings.streaming) {
            forwardFetchResponse(fetchResponse, response);
            return;
        } else {
            const data = await fetchResponse.json();
            return response.send(data);
        }
    } catch (error) {
        console.error('Error occurred during request:', error);
        return response.status(error.status || 500).send({ error: error.error || { message: 'An error occurred' } });
    }
});

/**
 * This function makes a request to the KoboldAI server.
 * 
 * @param {string} prompt - The text prompt to send to the AI.
 * @param {Array<string>} images - An array of image URLs to be converted to Base64 and sent with the request.
 * @param {Object} settings - An object containing settings for the request, such as whether to use streaming and the API server URL.
 * @param {AbortController} controller - An AbortController instance to control the request.
 * 
 * @returns {Promise<Response>} - Returns a Promise that resolves to the Response object from the fetch request.
 * 
 * @throws {Object} - Throws an object with status and error message if the request fails or if maximum retries are exceeded.
 */
async function makeRequest(prompt, images, settings, controller) {
    const payload = {
        "prompt": prompt,
        "temperature": 0.5,
        "top_p": 0.9,
        "max_length": 200,
    };

    if (images && images.length > 0) {
        payload.images = await convertImagesToBase64(images);
    }

    const args = {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
    };

    const delayAmount = 2500;
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const url = settings.streaming ? `${settings.api_server}/extra/generate/stream` : `${settings.api_server}/v1/generate`;
            const fetchResponse = await fetch(url, { method: 'POST', timeout: 0, ...args });
            if (!fetchResponse.ok) {
                const errorText = await response.text();
                console.log(`Kobold returned error: ${fetchResponse.status} ${fetchResponse.statusText} ${errorText}`);

                try {
                    const errorJson = JSON.parse(errorText);
                    const message = errorJson?.detail?.msg || errorText;
                    throw { status: 400, error: { message } };
                } catch {
                    throw { status: 400, error: { message: errorText } };
                }
            }
            return fetchResponse;
        } catch (error) {
            switch (error?.status) {
                case 403:
                case 503: // retry in case of temporary service issue, possibly caused by a queue failure?
                    console.debug(`KoboldAI is busy. Retry attempt ${i + 1} of ${MAX_RETRIES}...`);
                    await delay(delayAmount)
                    break;
                default:
                    console.error('Error sending request:', error);
                    throw { status: 500, error: { message: error.message } };
            }
        }
    }
    console.log('Max retries exceeded. Giving up.');
    throw { status: 500, error: { message: 'Max retries exceeded' } };
}

module.exports = { router };