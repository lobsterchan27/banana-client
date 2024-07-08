import { textGenerate, text2speech, downloadVideo, transcribeUrl, processContext, contextTTS, combineAudio, generateSubs, live2d } from './api.js';
import { collectSliderSettings, scrollToBottom, prepareImage, getFolders } from './utils.js';
import { showProcessingIndicator, showCompletionIndicator } from './indicators.js';
import { constructFullPrompt } from './chat.js';

import { chatHistory, selectedImages, state } from '../script.js';

/**
 * Aborts the kobold generation.
 */
async function abort() {
    state.controller.abort();
}

function handleGenerateTextButtonClick(event) {
    const api_server = document.getElementById('kobold-api-server').value;
    const permanentPrompt = document.getElementById('permanent-prompt').value;
    const promptInput = document.getElementById('prompt-input');
    const userName = document.getElementById('user-input').value;
    const characterName = document.getElementById('character-name-input').value;
    const chatDisplay = document.getElementById('chat-display');

    const stop_sequence = [
        '\n' + userName + ':',
        document.getElementById('stop-sequence-input').value
    ];

    // Display user's input
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user';
    userMessage.innerHTML = `<strong>${userName}:</strong> ${promptInput.value}`;
    chatDisplay.appendChild(userMessage);
    scrollToBottom(chatDisplay);

    // Create div for AI's response
    const aiMessage = document.createElement('div');
    aiMessage.className = 'chat-message ai';
    aiMessage.innerHTML = `<strong>${characterName}:</strong> <span class="ellipsis">...</span>`;
    chatDisplay.appendChild(aiMessage);
    scrollToBottom(chatDisplay);

    // Update chat history
    chatHistory.push({ role: 'user', message: promptInput.value });

    // Construct full prompt
    const prompt = constructFullPrompt(permanentPrompt, chatHistory, userName, characterName);

    // Collect slider settings
    const settings = collectSliderSettings();
    settings.api_server = api_server;
    settings.stop_sequence = stop_sequence;
    settings.streaming = true;

    // Generate text and update AI's response
    textGenerate({ prompt, settings }, function (chunk) {
        if (chunk === ' ') { chunk = '&nbsp;'; }

        if (aiMessage.querySelector('.ellipsis')) {
            aiMessage.innerHTML = `<strong>${characterName}:</strong> ${chunk}`;
        } else {
            aiMessage.innerHTML += chunk;
        }
        scrollToBottom(chatDisplay);
    });

    promptInput.value = '';
}

async function handleTextToSpeechButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const api_server = document.getElementById('banana-api-server').value;
    const prompt = document.getElementById('tts-prompt').value;


    await text2speech({ prompt, settings: { api_server } }).finally(() => {
        showCompletionIndicator(processingController, completionIndicator);
    });
}

async function handleDownloadVideoButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const args = {}
    args.context = document.getElementById('context-input').value;

    await downloadVideo(args);
    showCompletionIndicator(processingIndicator, completionIndicator);
}

async function handleTranscribeUrlButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const api_server = document.getElementById('banana-api-server').value;
    const url = document.getElementById('transcribe-url').value;

    // Just call the asynchronous functions without a try/catch since errors are handled internally.
    await transcribeUrl({ api_server, url, minimum_interval: 2 });
    await getFolders();

    showCompletionIndicator(processingIndicator, completionIndicator);
}

async function handleProcessContextButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const api_server = document.getElementById('kobold-api-server').value;
    const selectElement = document.getElementById('context-input');
    const context = selectElement.options[selectElement.selectedIndex].text;
    const settings = collectSliderSettings();

    settings.api_server = api_server;
    settings.streaming = false;

    await processContext({ settings, context }).finally(() => {
        showCompletionIndicator(processingController, completionIndicator);
    });
}

async function handleContextTTSButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const api_server = document.getElementById('banana-api-server').value;
    const context = document.getElementById('context-input').value;
    const voice = 'sky';
    const backend = 'tortoise';
    const voicefix = false;
    const vc = true;

    await contextTTS({ context, voice, backend, voicefix, vc, settings: { api_server } })
        .finally(() => showCompletionIndicator(processingIndicator, completionIndicator));
}

async function handleCombineAudioButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const context = document.getElementById('context-input').value;
    await combineAudio({ context })
        .finally(() => showCompletionIndicator(processingIndicator, completionIndicator));
}

async function handleGenerateSubsButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const context = document.getElementById('context-input').value;
    await generateSubs({ context })
        .finally(() => showCompletionIndicator(processingIndicator, completionIndicator));
}

async function handleLive2dButtonClick(event, processingIndicator, completionIndicator) {
    showProcessingIndicator(processingIndicator, completionIndicator);

    const context = document.getElementById('context-input').value;
    await live2d({context})
        .finally(() => showCompletionIndicator(processingIndicator, completionIndicator));
}

function handleClearChat(event) {
    document.getElementById('chat-display').innerHTML = '';
    selectedImages.length = 0;
    chatHistory.length = 0;
}

function handlePromptKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('generate-text-button').click();
    }
}

function handleDropdownButtonClick(event) {
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-panel.show').forEach(function (panel) {
        if (panel !== this.nextElementSibling) {
            panel.classList.remove('show');
        }
    }.bind(this));

    // Toggle the clicked dropdown
    this.nextElementSibling.classList.toggle('show');
}

function handleUploadImageClick(event) {
    document.getElementById('image-input').click();
}

async function handleImageInputChange(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = async function () {
            selectedImages.push(await prepareImage(reader.result));
        };
        reader.readAsDataURL(file);
    }
}

export {
    handleGenerateTextButtonClick,
    handleTextToSpeechButtonClick,
    handleDownloadVideoButtonClick,
    handleTranscribeUrlButtonClick,
    handleProcessContextButtonClick,
    handleContextTTSButtonClick,
    handleCombineAudioButtonClick,
    handleGenerateSubsButtonClick,
    handleLive2dButtonClick,
    handleClearChat,
    handlePromptKeydown,
    handleDropdownButtonClick,
    handleUploadImageClick,
    handleImageInputChange,
};