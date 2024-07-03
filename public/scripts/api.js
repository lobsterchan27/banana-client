import { selectedImages, chatHistory, state } from "../script.js";
import { extractData } from "./utils.js";

/**
 * Generates text using the provided arguments.
 * @param {Object} args - An object containing the arguments for text generation.
 * @param {string} args.prompt - The prompt to use for text generation.
 * @param {String[]} args.base64images - The images to use for text generation.
 * @param {Object} args.settings - The settings to use for text generation.
 * @param {string} args.settings.api_server - The API server to use for text generation.
 * @param {Function} callback - The callback function to handle the messages.
 */
async function textGenerate(args, callback) {

    const payload = {
        ...args,
        'prompt': args.prompt,
        'can_abort': true
    }

    if (selectedImages.length > 0) {
        payload.base64images = selectedImages;
    }

    state.controller = new AbortController();

    try {
        const response = await fetch('/kobold/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: state.controller.signal
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
    } finally {
        selectedImages.length = 0;
    }
}

/**
 * Converts text to speech using the provided arguments.
 * @param {Object} args - An object containing the arguments for text to speech.
 * @param {string} args.prompt - The prompt to convert to speech.
 * @param {string} args.voice - The voice to use for the speech.
 * @param {Object} args.settings - The settings to use for text to speech.
 * @param {string} args.settings.api_server - The API server to use for text to speech.
 */
async function text2speech(args) {

    const payload = {
        prompt: args.prompt,
        voice: args.voice,
        settings: {
            api_server: args.settings.api_server
        }
    }
    console.log('Text to speech:', payload);

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

        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error sending request:', error);
    }
}

/**
 * Takes youtube URL and downloads the video to context folder with the same name as the video.
 * 
 * @param {Object} args - The arguments for the transcription.
 * @param {string} args.context - The URL to transcribe.
 */
async function downloadVideo(args) {
    console.log('Downloading video:', args);
    try {
        const payload = {
            context: args.context,
        };
        const response = await fetch('/youtube/download/context', {
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

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }

        console.log('Download response:', data);

        return data;
    } catch (error) {
        console.error('Error in downloadVideo:', error);
        throw error;
    }
}

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
async function transcribeUrl(args) {
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }

        console.log('Response:', data);

        return data;
    } catch (error) {
        console.error('Error in transcribeUrl:', error);
        throw error;
    }
}

/**
 * Generates LLM response from context in the given folder.
 * @param {Object} args - An object containing the arguments for processing the context.
 * @param {string} args.context - The foldername returned from transcription. currently using context/{filename}
 * @param {Object} args.settings - The settings to use for processing the context.
 * @param {string} args.settings.api_server - The API server to use for processing the context.
 * @param {Boolean} args.settings.streaming - Whether to stream the context.
 */
async function processContext(args) {
    const payload = {
        ...args
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

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }

        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
        throw error
    }
}

/**
 * @param {Object} args - Object containing the arguments for context TTS.
 * @param {string} args.context - The foldername returned from transcription. currently using context/{filename}
 * @param {Object} args.settings - The settings to use for context TTS.
 * @param {string} args.settings.api_server - The API server to use for processing the context.
 */
async function contextTTS(args) {
    const payload = {
        ...args
    }
    console.log('Generating TTS from context:', args);
    try {
        const response = await fetch('banana/text2speech/context', {
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

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * Combines the audio files in the specified context folder.
 * @param {Object} args - An object containing the arguments for combining the audio.
 * @param {string} args.context - The name of the folder containing the audio files to combine.
 */
async function combineAudio(args) {
    const payload = {
        context: args.context
    }

    try {
        const response = await fetch('/audio/generate/final', {
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
        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * Generates subtitles for the audio files in the specified context folder.
 * @param {Object} args - An object containing the arguments for generating subtitles.
 * @param {string} args.context - The name of the folder containing the audio files.
 */
async function generateSubs(args) {
    const payload = {
        context: args.context
    }
    try {
        const response = await fetch('/video/generate/subs', {
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

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }

        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * Generates a live2d video using the specified context.
 * @param {Object} args - An object containing the arguments for generating the live2d video.
 * @param {string} context - The name of the folder containing the context.
 */
async function live2d(args) {
    const payload = {
        context: args.context
    }
    try {
        const response = await fetch('/video/live2d', {
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

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }

        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * Generates a thumbnail using the specified arguments.
 * @param {Object} args - An object containing the arguments for generating the thumbnail.
 * @param {string} context - The foldername returned from transcription.
 */
async function generateThumbnail(contextName) {
    console.log('Generating thumbnail:', contextName);
    try {
        const response = await fetch('/thumbnail/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contextName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }

        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

export {
    textGenerate,
    text2speech,
    downloadVideo,
    transcribeUrl,
    processContext,
    contextTTS,
    combineAudio,
    generateSubs,
    live2d,
    generateThumbnail,
}