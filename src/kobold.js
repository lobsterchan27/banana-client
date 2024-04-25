const express = require('express');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const jsonParser = express.json();
const fs = require('fs').promises;


const router = express.Router();

async function convertImagesToBase64(imagePaths) {
    if (Array.isArray(imagePaths)) {
        return await Promise.all(imagePaths.map(async (filePath) => {
            let fileData = await fs.readFile(filePath);
            return fileData.toString('base64');
        }));
    }
    return [];
}

/**
 * Pipe a fetch() response to an Express.js Response, including status code.
 * @param {import('node-fetch').Response} from The Fetch API response to pipe from.
 * @param {import('express').Response} to The Express response to pipe to.
 */
function forwardFetchResponse(from, to) {
    let statusCode = from.status;
    let statusText = from.statusText;

    if (!from.ok) {
        console.log(`Streaming request failed with status ${statusCode} ${statusText}`);
    }

    // Avoid sending 401 responses as they reset the client Basic auth.
    // This can produce an interesting artifact as "400 Unauthorized", but it's not out of spec.
    // https://www.rfc-editor.org/rfc/rfc9110.html#name-overview-of-status-codes
    // "The reason phrases listed here are only recommendations -- they can be replaced by local
    //  equivalents or left out altogether without affecting the protocol."
    if (statusCode === 401) {
        statusCode = 400;
    }

    to.statusCode = statusCode;
    to.statusMessage = statusText;
    from.body.pipe(to);

    to.socket.on('close', function () {
        if (from.body instanceof Readable) from.body.destroy(); // Close the remote stream
        to.end(); // End the Express response
    });

    from.body.on('end', function () {
        console.log('Streaming request finished');
        to.end();
    });
}

router.post('/generate', jsonParser, async function (request, response_generate) {
    if (!request.body) return response_generate.sendStatus(400);

    if (request.body.api_server.indexOf('localhost') != -1) {
        request.body.api_server = request.body.api_server.replace('localhost', '127.0.0.1');
    }

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

    let payload = {
        "prompt": request_prompt,
        "temperature": 0.5,
        "top_p": 0.9,
        "max_length": 200,
        ...request.body,
    };

    payload.images = await convertImagesToBase64(request.body.images);

    console.log('Request:', {
        ...payload,
        images: payload.images.map(image => `${image.substring(0, 50)}... (length: ${image.length})`),
    });

    const args = {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
    };


    const streaming = true;
    try {
        const url = `${request.body.api_server}/extra/generate/stream`
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