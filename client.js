// client.js
const EventSource = require('eventsource');

class Client {
    constructor(url, permanentPrompt) {
        this.url = url;
        this.permanentPrompt = permanentPrompt;
        this.history = [];
        this.maxTokens = 100;
    }

    async sendToServer(prompt = null) {
        let finalPrompt = this.permanentPrompt;

        if (this.history.length > 0) {
            for (let entry of this.history) {
                finalPrompt += entry['message'];
            }
        }

        if (prompt) {
            finalPrompt += prompt;
            this.history.push({ 'message': prompt });
        }

        let payload = {
            "prompt": `${finalPrompt}`,
            "temperature": 0.5,
            "top_p": 0.9,
            "max_length": 200
        };

        console.log(payload["prompt"]);

        try {
            const eventSource = new EventSource('/api/endpoint', {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify(payload)
            });

            eventSource.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                console.log('Received data:', data);
                // Process the received data as needed
            });

            eventSource.addEventListener('error', (event) => {
                console.error('Error occurred:', event);
                eventSource.close();
            });
        } catch (error) {
            console.error('Error sending request:', error);
        }
    }
}

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// Usage
let url = "http://localhost:8080/api/extra/generate/stream";
let prompt = "<s>[INST] What is your favourite condiment? [/INST] Well, I'm quite partial to a good squeeze of fresh lemon juice. It adds just the right amount of zesty flavour to whatever I'm cooking up in the kitchen!</s>";
let client = new Client(url, prompt);

readline.question("Enter prompt: ", userPrompt => {
    userPrompt = `${userPrompt}`;
    client.sendToServer(userPrompt).then(chunk => {
        console.log(chunk);
        readline.close();
    });
});