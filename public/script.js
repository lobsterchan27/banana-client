//global variables
let controller;
let permanentPrompt = ''
const chatHistory = [];

/**
 * Transcribes a given URL.
 *
 * @param {Object} args - The arguments for the transcription.
 * @param {string} args.api_server - The API server to use for the transcription.
 * @param {string} args.url - The URL to transcribe.
 * @param {string} [args.language=null] - The language to use for the transcription.
 * @param {boolean} [args.text2speech=null] - Whether to convert the transcription to speech.
 * @param {number} [args.segment_length=null] - The length of each segment in the transcription.
 * @param {boolean} [args.translate=null] - Whether to translate the transcription.
 * @param {boolean} [args.get_video=null] - Whether to get the video for the transcription.
 * @param {number} [args.scene_threshold=null] - The scene threshold for the transcription.
 * @param {number} [args.minimum_interval=null] - The minimum interval for the transcription.
 * @param {number} [args.fixed_interval=null] - The fixed interval for the transcription.
 *
 * @returns {Promise<void>} A promise that resolves when the transcription is complete.
 */
//not completed finish tomorrow
async function transcribe_url(args) {
    console.log('Transcribing URL:', args);
    const {
        api_server,
        url,
        language = null,
        text2speech = null,
        segment_length = null,
        translate = null,
        get_video = null,
        scene_threshold = null,
        minimum_interval = null,
        fixed_interval = null
    } = args;

    const payload = {
        api_server,
        url,
        language,
        text2speech,
        segment_length,
        scene_threshold,
        minimum_interval,
        fixed_interval,
        translate,
        get_video
    }

    try {
        const response = await fetch('/banana/transcribe/url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Convert the response to JSON
        const data = await response.json();

        // Log the response data
        console.log('Response:', data);

        // Return the response data
        return data;
    } catch (error) {
        console.error('Error sending request:', error);
    }
}
/**
 * Generates text using the provided arguments.
 * @param {Object} args - An object containing the arguments for text generation.
 * @param {string} args.api_server - The API server to use for text generation.
 * @param {string} args.prompt - The prompt to use for text generation.
 * @param {string[]} args.images - The filepath to images to use for text generation. Uses banana-client as working directory.
 * @param {Function} callback - The callback function to handle the messages.
 */
async function text_generate(args, callback) {
    chatHistory.push({ role: 'user', message: args.prompt });
    const fullPrompt = permanentPrompt + chatHistory.map(entry => entry.message).join('');

    const payload = {
        ...args,
        'prompt': fullPrompt,
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
        chatHistory.push({ role: 'assistant', message: fullMessage });
        console.log('Full message:', fullMessage);
    } catch (error) {
        console.error('Error sending request:', error);
        callback(`Error: ${error.message}`);
    }
}

/**
 * Aborts the kobold generation.
 */
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

    const payload = {
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
 * Processes the context.
 * @param {Object} args - An object containing the arguments for processing the context.
 * @param {string} args.api_server - The API server to use for processing the context.
 * @param {string} args.filename - The foldername returned from transcription. currently using context/{filename}
 */
async function processContext(args) {
    const payload = {
        api_server: args.api_server,
        filename: args.filename
    }

    console.log('Processing context:', args);
    try {
        const response = await fetch('kobold/generate/context', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

export {
    transcribe_url,
    text_generate,
    text2speech,
    abort,
    processContext
}