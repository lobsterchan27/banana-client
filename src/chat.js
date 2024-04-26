const express = require('express');
const fs = require('fs').promises;

const router = express.Router();

let chatHistory = [];


router.post('/post', (req, res) => {
  // Add the new message to the chat history
  chatHistory.push(req.body.message);
  
  // Write the chat history to a file
  fs.writeFile('./public/chatHistory.json', JSON.stringify(chatHistory))
  .then(() => res.sendStatus(200))
  .catch((err) => res.status(500).send(err.message));
});

module.exports = { router };