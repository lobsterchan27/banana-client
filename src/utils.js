const fs = require('fs').promises;

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

module.exports = {
    forwardFetchResponse,
    fetchTTS,
    convertImagesToBase64,
    checkRequestBody,
    loadJson
};