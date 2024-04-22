const express = require('express');
const fetch = require('node-fetch').default;
const { Readable } = require('stream');
const fs = require('fs');

const router = express.Router();

router.post('/text2speech', async function (request, response) {
    console.log('txt2speech called');
    const url = 'http://localhost:8127/api/text2speech'
    const payload = {
        'prompt': 'machi is so cool. shiko shiko lick lick',
        'voice': 'reference'
    }
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

    response.status(200).send('Transcription complete');
});

module.exports = { router };