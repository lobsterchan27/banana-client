import { Task } from './task.js';

export class TaskStore extends EventTarget {
  constructor(localStorageKey) {
    super();
    this.localStorageKey = localStorageKey;
    this._readStorage();
  }

  _readStorage() {
    const stored = window.localStorage.getItem(this.localStorageKey);
    if (stored) {
      const parsedTasks = JSON.parse(stored);
      this.tasks = parsedTasks.map(taskData => Object.assign(new Task(taskData.youtubeId), taskData));
    } else {
      this.tasks = [];
    }
  }

  _save() {
    window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.tasks));
    this.dispatchEvent(new CustomEvent("stateChanged"));
  }

  getAllTasks() {
    return this.tasks;
  }

  addTask(youtubeId) {
    const newTask = new Task(youtubeId);
    this.tasks.push(newTask);
    this._save();
    return newTask;
  }

  updateTask(index, updatedTask) {
    if (index >= 0 && index < this.tasks.length) {
      this.tasks[index] = { ...this.tasks[index], ...updatedTask };
      this._save();
    }
  }

  removeTask(index) {
    if (index >= 0 && index < this.tasks.length) {
      this.tasks.splice(index, 1);
      this._save();
    }
  }
}