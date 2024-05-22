const path = require('path');

const PROJECT_ROOT = __dirname;
const YT_DLP_BINARY_PATH = path.join(PROJECT_ROOT, 'bin');

const API_KEY = process.env.API_KEY

module.exports = {
    PROJECT_ROOT,
    YT_DLP_BINARY_PATH,
    API_KEY,
    };