const express = require('express');
const sharp = require('sharp');
const { jsonParser } = require('./common');
const { TEMPLATES_JSON_PATH, API_KEY } = require('../settings');

const path = require('path');
const fs = require('fs');

const vision = require('@google-cloud/vision');

const router = express.Router();

let templates;

async function loadTemplates() {
    try {
        const data = await fs.promises.readFile(TEMPLATES_JSON_PATH, 'utf8');
        templates = JSON.parse(data);
        console.log('Templates loaded successfully');
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

async function overlayTemplate(originalPath, templatePath, outputPath) {
    try {

        // Load the original image to get its dimensions
        const originalImage = sharp(originalPath);
        const originalMetadata = await originalImage.metadata();

        // Load the template image to get its dimensions
        const templateImage = sharp(templatePath);
        const templateMetadata = await templateImage.metadata();

        // Check if resizing is necessary
        let resizedTemplateImage;
        if (originalMetadata.width !== templateMetadata.width || originalMetadata.height !== templateMetadata.height) {
            resizedTemplateImage = await templateImage
                .resize(originalMetadata.width, originalMetadata.height, {
                    fit: 'cover',
                    kernel: sharp.kernel.lanczos3 // Specify the resizing algorithm
                })
                .toBuffer();
        } else {
            resizedTemplateImage = await templateImage.toBuffer();
        }

        // Composite the resized (or original) template image onto the original image
        const compositeImage = await originalImage
            .composite([{ input: resizedTemplateImage, blend: 'over' }]) // Overlay the template
            .toFile(outputPath);

        console.log('Thumbnail created successfully:', outputPath);
    } catch (error) {
        console.error('Error creating thumbnail:', error);
    }
}

function pickTemplate(position, mood) {
    if (!templates) {
        console.error('Templates not loaded');
        return null;
    }

    const availableTemplates = templates[position]?.[mood];
    if (availableTemplates && availableTemplates.length > 0) {
        // Randomly select a template from the available ones
        const randomIndex = Math.floor(Math.random() * availableTemplates.length);
        return availableTemplates[randomIndex];
    }
    // If no template found for the specific mood, fall back to neutral
    return templates[position]?.['neutral']?.[0] || null;
}

async function analyzeImageForTemplateOverlay(imagePath) {
    try {
        const client = new vision.ImageAnnotatorClient({
            keyFilename: 'vision-426819-7efb56f51d64.json'
        });

        // Perform object localization
        const [objectResult] = await client.objectLocalization(imagePath);
        const objects = objectResult.localizedObjectAnnotations;
        console.log('Detected objects:', objects.map(obj => ({
            name: obj.name,
            score: obj.score,
            boundingPoly: obj.boundingPoly.normalizedVertices
        })));

        // Perform text detection
        const [textResult] = await client.textDetection(imagePath);
        const textAnnotations = textResult.textAnnotations;

        // Filter text annotations based on confidence and length
        const confidenceThreshold = 0.5;
        const minTextLength = 3;
        const significantTextAnnotations = textAnnotations.filter(text =>
            text.confidence && text.confidence > confidenceThreshold &&
            text.description && text.description.length >= minTextLength
        );

        console.log('Significant detected text:', significantTextAnnotations.map(text => ({
            description: text.description,
            confidence: text.confidence,
            boundingPoly: text.boundingPoly.vertices,
        })));

        // Initialize weights
        let objectWeights = { left: 0, right: 0, center: 0 };
        let textWeights = { left: 0, right: 0, center: 0 };

        // Process objects
        objects.forEach(object => {
            const vertices = object.boundingPoly.normalizedVertices;
            const centerX = (vertices[0].x + vertices[2].x) / 2;
            const objectWeight = object.name.toLowerCase() === 'person' ? 8 : 2;
            if (centerX < 0.33) objectWeights.left += objectWeight;
            else if (centerX > 0.66) objectWeights.right += objectWeight;
            else objectWeights.center += objectWeight;
        });

        // Process overall text location
        if (significantTextAnnotations.length > 1) {  // Changed from textAnnotations to significantTextAnnotations
            const textBlock = significantTextAnnotations[0];
            const vertices = textBlock.boundingPoly.vertices;
            const imageWidth = textResult.fullTextAnnotation.pages[0].width;
            const textCenterX = (vertices[0].x + vertices[2].x) / 2 / imageWidth;
            const textWeight = 10;
            if (textCenterX < 0.33) textWeights.left += textWeight;
            else if (textCenterX > 0.66) textWeights.right += textWeight;
            else textWeights.center += textWeight;
        }

        // Calculate total weights
        const totalWeights = {
            left: objectWeights.left + textWeights.left,
            right: objectWeights.right + textWeights.right,
            center: objectWeights.center + textWeights.center
        };

        // Determine best position for headshot overlay (lowest weight)
        let bestPosition;
        if (totalWeights.left <= totalWeights.right && totalWeights.left <= totalWeights.center) {
            bestPosition = 'left';
        } else if (totalWeights.right <= totalWeights.left && totalWeights.right <= totalWeights.center) {
            bestPosition = 'right';
        } else {
            bestPosition = 'center';
        }

        return {
            position: bestPosition,
            hasText: significantTextAnnotations.length > 1,  // Changed from textAnnotations to significantTextAnnotations
            objectWeights: objectWeights,
            textWeights: textWeights,
            totalWeights: totalWeights
        };
    } catch (error) {
        console.error('Error analyzing image:', error);
        return null;
    }
}

/** 
 * POST request to generate a thumbnail image.
 * @param {string} request.body.contextName - The name of the context to process.
 */
router.post('/generateThumbnail', jsonParser, async function (request, response) {
    console.log('POST request received:', request.body);
    const folderName = request.body.contextName;
    const folderPath = path.join('public', 'context', folderName);
    const jsonPath = await getJson(folderPath);
});

// analyzeImageForTemplateOverlay('euch5i.jpg')
//     .then(result => {
//         if (result) {
//             console.log(`Best template position: ${result.position}`);
//             console.log(`Image contains text: ${result.hasText}`);
//             console.log('Object weights:', result.objectWeights);
//             console.log('Text weights:', result.textWeights);
//             console.log('Total weights:', result.totalWeights);
//             //pick template code
//         }
//     });

async function initializeTemplates() {
    await loadTemplates();
    console.log(pickTemplate('left', 'neutral'));
}

initializeTemplates();