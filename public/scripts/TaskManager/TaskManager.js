import { TaskStore } from './TaskStore.js';
import { TaskManagerUI } from './TaskManagerUI.js';

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

    addTask(youtubeId) {
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

        for (const step of task.steps) {
            try {
                await this.processStep(taskId, step.name, this.getStepFunction(step.name, task.youtubeId));
            } catch (error) {
                console.error(`Error in step ${step.name}:`, error);
                this.store.updateTask(taskId, { status: 'failed' });
                return;
            }
        }

        this.store.updateTask(taskId, { status: 'completed' });
    }

    async processStep(taskId, stepName, stepFunction) {
        this.store.updateTaskStep(taskId, stepName, 'running');
        try {
            await stepFunction();
            this.store.updateTaskStep(taskId, stepName, 'completed');
        } catch (error) {
            this.store.updateTaskStep(taskId, stepName, 'failed');
            throw error;
        }
    }

    getStepFunction(stepName, youtubeId) {
        const simulateApiCall = (duration) => new Promise((resolve) => {
            setTimeout(resolve, duration);
        });

        const stepFunctions = {
            'Transcribe': () => simulateApiCall(3000),
            'Download': () => simulateApiCall(2000),
            'Process Context': () => simulateApiCall(2500),
            'Generate Audio': () => simulateApiCall(4000),
            'Combine Audio': () => simulateApiCall(1500),
            'Generate Subs': () => simulateApiCall(2000),
            'Live2D': () => simulateApiCall(5000)
        };

        return stepFunctions[stepName];
    }
}

customElements.define('task-manager', TaskManager);