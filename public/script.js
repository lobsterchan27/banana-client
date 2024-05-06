//global variables
let controller;

let permanentPrompt = '';
const chatHistory = [];
const userToken = '\n\n### Instruction:\n';
const assistantToken = '\n\n### Response:\n';

const selectedImages = [];
const contextFolders = [];

function getPrefix(role) {
    return role === 'user' ? userToken : assistantToken;
}

function constructFullPrompt(chatHistory) {
    let prompt = chatHistory.map(entry => {
        return getPrefix(entry.role) + entry.message;
    }).join('');

    // Append the assistant token at the end
    prompt += assistantToken;

    return prompt;
}

async function prepareImage(base64Image) {
    const base64Bytes = base64Image.length * 0.75;
    const compressionLimit = 2 * 1024 * 1024;
    const maxSide = 1024;

    return (await createThumbnail(base64Image, maxSide, maxSide, 'image/jpeg')).split(",")[1];
}

/**
 * Creates a thumbnail from a data URL.
 * @param {string} dataUrl The data URL encoded data of the image.
 * @param {number|null} maxWidth The maximum width of the thumbnail.
 * @param {number|null} maxHeight The maximum height of the thumbnail.
 * @param {string} [type='image/jpeg'] The type of the thumbnail.
 * @returns {Promise<string>} A promise that resolves to the thumbnail data URL.
 */
function createThumbnail(dataUrl, maxWidth = null, maxHeight = null, type = 'image/jpeg') {
    // Someone might pass in a base64 encoded string without the data URL prefix
    if (!dataUrl.includes('data:')) {
        dataUrl = `data:image/jpeg;base64,${dataUrl}`;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calculate the thumbnail dimensions while maintaining the aspect ratio
            const aspectRatio = img.width / img.height;
            let thumbnailWidth = maxWidth;
            let thumbnailHeight = maxHeight;

            if (maxWidth === null) {
                thumbnailWidth = img.width;
                maxWidth = img.width;
            }

            if (maxHeight === null) {
                thumbnailHeight = img.height;
                maxHeight = img.height;
            }

            if (img.width > img.height) {
                thumbnailHeight = maxWidth / aspectRatio;
            } else {
                thumbnailWidth = maxHeight * aspectRatio;
            }

            // Set the canvas dimensions and draw the resized image
            canvas.width = thumbnailWidth;
            canvas.height = thumbnailHeight;
            ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);

            // Convert the canvas to a data URL and resolve the promise
            const thumbnailDataUrl = canvas.toDataURL(type);
            resolve(thumbnailDataUrl);
        };

        img.onerror = () => {
            reject(new Error('Failed to load the image.'));
        };
    });
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
 * @param {string} args.prompt - The prompt to use for text generation.
 * @param {String[]} args.base64images - The images to use for text generation.
 * @param {Object} args.settings - The settings to use for text generation.
 * @param {string} args.settings.api_server - The API server to use for text generation.
 * @param {Function} callback - The callback function to handle the messages.
 */
async function text_generate(args, callback) {
    chatHistory.push({ role: 'user', message: args.prompt });
    const fullPrompt = constructFullPrompt(chatHistory);

    const payload = {
        ...args,
        'prompt': fullPrompt,
        'can_abort': true
    }

    if (selectedImages.length > 0) {
        payload.base64images = selectedImages;
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
    } finally {
        selectedImages.length = 0;
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
 * @param {string} args.context - The foldername returned from transcription. currently using context/{filename}
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
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

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
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function getFolders() {
    try {
        const response = await fetch('files/context-folders');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        contextFolders.length = 0;
        contextFolders.push(...data);
        populateDropdown();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}

function populateDropdown() {
    const contextInput = document.getElementById('context_input');
    // First, clear any existing options
    contextInput.innerHTML = "";

    contextFolders.forEach(function(item) {
        const option = document.createElement('option');
        option.value = item;
        option.text = item;
        contextInput.appendChild(option);
    });
}

function loadSliders() {
    fetch('sliders.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(config => {
            const slider = document.getElementById(config.id);
            const inputId = slider.getAttribute('data-input-id');
            const input = document.getElementById(inputId);
            
            slider.min = config.min;
            slider.max = config.max;
            slider.step = config.step;
            slider.value = config.default;
            input.value = config.default;

            slider.oninput = () => input.value = slider.value;
            input.oninput = () => slider.value = input.value;
        });
    })
    .catch(error => console.error('Error loading the JSON file:', error));
}

function enableAutoResize(textareaId) {
    const textarea = document.getElementById(textareaId);

    function autoResize() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }

    textarea.addEventListener('input', autoResize, false);
}

document.addEventListener('DOMContentLoaded', function() {
    // enableAutoResize('prompt');
    loadSliders();
    getFolders();
});

// window.onload = function() {
//     getFolders();
// };

// Attach event handlers
document.getElementById('generateTextButton').addEventListener('click', () => {
    const api_server = document.getElementById('kobold_api_server').value;
    const prompt = document.getElementById('prompt').value;
    text_generate({ prompt, settings: { api_server, streaming: true } }, function(chunk) {
        if (chunk === ' ') { chunk = '&nbsp;'; }
        document.getElementById('chat_display').innerHTML += chunk;
    });
    document.getElementById('prompt').value ='';
});

document.getElementById('text2speechButton').addEventListener('click', () => {
    const api_server = document.getElementById('banana_api_server').value;
    const prompt = document.getElementById('tts_prompt').value;
    text2speech({ prompt, settings: { api_server } });
});

document.getElementById('transcribeUrlButton').addEventListener('click', () => {
    const api_server = document.getElementById('banana_api_server').value;
    const url = document.getElementById('transcribe_url').value;
    transcribe_url({ api_server, url, minimum_interval: 2 });
});

document.getElementById('processContextButton').addEventListener('click', () => {
    const api_server = document.getElementById('kobold_api_server').value;
    const selectElement = document.getElementById('context_input');
    const context = selectElement.options[selectElement.selectedIndex].text;
    processContext({ settings: { api_server, streaming: false }, context });
});

document.getElementById('contextTTSButton').addEventListener('click', () => {
    const api_server = document.getElementById('banana_api_server').value;
    const context = document.getElementById('context_input').value;
    contextTTS({ context, settings: { api_server } });
});

document.querySelectorAll('.dropdown-button').forEach(function(button) {
    button.addEventListener('click', function() {
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-panel.show').forEach(function(panel) {
            if (panel !== this.nextElementSibling) {
                panel.classList.remove('show');
            }
        }.bind(this));

        // Toggle the clicked dropdown
        this.nextElementSibling.classList.toggle('show');
    });
});

//Image Input
document.getElementById('uploadImage').addEventListener('click', function() {
    document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', async function() {
    const files = this.files;
    if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = async function() {
            selectedImages.push(await prepareImage(reader.result));
        };
        reader.readAsDataURL(file);
    }
});

export {
    transcribe_url,
    text_generate,
    text2speech,
    abort,
    processContext,
    contextTTS,
    getFolders,
}