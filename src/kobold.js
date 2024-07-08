const express = require('express');
const path = require('path');
const fetch = require('node-fetch').default;
const { jsonParser, checkRequestBody } = require('./common');
const LLMHandler = require('./llmHandler');
const {
    getJson,
    createAbortController,
    delay,
    forwardFetchResponse,
    convertImagesToBase64,
    loadJson,
} = require('./utils');
const fs = require('fs');
const { PROJECT_ROOT } = require('../settings');


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
    console.log('Received context generation request:', request.body);
    const folderName = request.body.context;
    const folderPath = path.join('public', 'context', folderName);
    const jsonPath = await getJson(folderPath);
    const videoJsonPath = await getJson(folderPath, true);
    let json, videoJson, llmHandler;

    try {
        json = await loadJson(jsonPath);
        videoJson = await loadJson(videoJsonPath);
        // Load templates and character card
        const contextTemplate = await loadJson(path.join(PROJECT_ROOT, 'public', 'templates', 'context', 'ul.json'));
        const instructTemplate = await loadJson(path.join(PROJECT_ROOT, 'public', 'templates', 'instruct', 'ul.json'));
        const characterCard = await loadJson(path.join(PROJECT_ROOT, 'public', 'Characters', 'alice.json'));

        console.log('title is: ' + videoJson.title);
        console.log('description is: ' + videoJson.description);
        console.log('category is: ' + videoJson.categories);

        const config = {
            user: 'Video Audio',
            videoJson: videoJson,
            contextTemplate: contextTemplate,
            instructTemplate: instructTemplate,
            characterCard: characterCard,
            settings: request.body.settings
        };
        config.settings.max_length = 80;

        llmHandler = new LLMHandler(config);
        llmHandler.setDynamicPrompt(`[System: The image corresponds to the transcribed video audio below. Write a brief 2 to 3 sentence response to the video and audio. Use the character sheet and example dialogue for formatting direction and character speech patterns.]`, 0);
    } catch (err) {
        console.error(`Failed to load JSON or initialize LLMHandler: ${err}`);
        return response.status(500).json({ error: 'Failed to load JSON or initialize LLMHandler' });
    }

    for (let index = 0; index < json.data.length; index++) {
        const key = json.data[index];
        const imagefile = key.imagename;
        let concatenatedText = key.segments.map(segment => segment.text).join(' ');

        if (index === json.data.length - 1) {
            llmHandler.setDynamicPrompt(`[System: This is the last part of the video. Let's give our viewers a good closer. Use the character sheet and example dialogue for formatting direction and character speech patterns.]`, 0);
            llmHandler.settings.max_length = 200;
        }

        try {
            const imageLocation = path.join(folderPath, imagefile);
            const generatedResponse = await llmHandler.generateResponse(concatenatedText, imageLocation, index === json.data.length - 1);
            key.generatedResponse = generatedResponse;
        } catch (error) {
            console.error('Error occurred during request:', error);
            return response.status(error.status || 500).send({ error: error.error || { message: 'An error occurred' } });
        }
    }

    await fs.promises.writeFile(jsonPath, JSON.stringify(json, null, 2));
    console.log('Text generation completed successfully. Results saved to json.');
    response.json({ done: true, message: 'Text generation completed successfully. Results saved to json.', json: jsonPath });
});


/**
 * Generates text from a prompt.
 * @param {Object} request - The request object.
 * @param {String} request.body.prompt - The prompt to use for text generation.
 * @param {String[]} request.body.images - The filepath to images to use for text generation. Uses banana-client as working directory.
 * @param {String[]} request.body.base64images - The base64 encoded images to use for text generation.
 * @param {Object} request.body.settings - The settings to use for text generation.
 * @param {String} request.body.settings.api_server - The API server to use for text generation.
 * @param {Boolean} request.body.settings.streaming - Whether to stream the response.
 */
router.post('/generate', jsonParser, checkRequestBody, async function (request, response) {
    const { images: imagepaths, base64images, ...restOfBody } = request.body;
    console.log('Received Kobold generation request:', {
        ...restOfBody,
        images: imagepaths ? '[Images]' : undefined,
        base64images: base64images ? '[Base64 Images]' : undefined
    });

    const controller = createAbortController(request, response);

    const images = imagepaths ? convertImagesToBase64(imagepaths) : base64images;

    const prompt = request.body.prompt.replace(/\\n/g, '\n');

    try {
        const fetchResponse = await makeRequest(prompt, images, request.body.settings, controller);
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
        "max_length": settings.max_length,
        "max_context_length": settings.max_context_length,
        "temperature": settings.temperature,
        "top_k": settings.top_k,
        "top_p": settings.top_p,
        "typical": settings.typical,
        "min_p": settings.min_p,
        "top_a": settings.top_a,
        "tfs": settings.tfs,
        "rep_pen": settings.rep_pen,
        "rep_pen_range": settings.rep_pen_range,
        "sampler_order": [6, 0, 1, 3, 4, 2, 5],
        "stop_sequence": settings.stop_sequence,
    };

    if (images && images.length > 0) {
        payload.images = images;
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
                const errorText = await fetchResponse.text();
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