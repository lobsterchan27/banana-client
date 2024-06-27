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

    // GETTER methods
    this.getTaskById = (id) => this.tasks.find(task => task.id === id);
    this.getAllTasks = () => this.tasks;
    this.getPendingTasks = () => this.tasks.filter(task => task.status === 'pending');
    this.getCompletedTasks = () => this.tasks.filter(task => task.status === 'completed');
    this.hasCompletedTasks = () => this.tasks.some(task => task.status === 'completed');
  }

  _readStorage() {
    const stored = window.localStorage.getItem(this.localStorageKey);
    this.tasks = stored ? JSON.parse(stored).map(taskData => Object.assign(new Task(taskData.youtubeId), taskData)) : [];
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
    this.tasks = this.tasks.map(task => task.id === id ? { ...task, ...updatedTask } : task);
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

  _generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}