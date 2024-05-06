const fs = require('fs');
const sharp = require('sharp');
const { Readable } = require('stream');

/**
 * Creates an AbortController for use with koboldcpp requests.
 * @param {Request} request - node fetch request object for the generation request.
 * @param {Response} response - express.js response object for the generation request.
 * @returns {AbortController} controller - The AbortController instance that can be used to signal abortion of a fetch request.
 */
function createAbortController(request, response) {
    const controller = new AbortController();
    request.socket.removeAllListeners('close');
    request.socket.on('close', async function () {
        if (request.body.can_abort && !response.writableEnded) {
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
                fullMessage += message;
                accumulator = accumulator.slice(boundary + 2);
            }
        });

        response.body.on('end', () => {
            console.log('Generated Response:', fullMessage + '\n');
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

async function requestTTS(prompt, voice, settings) {
    const url = settings.api_server + '/text2speech';
    const payload = {
        prompt: prompt,
        voice: voice,
    };

    try {
        fetchResponse = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(`Error during fetch: ${error.message}`);
        throw { status: 500, error: { message: 'Server error' } };
    }

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
}

async function convertImagesToBase64(imagePaths) {
    if (Array.isArray(imagePaths)) {
        return await Promise.all(imagePaths.map(async (filePath) => {
            let fileData = await fs.promises.readFile(filePath);
            return fileData.toString('base64');
        }));
    }
    return [];
}

/**
 * Asynchronously loads a JSON file.
 * 
 * This function checks if the file at the given path exists and is accessible,
 * then reads the file content and parses it as JSON.
 * 
 * @param {string} filename - The path to the JSON file.
 * @returns {Promise<Object>} A promise that resolves to the parsed JSON object.
 * @throws {Error} If the file does not exist, is not accessible, or its content is not valid JSON.
 */
async function loadJson(filename) {
        await fs.promises.access(filename, fs.constants.F_OK);
        const data = await fs.promises.readFile(filename, 'utf8');
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

/**
 * Sanitizes a user-provided path by normalizing it and removing any path traversal characters.
 * @param {string} originalPath The original path usually user-provided
 * @returns {string} The sanitized path
 */
function sanitizePath(originalPath) {
    const normalizedPath = path.normalize(originalPath);
    const sanitizedPath = normalizedPath.replace(/^(\.\.[\/\\])+/, '');
    return sanitizedPath;
}

async function prepareImage(imagePath) {
    const imageBuffer = await fs.promises.readFile(imagePath);
    const maxSide = 1024;

    return await createThumbnail(imageBuffer, maxSide, maxSide, 'image/jpeg');
}

/**
 * Creates a thumbnail from an image Buffer.
 * @param {Buffer} imageBuffer The Buffer of the image.
 * @param {number|null} maxWidth The maximum width of the thumbnail.
 * @param {number|null} maxHeight The maximum height of the thumbnail.
 * @param {string} [type='image/jpeg'] The type of the thumbnail.
 * @returns {Promise<string>} A promise that resolves to the thumbnail base64 data.
 */
async function createThumbnail(imageBuffer, maxWidth = null, maxHeight = null, type = 'image/jpeg') {
    // Use sharp to resize the image
    const resizedImageBuffer = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .toFormat(type.split('/')[1])
        .toBuffer();

    // Convert the Buffer back to a base64 string
    const resizedBase64Image = resizedImageBuffer.toString('base64');

    return resizedBase64Image;
}

module.exports = {
    createAbortController,
    extractData,
    handleStream,
    forwardFetchResponse,
    requestTTS,
    convertImagesToBase64,
    loadJson,
    delay,
    sanitizePath,
    prepareImage,
};