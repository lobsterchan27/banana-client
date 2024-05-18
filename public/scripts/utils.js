import { contextFolders } from '../script.js';

function scrollToBottom(chatDisplay) {
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function collectSliderSettings() {
    const sliderSettingsDiv = document.getElementById('slider-settings');
    const inputs = sliderSettingsDiv.querySelectorAll('input[type=range]');
    const settings = {};

    inputs.forEach(input => {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            settings[input.id] = value;
        }
    });

    return settings;
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

async function prepareImage(image) {
    const base64Bytes = image.length * 0.75;
    const compressionLimit = 2 * 1024 * 1024;
    const maxSide = 1024;

    return (await createThumbnail(image, maxSide, maxSide, 'image/jpeg')).split(",")[1];
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
    const contextInput = document.getElementById('context-input');
    // First, clear any existing options
    contextInput.innerHTML = "";

    contextFolders.forEach(function (item) {
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

function withIndicators(handler, useIndicators, processingIndicator, completionIndicator) {
    if (useIndicators) {
        return function(event) {
            handler(event, processingIndicator, completionIndicator);
        };
    } else {
        return function(event) {
            handler(event);
        };
    }
}

export {
    collectSliderSettings,
    scrollToBottom,
    extractData,
    prepareImage,
    getFolders,
    populateDropdown,
    loadSliders,
    enableAutoResize,
    withIndicators,
};