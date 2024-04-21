const express = require('express');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const jsonParser = express.json();

const router = express.Router();

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
    request_prompt = request.body.prompt;
    payload = {
        "prompt": request_prompt,
        "temperature": 0.5,
        "top_p": 0.9,
        "max_length": 200
    };

    const args = {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
    };


    const url = 'http://127.0.0.1:8080/api/extra/generate/stream';
    const response = await fetch(url, { method: 'POST', timeout: 0, ...args });

    const streaming = true;
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
});

module.exports = { router };