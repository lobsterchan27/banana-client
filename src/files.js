const express = require('express');
const router = express.Router();
const { jsonParser, checkRequestBody } = require('./common');
const fs = require('fs');
const path = require('path');


async function getFolderStructure(dirPath) {
    const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const folders = dirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    return folders;
}

/**
 * Returns an array of the folders in the context directory.
 * @returns {Array} The array of folders in the context directory.
 */
router.get('/context-folders', jsonParser, checkRequestBody, async (request, response) => {
    try {
        const contextDir = path.join(process.cwd(), 'public', 'context');

        const folderStructure = await getFolderStructure(contextDir);
        console.log(JSON.stringify(folderStructure));
        response.json(folderStructure);
    } catch (err) {
        console.error('Error:', err);
        response.status(500).json({ error: 'An error occurred while fetching context folders' });
    }
});

module.exports = { router }