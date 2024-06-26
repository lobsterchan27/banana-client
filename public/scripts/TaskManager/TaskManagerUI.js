export class TaskManagerUI {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.elements = {};
    }

    render() {
        const template = document.createElement('template');
        template.innerHTML = `
            <link rel="stylesheet" href="scripts/TaskManager/task-manager-styles.css">
            <h2>Task Manager</h2>
            <div id="addTaskForm">
                <input type="text" id="youtubeIdInput" placeholder="Enter YouTube ID">
                <button id="addTaskBtn">Add Task</button>
            </div>
            <div id="taskList" class="task-list"></div>
            <button id="removeCompletedBtn">Remove Completed Tasks</button>
        `;
        this.taskManager.shadowRoot.appendChild(template.content.cloneNode(true));
        this.cacheElements();
        this.updateTaskList();
    }

    cacheElements() {
        this.elements = {
            youtubeIdInput: this.taskManager.shadowRoot.getElementById('youtubeIdInput'),
            addTaskBtn: this.taskManager.shadowRoot.getElementById('addTaskBtn'),
            taskList: this.taskManager.shadowRoot.getElementById('taskList'),
            removeCompletedBtn: this.taskManager.shadowRoot.getElementById('removeCompletedBtn')
        };
    }

    bindEvents() {
        this.elements.addTaskBtn.addEventListener('click', () => {
            const youtubeId = this.elements.youtubeIdInput.value.trim();
            if (youtubeId) {
                this.taskManager.addTask(youtubeId);
                this.elements.youtubeIdInput.value = '';
            }
        });

        this.elements.removeCompletedBtn.addEventListener('click', () => {
            this.taskManager.removeCompletedTasks();
        });
    }

    updateTaskList() {
        this.elements.taskList.innerHTML = this.taskManager.store.getAllTasks().map(this.renderTask).join('');
    }

    renderTask(task) {
        return `
            <div class="task-item" data-task-id="${task.id}">
                <span class="task-id">${task.youtubeId}</span>
                <div class="task-steps">
                    ${task.steps.map(step => `
                        <span class="task-step status-${step.status}">
                            ${step.name}: ${step.status}
                        </span>
                    `).join('')}
                </div>
                <span class="task-status status-${task.status}">${task.status}</span>
            </div>
        `;
    }

    updateTaskInUI(taskId) {
        const taskElement = this.taskManager.shadowRoot.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            const task = this.taskManager.store.getTaskById(taskId);
            taskElement.outerHTML = this.renderTask(task);
        }
    }
}