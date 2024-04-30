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

router.post('/generate', jsonParser, checkRequestBody, async function (request, response_generate) {
    console.log('Received Kobold generation request:', request.body);
    const request_prompt = request.body.prompt;
    const controller = new AbortController();
    request.socket.removeAllListeners('close');
    request.socket.on('close', async function () {
        if (request.body.can_abort && !response_generate.writableEnded) {
            try {
                console.log('Aborting Kobold generation...');
                // send abort signal to koboldcpp
                const abortResponse = await fetch(`${request.body.api_server}/extra/abort`, {
                    method: 'POST',
                });

                if (!abortResponse.ok) {
                    console.log('Error sending abort request to Kobold:', abortResponse.status);
                }
            } catch (error) {
                console.log(error);
            }
        }
        controller.abort();
    });

    const payload = {
        "prompt": request_prompt,
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
    if (request.body.streaming !== undefined) {
        streaming = request.body.streaming;
    }
    try {
        const url = `${request.body.api_server}/extra/generate/stream`
        console.log(url)
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
});

module.exports = { router };