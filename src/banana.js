const express = require('express');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const fs = require('fs');

const router = express.Router();

router.post('/text2speech', async function (request, response) {
    if (!request.body) return response_generate.sendStatus(400);

    if (request.body.api_server.indexOf('localhost') != -1) {
        request.body.api_server = request.body.api_server.replace('localhost', '127.0.0.1');
    }
    
    const url = 'http://localhost:8127/api/text2speech'
    const payload = {
        'prompt': 'machi is so cool. shiko shiko lick lick',
        'voice': 'reference'
    }
    try {
        const fetchResponse = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await fetchResponse.buffer();

        fs.writeFile('network.wav', data, (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });

        response.status(200).send('Transcription complete')
    } catch (error) {
        console.error('Error:', error);
        response.status(500).send('An error occurred');
    }
});

module.exports = { router };