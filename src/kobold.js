const express = require('express');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const { jsonParser } = require('./common');
const { 
    createAbortController,
    delay,
    forwardFetchResponse,
    convertImagesToBase64,
    checkRequestBody,
    loadJson,
    handleStream, 
} = require('./utils');
const fs = require('fs').promises;


const router = express.Router();

/**
 * Makes request with image and prompt context.
 * the request body should contain the base folder name of the images and the json.
 * @param {Object} request - The request object.
 * @param {String} request.body.filename - The base folder name of the images and the json.
 * @param {Object} request.body.settings - The settings to use for text generation.
 * @param {String} request.body.settings.api_server - The API server to use for text generation.
 */
router.post('/generate/context', jsonParser, checkRequestBody, async function (request, response_generate) {
    console.log('Received Kobold context generation request:', request.body);
    const fileName = request.body.filename;
    const json = await loadJson(`public/context/${fileName}/${fileName}.json`);
    for (let key in json) {
        const imagefile = json[key];
        const concatenatedText = textArray.map(item => item.text).join(' ');
        await makeRequest(concatenatedText, [imagefile], request.body.settings, response_generate);
    }
});

/**
 * Generates text from a prompt.
 * @param {Object} request - The request object.
 * @param {String} request.body.prompt - The prompt to use for text generation.
 * @param {String[]} request.body.images - The filepath to images to use for text generation. Uses banana-client as working directory.
 * @param {Object} request.body.settings - The settings to use for text generation.
 * @param {String} request.body.settings.api_server - The API server to use for text generation.
 */
router.post('/generate', jsonParser, checkRequestBody, async function (request, response_generate) {
    console.log('Received Kobold generation request:', request.body);
    const controller = createAbortController(request, response_generate);
    try {
        const response = await makeRequest(request.body.prompt, request.body.images, request.body.settings, response_generate, controller);
        handleStream(response, response_generate);
    } catch (error) {
        console.error('Error occurred during request:', error);
        response_generate.status(error.status || 500).send({ error: error.error || { message: 'An error occurred' } });
    }
});


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
            const url = `${settings.api_server}/extra/generate/stream`
            const response = await fetch(url, { method: 'POST', timeout: 0, ...args });
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`Kobold returned error: ${response.status} ${response.statusText} ${errorText}`);

                try {
                    const errorJson = JSON.parse(errorText);
                    const message = errorJson?.detail?.msg || errorText;
                    throw { status: 400, error: { message } };
                } catch {
                    throw { status: 400, error: { message: errorText } };
                }
            }
            return response;
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