const express = require('express');
const fetch = require('node-fetch').default;
const fs = require('fs');

const router = express.Router();

async function fetchTTS(url, payload) {
    const fetchResponse = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    });

    const data = await fetchResponse.buffer();
    const filepath = path.join(__dirname, 'public', `audio_${Date.now()}.wav`)

    fs.writeFile(filepath, data, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });

    return filepath;
}

router.post('/text2speech', async function (request, response) {
    if (!request.body) return response.sendStatus(400);

    if (request.body.api_server.indexOf('localhost') != -1) {
        request.body.api_server = request.body.api_server.replace('localhost', '127.0.0.1');
    }
    
    const url = request.body.api_server + '/text2speech';
    const payload = {
        'prompt': request.body.prompt,
        'voice': request.body.voice || 'reference'
    }

    try {
        const filename = await fetchTTS(url, payload);
        response.status(200).json({ message: 'Transcription complete', filename: filename });
    } catch (error) {
        console.error('Error:', error);
        response.status(500).send('An error occurred');
    }
});

module.exports = { router, fetchTTS};