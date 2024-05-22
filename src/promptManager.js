class PromptManager {
    constructor(character) {
        this.char = character;
        this.audiolabel = 'Video Audio: ';
        this.lb = "\n";
        this.userToken = '\n\n### Instruction:\n';
        this.assistantToken = '\n\n### Response:\n';
        this.permanentPrompt = this.createPermanentPrompt(character);
        this.history = [];
    }
}