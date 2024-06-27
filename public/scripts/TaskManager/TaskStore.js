import { Task } from './Task.js';

export class TaskStore extends EventTarget {
  constructor(localStorageKey) {
    super();
    this.localStorageKey = localStorageKey;
    this._readStorage();

    window.addEventListener("storage", () => {
      this._readStorage();
      this._save();
    }, false);
  }

  _readStorage() {
    const stored = window.localStorage.getItem(this.localStorageKey);
    if (stored) {
      const parsedTasks = JSON.parse(stored);
      this.tasks = parsedTasks.map(taskData => Task.fromJSON(taskData));
    } else {
      this.tasks = [];
    }
  }

  _save() {
    window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.tasks));
    this.dispatchEvent(new CustomEvent("stateChanged"));
  }

  addTask(youtubeId) {
    const newTask = new Task(youtubeId);
    newTask.id = this._generateUniqueId();
    this.tasks.push(newTask);
    this._save();
    return newTask;
  }

  updateTask(id, updatedTask) {
    this.tasks = this.tasks.map(task =>
      task.id === id ? Task.fromJSON({ ...task, ...updatedTask }) : task
    );
    this._save();
  }

  updateTaskStep(taskId, stepName, status) {
    const task = this.getTaskById(taskId);
    if (task) {
      task.steps = task.steps.map(step =>
        step.name === stepName ? { ...step, status } : step
      );
      if (task.isCompleted()) {
        task.status = 'completed';
      }
      this._save();
    }
  }

  removeTask(id) {
    this.tasks = this.tasks.filter(task => task.id !== id);
    this._save();
  }

  removeCompletedTasks() {
    this.tasks = this.tasks.filter(task => task.status !== 'completed');
    this._save();
  }

  getTaskById(id) {
    return this.tasks.find(task => task.id === id);
  }

  getAllTasks() {
    return this.tasks;
  }

  getPendingTasks() {
    return this.tasks.filter(task => task.status === 'pending');
  }

  getCompletedTasks() {
    return this.tasks.filter(task => task.status === 'completed');
  }

  _generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}