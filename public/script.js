//global variables
import { enableAutoResize, loadSliders, getFolders, withIndicators } from './scripts/utils.js';
import * as handlers from './scripts/handlers.js';


export const state = {
    controller: null,
}

export const chatHistory = [];
export const selectedImages = [];

export const firstToken = '### Instruction:\n';
export const userToken = '\n\n### Instruction:\n';
export const assistantToken = '\n\n### Response:\n';

export const contextFolders = [];

//On page load
document.addEventListener('DOMContentLoaded', function () {
    enableAutoResize('prompt-input');
    enableAutoResize('permanent-prompt');
    loadSliders();
    getFolders();

    const processingIndicator = document.getElementById('processing-indicator');
    const completionIndicator = document.getElementById('completion-indicator');

    const eventMapping = {
        'generate-text-button':     { event: 'click',   handler: handlers.handleGenerateTextButtonClick,    useIndicators: false },
        'text-2-speech-button':     { event: 'click',   handler: handlers.handleTextToSpeechButtonClick,    useIndicators: true  },
        'download-video-button':    { event: 'click',   handler: handlers.handleDownloadVideoButtonClick,   useIndicators: true  },
        'transcribe-url-button':    { event: 'click',   handler: handlers.handleTranscribeUrlButtonClick,   useIndicators: true  },
        'process-context-button':   { event: 'click',   handler: handlers.handleProcessContextButtonClick,  useIndicators: true  },
        'context-tts-button':       { event: 'click',   handler: handlers.handleContextTTSButtonClick,      useIndicators: true  },
        'combine-audio-button':     { event: 'click',   handler: handlers.handleCombineAudioButtonClick,    useIndicators: true  },
        'generate-subs-button':     { event: 'click',   handler: handlers.handleGenerateSubsButtonClick,    useIndicators: true  },
        'clear-chat-button':        { event: 'click',   handler: handlers.handleClearChat,                  useIndicators: false },
        'prompt-input':             { event: 'keydown', handler: handlers.handlePromptKeydown,              useIndicators: false },
        'upload-image-button':      { event: 'click',   handler: handlers.handleUploadImageClick,           useIndicators: false },
        'image-input':              { event: 'change',  handler: handlers.handleImageInputChange,           useIndicators: false },
    };

    Object.keys(eventMapping).forEach(id => {
        const element = document.getElementById(id);
        const { event, handler, useIndicators } = eventMapping[id];

        if (element && handler) {
            element.addEventListener(event, withIndicators(handler, useIndicators, processingIndicator, completionIndicator));
        }
    });

    // document.getElementById('generate-text-button').addEventListener('click', handleGenerateTextButtonClick);

    // document.getElementById('text-2-speech-button').addEventListener('click', handleTextToSpeechButtonClick);

    // document.getElementById('download-video-button').addEventListener('click', handleDownloadVideoButtonClick);

    // document.getElementById('transcribe-url-button').addEventListener('click', handleTranscribeUrlButtonClick);

    // document.getElementById('process-context-button').addEventListener('click', handleProcessContextButtonClick);

    // document.getElementById('context-tts-button').addEventListener('click', handleContextTTSButtonClick);

    // document.getElementById('combine-audio-button').addEventListener('click', handleCombineAudioButtonClick);

    // document.getElementById('generate-subs-button').addEventListener('click', handleGenerateSubsButtonClick);

    // document.getElementById('clear-chat-button').addEventListener('click', handleClearChat);

    // document.getElementById('prompt-input').addEventListener('keydown', handlePromptKeydown);

    document.querySelectorAll('.dropdown-button').forEach(function (button) {
        button.addEventListener('click', handlers.handleDropdownButtonClick);
    });
});