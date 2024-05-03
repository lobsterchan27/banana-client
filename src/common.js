const express = require('express');

// Instantiate parser middleware here with application-level size limits
const jsonParser = express.json({ limit: '200mb' });

/**
 * Middleware function to validate the request body.
 * 
 * This function checks if the request body is present. If not, it sends a 400 status code back to the client.
 * It also replaces 'localhost' with '127.0.0.1' in the 'api_server' field of the request body, if present.
 * 
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function in the application's request-response cycle.
 */
function checkRequestBody(req, res, next) {
    if (!req.body) return res.sendStatus(400);

    if (req.body.api_server && req.body.api_server.indexOf('localhost') != -1) {
        req.body.api_server = req.body.api_server.replace('localhost', '127.0.0.1');
    }

    next();
}

module.exports = { jsonParser, checkRequestBody };