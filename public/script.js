let controller;
let chatHistory = [];

/**
 * Generates text using the provided arguments.
 * @param {Object} args - An object containing the arguments for text generation.
 * @param {string} args.api_server - The API server to use for text generation.
 * @param {string} args.prompt - The prompt to use for text generation.
 * @param {string[]} args.images - The filepath to images to use for text generation. Uses banana-client as working directory.
 * @param {Function} callback - The callback function to handle the messages.
 */
async function text_generate(args, callback) {
    chatHistory.push({role: 'user', message: args.prompt});
    // let fullPrompt = permanentPrompt + history.map(entry => entry.message).join('');

    let payload = {
        ...args,
        'can_abort': true
    }

    controller = new AbortController();

    try {
        const response = await fetch('/kobold/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let accumulator = '';
        let fullMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            accumulator += chunk;

            let boundary = accumulator.indexOf('\n\n');
            while (boundary !== -1) {
                const message = extractData(accumulator.slice(0, boundary));
                callback(message);
                accumulator = accumulator.slice(boundary + 2);
                boundary = accumulator.indexOf('\n\n');
                fullMessage += message;
            }
        }
        chatHistory.push({role: 'assistant', message: fullMessage});
        console.log('Full message:', fullMessage);
    } catch (error) {
        console.error('Error sending request:', error);
        callback(`Error: ${error.message}`);
    }
}

async function abort() {
    controller.abort();
}

/**
 * Converts text to speech using the provided arguments.
 * @param {Object} args - An object containing the arguments for text to speech.
 * @param {string} args.prompt - The prompt to convert to speech.
 * @param {string} args.voice - The voice to use for the speech.
 */
async function text2speech(args) {
    const { voice = 'reference' } = args;

    let payload = {
        ...args,
        voice
    }

    try {
        const response = await fetch('/banana/text2speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        document.getElementById('response').textContent += 'Transcription complete\n';
    } catch (error) {
        console.error('Error sending request:', error);
        document.getElementById('response').textContent += 'Error: ' + error.message + '\n';
    }
}

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

export {
    text_generate,
    text2speech,
    abort
}