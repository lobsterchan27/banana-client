import { TaskStore } from './TaskStore.js';
import { TaskManagerUI } from './TaskManagerUI.js';
import { collectSliderSettings } from '../utils.js';
import {
    transcribeUrl,
    downloadVideo,
    processContext,
    contextTTS,
    combineAudio,
    generateSubs,
    live2d,
    generateThumbnail,
} from '../api.js';

export class TaskManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.store = new TaskStore('taskManagerTasks');
        this.ui = new TaskManagerUI(this);
        this.activeTasks = new Set();
        this.maxConcurrentTasks = 3;
    }

    connectedCallback() {
        this.ui.render();
        this.ui.bindEvents();
        this.store.addEventListener('stateChanged', () => this.ui.updateTaskList());
        this.processQueue();
    }

    async addTask(youtubeId) {
        const newTask = this.store.addTask(youtubeId);
        if (this.activeTasks.size === 0) {
            this.processQueue();
        }
        return newTask;
    }

    removeCompletedTasks() {
        this.store.removeCompletedTasks();
    }

    async processQueue() {
        while (true) {
            const pendingTasks = this.store.getPendingTasks();

            while (this.activeTasks.size < this.maxConcurrentTasks && pendingTasks.length > 0) {
                const task = pendingTasks.shift();
                this.activeTasks.add(task.id);
                this.processTask(task.id).finally(() => {
                    this.activeTasks.delete(task.id);
                });
            }

            if (this.activeTasks.size === 0 && pendingTasks.length === 0) {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async processTask(taskId) {
        const task = this.store.getTaskById(taskId);
        if (!task || task.status !== 'pending') return;

        this.store.updateTask(taskId, { status: 'running' });

        const steps = [
            'Transcribe',
            'Download',
            'Process Context',
            'Generate Audio',
            'Combine Audio',
            'Generate Subs',
            'Live2D',
        ];

        for (const step of steps) {
            try {
                await this.processStep(taskId, step);
            } catch (error) {
                console.error(`Error in step ${step}:`, error);
                this.store.updateTask(taskId, { status: 'failed' });
                return; // Stop processing further steps
            }
        }

        this.store.updateTask(taskId, { status: 'completed' });
    }

    async processStep(taskId, stepName) {
        this.store.updateTaskStep(taskId, stepName, 'running');
        try {
            const task = this.store.getTaskById(taskId);
            let api_server;
            switch (stepName) {
                case 'Transcribe':
                    api_server = document.getElementById('banana-api-server').value;
                    const url = `https://www.youtube.com/watch?v=${task.youtubeId}`;
                    task.folderPath = await transcribeUrl({ api_server, url, minimum_interval: 2 });
                    break;
                case 'Download':
                    await downloadVideo({ context: task.folderPath });
                    break;
                case 'Process Context':
                    api_server = document.getElementById('kobold-api-server').value;
                    const settings = collectSliderSettings();
                    settings.api_server = api_server;
                    settings.streaming = false;
                    await processContext({ settings, context: task.folderPath });
                    break;
                case 'Generate Audio':
                    api_server = document.getElementById('banana-api-server').value;
                    const voice = 'sky';
                    const backend = 'tortoise';
                    const voicefix = false;
                    const vc = true;
                    await contextTTS({ context: task.folderPath, voice, backend, voicefix, vc, settings: { api_server } });
                    break;
                case 'Combine Audio':
                    await combineAudio({ context: task.folderPath });
                    break;
                case 'Generate Subs':
                    await generateSubs({ context: task.folderPath });
                    break;
                case 'Live2D':
                    await live2d({ context: task.folderPath });
                    break;
                default:
                    throw new Error(`Unknown step: ${stepName}`);
            }
            this.store.updateTaskStep(taskId, stepName, 'completed');
        } catch (error) {
            console.error(`Error in step ${stepName} for task ${taskId}:`, error);
            this.store.updateTaskStep(taskId, stepName, 'failed');
            throw error;
        }
    }
}

customElements.define('task-manager', TaskManager);