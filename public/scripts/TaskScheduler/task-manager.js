import { TaskStore } from './task-store.js';

class TaskManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.taskStore = new TaskStore('taskManagerTasks');
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.taskStore.addEventListener('stateChanged', () => this.updateTaskList());
        this.processQueue();
    }

    render() {
        this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="scripts/TaskScheduler/task-manager-styles.css">
      <h2>Task Manager</h2>
      <div id="addTaskForm">
        <input type="text" id="youtubeIdInput" placeholder="Enter YouTube ID">
        <button id="addTaskBtn">Add Task</button>
      </div>
      <div id="taskList" class="task-list"></div>
      <button id="removeCompletedBtn">Remove Completed Tasks</button>
    `;
        this.updateTaskList();
    }

    updateTaskList() {
        const taskList = this.shadowRoot.getElementById('taskList');
        taskList.innerHTML = this.taskStore.getAllTasks().map(this.renderTask).join('');
    }

    renderTask(task) {
        return `
      <div class="task-item">
        <span class="task-id">${task.youtubeId}</span>
        <div class="task-steps">
          ${task.steps.map(step => `<span class="task-step status-${step.status}">${step.name}</span>`).join('')}
        </div>
        <span class="task-status status-${task.status}">${task.status}</span>
      </div>
    `;
    }

    setupEventListeners() {
        this.shadowRoot.getElementById('addTaskBtn').addEventListener('click', () => {
            const youtubeIdInput = this.shadowRoot.getElementById('youtubeIdInput');
            const youtubeId = youtubeIdInput.value.trim();
            if (youtubeId) {
                this.addTask(youtubeId);
                youtubeIdInput.value = '';
            }
        });
        this.shadowRoot.getElementById('removeCompletedBtn').addEventListener('click', () => {
            this.removeCompletedTasks();
        });
    }

    addTask(youtubeId) {
        this.taskStore.addTask(youtubeId);
    }

    removeCompletedTasks() {
        const tasks = this.taskStore.getAllTasks();
        for (let i = tasks.length - 1; i >= 0; i--) {
            if (tasks[i].status === 'completed') {
                this.taskStore.removeTask(i);
            }
        }
    }

    async processQueue() {
        let processedCount = 0;
        while (true) {
            const tasks = this.taskStore.getAllTasks();
            if (processedCount >= tasks.length) {
                processedCount = 0;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before starting over
                continue;
            }

            const task = tasks[processedCount];
            if (task.status === 'pending') {
                await this.processTask(processedCount);
            }
            processedCount++;
        }
    }

    async processTask(taskIndex) {
        const task = this.taskStore.getAllTasks()[taskIndex];
        this.taskStore.updateTask(taskIndex, { status: 'running' });

        for (let i = 0; i < task.steps.length; i++) {
            this.taskStore.updateTask(taskIndex, {
                steps: task.steps.map((step, index) => 
                    index === i ? { ...step, status: 'running' } : step
                )
            });

            try {
                // Simulate processing time for each step
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.taskStore.updateTask(taskIndex, {
                    steps: task.steps.map((step, index) =>
                        index === i ? { ...step, status: 'completed' } : step
                    )
                });
            } catch (error) {
                this.taskStore.updateTask(taskIndex, {
                    status: 'failed',
                    steps: task.steps.map((step, index) =>
                        index === i ? { ...step, status: 'failed' } : step
                    )
                });
                return;
            }
        }

        this.taskStore.updateTask(taskIndex, { status: 'completed' });
    }
}

customElements.define('task-manager', TaskManager);