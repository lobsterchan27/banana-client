async function makeAPIRequest() {
    const prompt = document.getElementById('prompt').value;

    try {
        const response = await fetch('/kobold/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            console.log('Received data:', chunk);
            document.getElementById('response').textContent += chunk + '\n';
        }
    } catch (error) {
        console.error('Error sending request:', error);
        document.getElementById('response').textContent += 'Error: ' + error.message + '\n';
    }
}

async function text2speech() {
    try {
        const response = await fetch('/banana/text2speech', {
            method: 'POST',
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