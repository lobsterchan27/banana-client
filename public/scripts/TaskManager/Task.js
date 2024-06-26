export class Task {
    constructor(youtubeId) {
        this.id = null; // This will be set by TaskStore when the task is added
        this.youtubeId = youtubeId;
        this.status = 'pending';
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
}