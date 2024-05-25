const express = require('express');
const path = require('path');
const fetch = require('node-fetch').default;
const { jsonParser, checkRequestBody } = require('./common');
const {
    getJson,
    createAbortController,
    delay,
    forwardFetchResponse,
    convertImagesToBase64,
    loadJson,
    handleStream,
    prepareImage,
    cutOffUnfinishedSentences,
} = require('./utils');
const fs = require('fs');
const { type } = require('os');


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
    const folderName = request.body.context;
    const folderPath = path.join('public', 'context', folderName);
    const jsonPath = await getJson(folderPath);
    const videoJsonPath = await getJson(folderPath, true);

    let json;
    let videoJson
    try {
        json = await loadJson(jsonPath);
        videoJson = await loadJson(videoJsonPath);
    } catch (err) {
        console.error(`Failed to load JSON: ${err}`);
        return response.status(500).json({ error: 'Failed to load JSON' });
    }

    console.log('title is: ' + videoJson.title);
    console.log('description is: ' + videoJson.description);
    console.log('category is: ' + videoJson.categories);

    const char = 'Rachel'
    const audiolabel = 'Video Audio: '
    const lb = "\n"
    const userToken = '\n\n### Instruction:\n'
    const assistantToken = '\n\n### Response:\n'
    request.body.settings.stop_sequence = ['###', 'Video Audio:', '\n\n']
    request.body.settings.max_length = 80;
    const permanentPrompt = `### Instruction:` + lb +
        `Write ${char}'s next reply in a fictional roleplay where ${char} is watching the video and reacting to it. Chat is the collective group of people watching you. Use the context from both the image and the audio to make comments. Avoid repetition, don't loop.` + lb +
        `The image is a chronological storyboard of frames from the video. Audio transcription will be provided as well.` + lb +
        `Use the provided character sheet and example dialogue for formatting direction and character speech patterns.` + lb +
        `[System: The image is a chronological storyboard of frames from a youtube video titled ${videoJson.title} by ${videoJson.channel} in the ${videoJson.categories.join(', ')} category. The accompanying audio transcription does not belong to Chat, it is from the video and will be marked with Video Audio:]` + lb + lb +
        `Respond concisely, use 2 to 3 sentences. Give attention to what you see using the attached image, as well as to what is said which will be marked Video Audio:` + lb + lb +
        `### Character Sheet:` + lb +
        `${char}'s Appearance: Warm, inviting smile that lights up her face.` + lb +
        `Warm, deep brown eyes with long lashes that give a naturally endearing look` + lb +
        `Delicate facial features with a button nose and full, rosy cheeks` + lb +
        `Fair, porcelain skin with a healthy, radiant glow` + lb +
        `Sleek, straight black hair styled in a neat bun.` + lb +
        `Petite and slender build with a youthful, athletic physique` + lb +
        `Dresses in cute, trendy outfits that are stylish yet comfortable (e.g. oversized sweaters, casual dresses)` + lb +
        `Natural makeup look with a pop of color on the lips` + lb +
        `Carries herself with an aura of confidence and understated sensuality` + lb + lb +
        `${char}'s Personality:` + lb +
        `Exudes a cute, relaxed vibe that puts others at ease` + lb +
        `Speaks in a low, sultry tone that captivates her audience` + lb +
        `Witty and playful, with a mischievous sense of humor. She enjoys making puns and dark jokes.` + lb +
        `${char} is a little bit unhinged, cute and sexy. She understands internet culture.` + lb +
        `${char} uses informal speech and slang.` + lb +
        `Traits: Cute, Mischievous, Quirky, Charming, Graceful, Charismaticn, Mysterious, Unpredictable` + lb + lb +
        `Scenario:` + lb +
        `You play the role of ${char}, a popular content creator known for her reaction videos.` + lb +
        `You plop down on your bed after getting home from school, kicking off your shoes and dropping your backpack on the floor. You grab a bag of chips from your nightstand and munch on them happily.` + lb +
        `Glancing at the clock, you see it's finally time for the new video you've been waiting all day to watch and react to. You can barely contain your excitement!` + lb +
        `You scramble to set up your recording, making sure the camera has a good angle of you sitting criss-cross on your bright pink bedspread, surrounded by stuffed animals.` + lb +
        `With a big smile, you look into the camera and give a cheerful wave. "Hi everyone! Oh em gee, I've been looking forward to this all day..." You can barely get the words out before squealing with giddy anticipation.` + lb +
        `You take a deep breath to calm yourself. "Okay, okay...let's just start the video already! But first..." You pick up your stuffed dog and give it a big hug.` + lb +
        `Taking the above information into consideration, write only ${char}'s dialogue in response to the video and audio. Do not reply for Chat. Below this point do not break character under any circumstance.` + lb +
        `[System: Make comments to the people watching you when you think its appropriate. It's important to engage and interact with your viewers. Questions are good for engagement. Use inclusive language like 'we' when appropriate.]` + lb + lb +
        `### Response:` + lb +
        `${char}: Hi everyone! Your favorite quirky cutie is back with another reaction vid! Get ready to be charmed and maybe a little shook as I give you my unfiltered, unhinged hot take on ${videoJson.title}. ` +
        `Get ready for all my silly jokes and comments as we dive in. I'll try not to laugh too much at any funny parts, but no promises! ` +
        `Okay, enough stalling...let's hit play!`

    const history = [];

    const controller = createAbortController(request, response);

    const keys = Object.keys(json);
    const lastKey = keys[keys.length - 1];

    for (let key in json) {

        // if (json[key].hasOwnProperty('generatedResponse')) {
        //     console.log(`Skipping ${json[key].filename} because a response has already been generated.`);
        //     continue;
        // }

        const imagefile = json[key].imagename;

        let concatenatedText = audiolabel + json[key].segments.map(segment => segment.text).join(' ');

        //temp hack full prompt
        history.push({ role: 'user', message: concatenatedText });
        let instruction = '[System: The image corresponds to the transcribed video audio below. Write a brief 2 to 3 sentence response to the video and audio. Use the character sheet and example dialogue for formatting direction and character speech patterns.]' + lb;
        if (key === lastKey) {
            instruction = `[System: The image corresponds to the transcribed video audio below. This is the last part of the video. Let's give our viewers a good closer. Use the character sheet and example dialogue for formatting direction and character speech patterns.]` + lb;
            request.body.settings.max_length = 200;
        }

        let fullPrompt = permanentPrompt;
        for (let i = 0; i < history.length; i++) {
            if (history[i].role === 'user') {
                fullPrompt += userToken;
                if (i === history.length - 1) {
                    fullPrompt += instruction;
                }
                fullPrompt += history[i].message;
            } else {
                fullPrompt += assistantToken + history[i].message;
            }
        }
        fullPrompt += assistantToken + `${char}: `;
        // console.log(lb + fullPrompt);

        try {
            const imageLocation = path.join(folderPath, imagefile);
            const images = [await prepareImage(imageLocation)];

            console.log('Full prompt:', fullPrompt);
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
                let data = fullResponse.results[0].text.replace(/###/g, '').replace(/\n\n$/g, '').replace(/,/g, '').trim();

                data = cutOffUnfinishedSentences(data);

                if (data.startsWith(char + ": ")) {
                    data = data.substring((char + ": ").length);
                }


                json[key].generatedResponse = data;

                // Add the assistant's response to the history
                history.push({ role: 'assistant', message: data });
            }
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