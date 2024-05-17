const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { Readable } = require("stream");
const YtDlpWrap = require("yt-dlp-wrap").default;

const { PROJECT_ROOT, YT_DLP_BINARY_PATH } = require("../settings");

/**
 * Creates an AbortController for use with koboldcpp requests.
 * @param {Request} request - node fetch request object for the generation request.
 * @param {Response} response - express.js response object for the generation request.
 * @returns {AbortController} controller - The AbortController instance that can be used to signal abortion of a fetch request.
 */
function createAbortController(request, response) {
  const controller = new AbortController();
  request.socket.removeAllListeners("close");
  request.socket.on("close", async function () {
    if (request.body.can_abort && !response.writableEnded) {
      try {
        console.log("Aborting Kobold generation...");
        // send abort signal to koboldcpp
        const abortResponse = await fetch(
          `${request.body.api_server}/extra/abort`,
          {
            method: "POST",
          }
        );

        if (!abortResponse.ok) {
          console.log(
            "Error sending abort request to Kobold:",
            abortResponse.status
          );
        }
      } catch (error) {
        console.log(error);
      }
    }
    controller.abort();
  });
  return controller;
}

/**
 * Checks for the yt-dlp binary at a predefined path and downloads it if not present.
 * Logs the download status to the console. Uses yt-dlp-wrap to handle the download process.
 */
async function checkYtDlp() {
  const binaryDir = path.join(PROJECT_ROOT, 'bin');
  const binaryPath = path.join(YT_DLP_BINARY_PATH, 'yt-dlp.exe');

  try {
    // Ensure the directory exists
    await fs.promises.mkdir(binaryDir, { recursive: true });

    // Check if the binary exists
    await fs.promises.access(binaryPath);
    console.log('yt-dlp binary already exists.');
  } catch (error) {
    console.log('yt-dlp binary not found, downloading...');
    try {
      await YtDlpWrap.downloadFromGithub(binaryPath);
      console.log('yt-dlp binary downloaded successfully.');
    } catch (downloadError) {
      console.error('Failed to download yt-dlp binary:', downloadError);
    }
  }
}

/**
 * Parses the data from the chunk of text.
 * @param {string} chunk - The chunk of text to extract the data from.
 * @returns {string} The extracted data.
 */
function extractData(chunk) {
  const match = chunk.match(/data: (.*)/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      return data.token;
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  } else {
    return null;
  }
}

/**
 *
 * @param {import('node-fetch').Response} response Streaming response from the server.
 */
function handleStream(response) {
  return new Promise((resolve, reject) => {
    // const textDecoder = new TextDecoder();
    let accumulator = "";
    let fullMessage = "";

    response.body.on("data", (chunk) => {
      let boundary;
      accumulator += chunk;

      while ((boundary = accumulator.indexOf("\n\n")) !== -1) {
        const message = extractData(accumulator.slice(0, boundary));
        fullMessage += message;
        accumulator = accumulator.slice(boundary + 2);
      }
    });

    response.body.on("end", () => {
      console.log("Generated Response:", fullMessage + "\n");
      resolve(fullMessage);
    });

    response.body.on("error", (error) => {
      console.error("Error occurred while reading from the stream:", error);
      reject(error);
    });
  });
}

/**
 * Pipe a fetch() response to an Express.js Response, including status code.
 * @param {import('node-fetch').Response} from The Fetch API response to pipe from.
 * @param {import('express').Response} to The Express response to pipe to.
 */
function forwardFetchResponse(from, to) {
  let statusCode = from.status;
  let statusText = from.statusText;

  if (!from.ok) {
    console.log(
      `Streaming request failed with status ${statusCode} ${statusText}`
    );
  }

  // Avoid sending 401 responses as they reset the client Basic auth.
  // This can produce an interesting artifact as "400 Unauthorized", but it's not out of spec.
  // https://www.rfc-editor.org/rfc/rfc9110.html#name-overview-of-status-codes
  // "The reason phrases listed here are only recommendations -- they can be replaced by local
  //  equivalents or left out altogether without affecting the protocol."
  if (statusCode === 401) {
    statusCode = 400;
  }

  to.statusCode = statusCode;
  to.statusMessage = statusText;
  from.body.pipe(to);

  to.socket.on("close", function () {
    if (from.body instanceof Readable) from.body.destroy(); // Close the remote stream
    to.end(); // End the Express response
  });

  from.body.on("end", function () {
    console.log("Streaming request finished");
    to.end();
  });
}

async function requestTTS(prompt, voice, settings) {
  const url = settings.api_server + "/text2speech";
  const payload = {
    prompt: prompt,
    voice: voice,
  };

  try {
    fetchResponse = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error during fetch: ${error.message}`);
    throw { status: 500, error: { message: "Server error" } };
  }

  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text();
    console.log(
      `Kobold returned error: ${fetchResponse.status} ${fetchResponse.statusText} ${errorText}`
    );

    try {
      const errorJson = JSON.parse(errorText);
      const message = errorJson?.detail?.msg || errorText;
      throw { status: 400, error: { message } };
    } catch {
      throw { status: 400, error: { message: errorText } };
    }
  }
  return fetchResponse;
}

async function convertImagesToBase64(imagePaths) {
  if (Array.isArray(imagePaths)) {
    return await Promise.all(
      imagePaths.map(async (filePath) => {
        let fileData = await fs.promises.readFile(filePath);
        return fileData.toString("base64");
      })
    );
  }
  return [];
}

/**
 * Asynchronously loads a JSON file.
 *
 * This function checks if the file at the given path exists and is accessible,
 * then reads the file content and parses it as JSON.
 *
 * @param {string} filename - The path to the JSON file.
 * @returns {Promise<Object>} A promise that resolves to the parsed JSON object.
 * @throws {Error} If the file does not exist, is not accessible, or its content is not valid JSON.
 */
async function loadJson(filename) {
  await fs.promises.access(filename, fs.constants.F_OK);
  const data = await fs.promises.readFile(filename, "utf8");
  return JSON.parse(data);
}

/**
 * Asynchronously saves an object as a JSON file.
 *
 * This function takes a JavaScript object and a file path, converts the object to a JSON string,
 * and writes it to the specified file. If the file already exists, it will be overwritten.
 *
 * @param {string} path - The path where the JSON file will be saved.
 * @param {Object} data - The JavaScript object to be saved as JSON.
 * @returns {Promise<void>} A promise that resolves when the file has been successfully written.
 * @throws {Error} If there is an error writing the file.
 */
async function saveJson(path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8', function (err) {
      if (err) {
        console.error("Error writing JSON file:", path, err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Delays the current async function by the given amount of milliseconds.
 * @param {number} ms Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the given amount of milliseconds
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitizes a user-provided path by normalizing it and removing any path traversal characters.
 * @param {string} originalPath The original path usually user-provided
 * @returns {string} The sanitized path
 */
function sanitizePath(originalPath) {
  const normalizedPath = path.normalize(originalPath);
  const sanitizedPath = normalizedPath.replace(/^(\.\.[\/\\])+/, "");
  return sanitizedPath;
}

function sanitizePathSegments(pathString) {
  return path.join(...pathString.split(path.sep).map(segment => {
      // Replace last period in each segment with '#'
      segment = segment.replace(/\.(?=[^.]*$)/, '#');
      // Remove other invalid end characters
      segment = segment.replace(/[\\/:*?"<>|]$/, '').trim();
      return segment;
  }));
}

async function prepareImage(imagePath) {
  const imageBuffer = await fs.promises.readFile(imagePath);
  const maxSide = 1024;

  return await createThumbnail(imageBuffer, maxSide, maxSide, "image/jpeg");
}

/**
 * Creates a thumbnail from an image Buffer.
 * @param {Buffer} imageBuffer The Buffer of the image.
 * @param {number|null} maxWidth The maximum width of the thumbnail.
 * @param {number|null} maxHeight The maximum height of the thumbnail.
 * @param {string} [type='image/jpeg'] The type of the thumbnail.
 * @returns {Promise<string>} A promise that resolves to the thumbnail base64 data.
 */
async function createThumbnail(
  imageBuffer,
  maxWidth = null,
  maxHeight = null,
  type = "image/jpeg"
) {
  // Use sharp to resize the image
  const resizedImageBuffer = await sharp(imageBuffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat(type.split("/")[1])
    .toBuffer();

  // Convert the Buffer back to a base64 string
  const resizedBase64Image = resizedImageBuffer.toString("base64");

  return resizedBase64Image;
}

/**
 * Formats a timestamp given in seconds into a string in the format "HH:MM:SS.ss".
 *
 * This function takes a number of seconds, and returns a string representing that time
 * in the format "HH:MM:SS.ss", where HH represents hours, MM represents minutes, SS represents
 * integer seconds, and ss represents fractional seconds to two decimal places.
 *
 * @param {number} seconds - The number of seconds to format.
 * @returns {string} A string representing the formatted timestamp.
 */
function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(1, '0');
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60)
    .toFixed(2)
    .padStart(5, '0');
  return `${hours}:${minutes}:${secs}`;
}


/**
 * Generates an ASS (Advanced SubStation Alpha) subtitle file content from an array of subtitle objects.
 *
 * @param {Array} subtitles - An array of subtitle objects. Each object should have 'start', 'end', and 'text' properties.
 * @returns {string} The content of an ASS subtitle file.
 */
function generateASS(subtitles) {
  const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayResX: 384
PlayResY: 288

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default, Arial, 24, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 1, 0, 2, 10, 10, 10, 0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  let events = subtitles
    .map((sub) => {
      return `Dialogue: 0,${formatTimestamp(sub.start)},${formatTimestamp(sub.end)},Default,,0,0,0,,${sub.text}`;
    })
    .join("\n");

  return `${header}\n${events}`;
}


module.exports = {
  createAbortController,
  checkYtDlp,
  extractData,
  handleStream,
  forwardFetchResponse,
  requestTTS,
  convertImagesToBase64,
  loadJson,
  saveJson,
  delay,
  sanitizePath,
  sanitizePathSegments,
  prepareImage,
  generateASS,
};
