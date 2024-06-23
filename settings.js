require('dotenv').config();
const path = require('path');

const HOSTNAME = process.env.HOSTNAME || '127.0.0.1';
const PORT = process.env.PORT || 8128;

const PROJECT_ROOT = __dirname;
const YT_DLP_BINARY_PATH = path.join(PROJECT_ROOT, 'bin');
const TEMPLATES_JSON_PATH = path.join(PROJECT_ROOT, 'templates.json');

const API_KEY = process.env.API_KEY;

module.exports = {
    HOSTNAME,
    PORT,
    PROJECT_ROOT,
    YT_DLP_BINARY_PATH,
    TEMPLATES_JSON_PATH,
    API_KEY,
    };