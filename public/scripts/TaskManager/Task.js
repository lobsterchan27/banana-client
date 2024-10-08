export class Task {
    constructor(youtubeId) {
        this.id = null;
        this.youtubeId = youtubeId;
        this.status = 'pending';
        this.folderPath = null;
        this.steps = [
            { name: 'Transcribe', status: 'pending' },
            { name: 'Download', status: 'pending' },
            { name: 'Process Context', status: 'pending' },
            { name: 'Generate Audio', status: 'pending' },
            { name: 'Combine Audio', status: 'pending' },
            { name: 'Generate Subs', status: 'pending' },
            { name: 'Live2D', status: 'pending' }
        ];
    }

    isCompleted() {
        return this.steps.every(step => step.status === 'completed');
    }

    static fromJSON(json) {
        const task = new Task(json.youtubeId);
        Object.assign(task, json);
        return task;
    }
}