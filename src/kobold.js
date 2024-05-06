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
    prepareImage,
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
    const char = 'Rachel'
    const audiolabel = 'Video Audio: '
    const lb = "\n"
    const userToken = '\n\n### Instruction:\n'
    const assistantToken = '\n\n### Response:\n'
    request.body.settings.stop_sequence = ['###']
    const permanentPrompt = `### Instruction:` + lb +
        `Write ${char}'s next reply in a fictional roleplay where ${char} is watching the video and reacting to it. Use the context from both the image and the audio to make comments. Avoid repetition, don't loop.` + lb +
        `The image is a chronological storyboard of frames from the video. Audio transcription will be provided as well.` + lb +
        `Use the provided character sheet and example dialogue for formatting direction and character speech patterns.` + lb + lb +
        `Description of ${char}:` + lb +
        `${char}'s Appearance: Warm, inviting smile that lights up her face.` + lb +
        `Warm, deep brown eyes with long lashes that give a naturally endearing look` + lb +
        `Delicate facial features with a button nose and full, rosy cheeks` + lb +
        `Fair, porcelain skin with a healthy, radiant glow` + lb +
        `Sleek, straight black hair styled in an effortless, shoulder-length cut` + lb +
        `Petite and slender build with a youthful, athletic physique` + lb +
        `Dresses in cute, trendy outfits that are stylish yet comfortable (e.g. oversized sweaters, casual dresses)` + lb +
        `Natural makeup look with a pop of color on the lips` + lb +
        `Carries herself with an aura of confidence and understated sensuality` + lb + lb +
        `${char}'s Personality:` + lb +
        `Exudes a cool, relaxed vibe that puts others at ease` + lb +
        `Speaks in a low, sultry tone that captivates her audience` + lb +
        `Witty and playful, with a mischievous sense of humor` + lb +
        `Unapologetically authentic and comfortable in her own skin` + lb +
        `Passionate about her interests, yet laidback in her approach` + lb +
        `Radiates an effortless grace and poise that draws others in` + lb + lb +
        // `Sultry, Relaxed, Witty, Authentic, Passionate, Graceful, Unapproachable, Confident ,Mysterious`
        `Scenario Backstory:` + lb +
        `${char} is a popular content creator known for her reaction videos. She has a loyal following who love her genuine and engaging personality.` + lb + lb +
        `Scenario: The image is a chronological storyboard of frames from the video. Accompanying audio transcription to the video with be marked with Video Audio:` + lb + lb +
        `Play the role of ${char}. Taking the above information into consideration. Write only ${char}'s dialogue in response to the video and audio.` + lb + lb +
        `### Response:` + lb +
        `${char}: Ok, let's see what we have here. I'm excited to see what's in store for us today!`;

    const history = [];


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

    const keys = Object.keys(json);
    const lastKey = keys[keys.length - 1];

    for (let key in json) {
        // if (json[key].hasOwnProperty('generatedResponse')) {
        //     console.log(`Skipping ${json[key].filename} because a response has already been generated.`);
        //     continue;
        // }

        const imagefile = json[key].filename;

        let concatenatedText = audiolabel + json[key].segments.map(segment => segment.text).join(' ');
        if (key === lastKey) {
            concatenatedText = "System: This is the last part of the video. Let's give our viewers a good closer.\n" + concatenatedText;
        }

        //temp hack full prompt
        history.push({ role: 'user', message: concatenatedText });
        const fullPrompt = permanentPrompt + history.map(item => (item.role === 'user' ? userToken : assistantToken) + item.message) + assistantToken;

        try {
            console.log(`Image: ${imagefile}\nPrompt: ${concatenatedText}\n`);
            const imageLocation = path.join('public', 'context', fileName, imagefile);
            const images = [await prepareImage(imageLocation)];

            const fetchResponse = await makeRequest(fullPrompt, images, request.body.settings, controller);
            if (request.body.settings.streaming) {
                const data = await handleStream(fetchResponse, response);
                json[key].generatedResponse = data;

                // Add the assistant's response to the history
                history.push({ role: 'assistant', message: data });
            } else {
                const fullResponse = await fetchResponse.json();

                //commented out for now
                // const data = fullResponse.results[0].text;

                //temp clean response
                const data = fullResponse.results[0].text.replace(/###/g, '').replace(/\n\n$/g, '').replace(/,/g, '').trim();
                console.log(data);

                json[key].generatedResponse = data;

                // Add the assistant's response to the history
                history.push({ role: 'assistant', message: data });
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
        "temperature": 0.5,
        "top_p": 0.9,
        "max_length": 200,
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