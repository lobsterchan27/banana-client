
async function fetchLMM(prompt) {
    try {
        const payload = {
            "prompt": prompt,
            "temperature": 0.5,
            "top_p": 0.9,
            "max_length": 50,
        };

        const response = await fetch('http://localhost:5000/kobold/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            console.log('Received data:', chunk);
        } 

    } catch (error) {
        console.error('Error:', error);
    }
}

export default fetchLMM;
