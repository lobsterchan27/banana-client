const sharp = require('sharp');

const client = new vision.ImageAnnotatorClient({
    keyFilename: 'vision-426819-7efb56f51d64.json'
});

async function detectTextInImageGoogle(imagePath) {
    try {
        const [result] = await client.textDetection(imagePath);
        const detections = result.textAnnotations;
        if (detections.length > 0) {
            console.log('Text detected in image:', detections[0].description);
            return detections[0].description;
        } else {
            console.log('No text detected in image.');
            return null;
        }
    } catch (error) {
        console.error('Error detecting text in image:', error);
        return null;
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

Router.post('/overlay', async (req, res) => {