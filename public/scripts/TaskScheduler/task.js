export class Task {
    constructor(youtubeId) {
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
        this.data = {};
    }

    updateStatus(status) {
        this.status = status;
    }

    updateStepStatus(stepIndex, status) {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            this.steps[stepIndex].status = status;
        }
    }

    setData(key, value) {
        this.data[key] = value;
    }

    getData(key) {
        return this.data[key];
    }

    isCompleted() {
        return this.steps.every(step => step.status === 'completed');
    }
}