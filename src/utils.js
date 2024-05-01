const fs = require('fs').promises;
const { TextDecoder } = require('util');

/**
 * Creates an AbortController for use with koboldcpp requests.
 * @param {Request} request - node fetch request object for the generation request.
 * @param {Response} response_generate - express.js response object for the generation request.
 * @returns {AbortController} controller - The AbortController instance that can be used to signal abortion of a fetch request.
 */
function createAbortController(request, response_generate) {
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
    return controller;
}

/**
 * Parses the data from the chunk of text.
 * @param {string} chunk - The chunk of text to extract the data from.
 * @returns {string} The extracted data.
 */
function extractData(chunk) {
    const match = chunk.match(/data: (.*)/);
    if (match) {
        try {
            const data = JSON.parse(match[1]);
            return data.token;
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return null;
        }
    } else {
        return null;
    }
}

/**
 * 
 * @param {import('node-fetch').Response} response Streaming response from the server.
 */
function handleStream(response) {
    return new Promise((resolve, reject) => {
        // const textDecoder = new TextDecoder();
        let accumulator = '';
        let fullMessage = '';

        response.body.on('data', (chunk) => {
            let boundary
            accumulator += chunk;
            
            while ((boundary = accumulator.indexOf('\n\n')) !== -1) {
                const message = extractData(accumulator.slice(0, boundary));
                console.log('Message:', message);
                fullMessage += message;
                accumulator = accumulator.slice(boundary + 2);
            }
        });

        response.body.on('end', () => {
            console.log('Stream ended');
            console.log('Accumulated data:', fullMessage);
            resolve(fullMessage);
        });

        response.body.on('error', (error) => {
            console.error('Error occurred while reading from the stream:', error);
            reject(error);
        });
    });
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

async function fetchTTS(url, payload) {
    const fetchResponse = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    });

    const data = await fetchResponse.buffer();
    const filepath = path.join(__dirname, 'public/tts', `audio_${Date.now()}.wav`)

    fs.writeFile(filepath, data, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });

    return filepath;
}

async function convertImagesToBase64(imagePaths) {
    if (Array.isArray(imagePaths)) {
        return await Promise.all(imagePaths.map(async (filePath) => {
            let fileData = await fs.readFile(filePath);
            return fileData.toString('base64');
        }));
    }
    return [];
}

function checkRequestBody(req, res, next) {
    if (!req.body) return res.sendStatus(400);

    if (req.body.api_server && req.body.api_server.indexOf('localhost') != -1) {
        req.body.api_server = req.body.api_server.replace('localhost', '127.0.0.1');
    }

    next();
}

async function loadJson(filename) {
    const data = await fs.readFile(filename, 'utf8');
    return JSON.parse(data);
}

/**
 * Delays the current async function by the given amount of milliseconds.
 * @param {number} ms Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the given amount of milliseconds
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    createAbortController,
    extractData,
    handleStream,
    forwardFetchResponse,
    fetchTTS,
    convertImagesToBase64,
    checkRequestBody,
    loadJson,
    delay,
};