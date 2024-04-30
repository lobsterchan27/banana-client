const express = require('express');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const { jsonParser } = require('./common');
const { forwardFetchResponse, convertImagesToBase64, checkRequestBody, loadJson } = require('./utils');
const fs = require('fs').promises;


const router = express.Router();

async function someFunction(key, text) {
    // Your function logic here
    console.log(`Key: ${key}, Text: ${text}`);
}

/**
 * Makes request with image and prompt context.
 * the request body should contain the base folder name of the images and the json.
 * @param {Object} request - The request object.
 * @param {String} request.body.api_server - The API server to use for text generation.
 * @param {String} request.body.filename - The base folder name of the images and the json.
 */
router.post('/generate/context', jsonParser, checkRequestBody, async function (request, response_generate) {
    console.log('Received Kobold context generation request:', request.body);
    const fileName = request.body.filename;
    const json = await loadJson(`public/context/${fileName}/${fileName}.json`);
    for (let key in json) {
        const imagefile = json[key];
        const concatenatedText = textArray.map(item => item.text).join(' ');
        await someFunction(key, concatenatedText);
    }
});

async function makeRequest(prompt, images, settings, controller) {
    const payload = {
        "prompt": prompt,
        "temperature": 0.5,
        "top_p": 0.9,
        "max_length": 200,
        ...request.body,
    };

    payload.images = await convertImagesToBase64(request.body.images);

    const args = {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
    };

    let streaming = true;
    if (settings.streaming !== undefined) {
        streaming = settings.streaming;
    }
    try {
        const url = `${settings.api_server}/extra/generate/stream`
        const response = await fetch(url, { method: 'POST', timeout: 0, ...args });
        if (streaming) {
            // Pipe remote SSE stream to Express response
            forwardFetchResponse(response, response_generate);
            return;
        } else {
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`Kobold returned error: ${response.status} ${response.statusText} ${errorText}`);

                try {
                    const errorJson = JSON.parse(errorText);
                    const message = errorJson?.detail?.msg || errorText;
                    return response_generate.status(400).send({ error: { message } });
                } catch {
                    return response_generate.status(400).send({ error: { message: errorText } });
                }
            }

            const data = await response.json();
            console.log('Endpoint response:', data);
            return response_generate.send(data);
        }
    } catch (error) {
        switch (error?.status) {
            case 403:
            case 503: // retry in case of temporary service issue, possibly caused by a queue failure?
                console.debug(`KoboldAI is busy. Retry attempt ${i + 1} of ${MAX_RETRIES}...`);
                await delay(delayAmount);
                break;
            default:
                if ('status' in error) {
                    console.log('Status Code from Kobold:', error.status);
                }
                return response_generate.send({ error: true });
        }
    }
}

router.post('/generate', jsonParser, checkRequestBody, async function (request, response_generate) {
    console.log('Received Kobold generation request:', request.body);
    const controller = createAbortController(request, response_generate);
    await makeRequest(request.body.prompt, request.body.images, request.body.settings, response_generate, controller);
});

module.exports = { router };