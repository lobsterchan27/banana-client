let controller;

async function text_generate() {
    console.log('text_generate called');
    const api_server = document.getElementById('api_server').value;
    const prompt = document.getElementById('prompt').value;
    let payload = {
        'api_server': api_server,
        'prompt': prompt,
        'can_abort': true
    }

    const controller = new AbortController();

    try {
        const response = await fetch('/kobold/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let accumulator = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            accumulator += chunk;

            let boundary = accumulator.indexOf('\n\n');
            while (boundary !== -1) {
                const message = accumulator.slice(0, boundary);
                console.log(message);
                document.getElementById('response').textContent += message + '\n\n';
                accumulator = accumulator.slice(boundary + 2);
                boundary = accumulator.indexOf('\n\n');
            }
        }
    } catch (error) {
        console.error('Error sending request:', error);
        document.getElementById('response').textContent += 'Error: ' + error.message + '\n';
    }
}

async function abort() {
    controller.abort();
}

async function text2speech() {
    const prompt = document.getElementById('tts_prompt').value;

    let payload = {
        'prompt': prompt,
        'voice': 'reference'
    }

    try {
        const response = await fetch('/banana/text2speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        document.getElementById('response').textContent += 'Transcription complete\n';
    } catch (error) {
        console.error('Error sending request:', error);
        document.getElementById('response').textContent += 'Error: ' + error.message + '\n';
    }
}

export {
    text_generate,
    text2speech,
    abort
}