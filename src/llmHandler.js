const Handlebars = require('handlebars');
const { delay, extractData, prepareImage } = require('./utils');
const path = require('path');

class LLMHandler {
    static handlebarsExpressionRegex = /{{[^}]+}}/;

    /**
     * @param {Object} config - Configuration object
     * @param {string} [config.user='Video Audio'] - Username
     * @param {Object} [config.videoJson={}] - Video JSON data
     * @param {Object} config.contextTemplate - Context template
     * @param {Object} config.instructTemplate - Instruction template
     * @param {Object} config.characterCard - Character card data
     * @param {Object} [config.settings={}] - Settings
     */
    constructor(config) {
        this.user = config.user || 'Video Audio';
        this.videoJson = config.videoJson || {};

        this.contextTemplate = config.contextTemplate;
        this.instructTemplate = config.instructTemplate;
        this.characterCard = config.characterCard;

        this.history = [];
        this.lastPrompt = '';
        this.dynamicPrompt = { text: '', depth: 0 };

        this._compiledTemplates = new Map();

        this.settings = config.settings || {};
        this.defaultStopStrings = [
            this.instructTemplate.input_sequence,
            this.instructTemplate.stop_sequence,
            `${this.user}:`
        ];
        this.settings.stop_sequence = this.settings.stop_sequence || [];
        this.settings.stop_sequence = [
            ...new Set([...this.defaultStopStrings, ...this.settings.stop_sequence])
        ];

        this.initializeHistory();
    }

    /**
     * Sets a new username and clears the template cache.
     * @param {string} name - New username
     */
    setUsername(name) {
        if (this.user !== name) {
            this.user = name;
            this._compiledTemplates.clear();
        }
    }

    /**
     * Initializes conversation history with the first message.
     */
    initializeHistory() {
        const compiledFirstMessage = this.compileTemplate(this.characterCard.first_mes);
        this.updateHistory('assistant', compiledFirstMessage);
    }

    /**
     * Updates the conversation history.
     * @param {'user' | 'assistant'} role - Role of the message sender
     * @param {string} content - Message content
     */
    updateHistory(role, content) {
        this.history.push({ role, content });
    }
    
    /**
     * Retrieves or compiles a template.
     * @param {string} templateKey - Key for the template
     * @param {string} template - Template string
     * @returns {string} Compiled template
     */
    getCompiledTemplate(templateKey, template) {
        if (!this._compiledTemplates.has(templateKey)) {
            const compiled = this.compileTemplate(template);
            this._compiledTemplates.set(templateKey, compiled);
        }
        return this._compiledTemplates.get(templateKey);
    }

    /**
     * Compiles a template with the current data.
     * @param {string} template - Template to compile
     * @returns {string} Compiled template
     */
    compileTemplate(template) {
        const data = this.getTemplateData();
        return this.compileRecursive(template, data);
    }

    /**
     * Gets the current template data.
     * @returns {Object} Template data
     */
    getTemplateData() {
        return {
            ...this.characterCard.data,
            char: this.characterCard.name,
            user: this.user,
            system: this.instructTemplate.system_prompt,
            videoJson: this.videoJson
        };
    }

    /**
     * Recursively compiles a template.
     * @param {string} template - Template to compile
     * @param {Object} data - Data for compilation
     * @param {number} [maxDepth=10] - Maximum recursion depth
     * @returns {string} Compiled template
     */
    compileRecursive(template, data, maxDepth = 10) {
        let result = template;
        let depth = 0;

        while (depth < maxDepth) {
            const compiled = Handlebars.compile(result, { noEscape: true })(data);

            if (compiled === result || !LLMHandler.handlebarsExpressionRegex.test(compiled)) {
                return compiled;
            }

            result = compiled;
            depth++;
        }

        console.warn('Max recursion depth reached. There might be unresolved placeholders.');
        return result;
    }

    /**
     * Gets the compiled story string.
     * @returns {string} Compiled story string
     */
    get compiledStoryString() {
        return this.getCompiledTemplate('storyString', this.contextTemplate.story_string);
    }

    /**
     * Gets the token count of the compiled story string.
     * @returns {number} Estimated token count
     */
    get compiledStoryStringTokens() {
        return this.estimateTokenCount(this.compiledStoryString);
    }

    /**
     * Estimates the token count of a text.
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    // MAKESHIFT! replace with tokenizer.
    estimateTokenCount(text) {
        return Math.ceil(text.length / 4);
    }

    /**
     * Sets the dynamic prompt.
     * @param {string} text - Dynamic prompt text
     * @param {number} [depth=0] - Depth at which to insert the dynamic prompt
     */
    setDynamicPrompt(text, depth = 0) {
        this.dynamicPrompt = { text, depth };
    }

    /**
     * Formats a user prompt.
     * @param {string} content - Prompt content
     * @returns {string} Formatted prompt
     */
    formatUserPrompt(content, includeDynamicPrompt = false) {
        let result = this.instructTemplate.input_sequence + '\n';
        if (includeDynamicPrompt && this.dynamicPrompt.text) {
            result += this.dynamicPrompt.text + '\n';
        }
        result += `${this.user}: ${content}${this.instructTemplate.input_suffix}\n`;
        return result;
    }

    /**
     * Formats an assistant response.
     * @param {string} response - Response content
     * @returns {string} Formatted response
     */
    formatAssistantResponse(response) {
        return `${this.instructTemplate.output_sequence}\n${this.characterCard.name}: ${response}${this.instructTemplate.output_suffix}\n`;
    }

    /**
     * Formats the full prompt for generation.
     * @param {string} userPrompt - User's prompt
     * @param {boolean} [isLastSegment=false] - Whether this is the last segment
     * @param {number} [maxTokens=2048] - Maximum allowed tokens
     * @returns {{prompt: string, estimatedTokenCount: number}} Formatted prompt and its estimated token count
     */
    formatPrompt(isLastSegment = false, maxTokens = 8192) {
        let promptString = this.compiledStoryString;
        let tokenCount = this.compiledStoryStringTokens;

        let historyString = `${this.instructTemplate.output_sequence}\n${this.characterCard.name}: `;
        

        for (let i = this.history.length - 1; i >= 0; i--) {
            const item = this.history[i];
            let formattedItem = '';
            if (item.role === 'user') {
                formattedItem = this.formatUserPrompt(item.content, this.dynamicPrompt.depth === (this.history.length - 1 - i));
            } else {
                formattedItem = i === 0 ?
                    `${this.instructTemplate.first_output_sequence}\n${this.characterCard.name}: ${item.content}\n` :
                    this.formatAssistantResponse(item.content);
            }
            const itemTokens = this.estimateTokenCount(formattedItem);

            if (tokenCount + itemTokens <= maxTokens) {
                historyString = formattedItem + historyString;
                tokenCount += itemTokens;
            } else {
                break;
            }
        }

        promptString += historyString;

        if (isLastSegment && this.instructTemplate.last_output_sequence) {
            promptString += this.instructTemplate.last_output_sequence;
            tokenCount += this.estimateTokenCount(this.instructTemplate.last_output_sequence);
        }

        this.lastPrompt = promptString;

        return {
            prompt: promptString,
            estimatedTokenCount: tokenCount
        };
    }

    /**
     * Generates a response based on the given prompt.
     * @param {string} prompt - User's prompt
     * @param {string} imagePath - Path to the image
     * @param {boolean} isLastSegment - Whether this is the last segment
     * @returns {Promise<string>} Generated response
     */
    async generateResponse(prompt, imagePath, isLastSegment) {

        this.updateHistory('user', prompt);
        const formattedPrompt = this.formatPrompt(isLastSegment).prompt;
        
        try {
            const imageLocation = path.join(process.cwd(), imagePath);
            const images = [await prepareImage(imageLocation)];
            
            const fetchResponse = await this.makeRequest(formattedPrompt, images);
            let data;

            if (this.settings.streaming) {
                data = await this.handleStream(fetchResponse);
            } else {
                const fullResponse = await fetchResponse.json();
                data = fullResponse.results[0].text;
                data = data.replace(/###/g, '').replace(/\n\n$/g, '').replace(/,/g, '').trim();
                data = this.cutOffUnfinishedSentences(data);
            }

            this.updateHistory('assistant', data);
            return data;
        } catch (error) {
            console.error('Error occurred during request:', error);
            throw error;
        }
    }

    /**
     * Parses the response from the LLM.
     * @param {string} response - Raw response
     * @returns {string} Parsed response
     */
    parseResponse(response) {
        console.log('Parsing response:', response);  // Log the response for debugging
        if (response && response.results && response.results[0] && response.results[0].text) {
            let data = response.results[0].text;
            data = data.replace(/###/g, '').replace(/\n\n$/g, '').replace(/,/g, '').trim();
            data = this.cutOffUnfinishedSentences(data);
            
            const charPrefix = `${this.characterCard.name}: `;
            if (data.startsWith(charPrefix)) {
                data = data.substring(charPrefix.length);
            }
            
            return data;
        } else {
            console.error('Unexpected response format:', response);
            throw new Error('Unexpected response format');
        }
    }

    /**
     * Sends a request to the LLM API.
     * @param {string} prompt - Formatted prompt
     * @param {string[]} images - Array of prepared image data
     * @returns {Promise<Response>} Fetch response
     */
    async makeRequest(prompt, images) {
        const settings = this.settings;
        const controller = new AbortController(); // Or pass this in from the calling function if needed

        const payload = {
            "prompt": prompt,
            "max_length": settings.max_length,
            "max_context_length": settings.max_context_length,
            "temperature": settings.temperature,
            "top_k": settings.top_k,
            "top_p": settings.top_p,
            "typical": settings.typical,
            "min_p": settings.min_p,
            "top_a": settings.top_a,
            "tfs": settings.tfs,
            "rep_pen": settings.rep_pen,
            "rep_pen_range": settings.rep_pen_range,
            "sampler_order": [6, 0, 1, 3, 4, 2, 5],
            "stop_sequence": settings.stop_sequence,
        };
        console.log('Request payload:', payload);

        if (images && images.length > 0) {
            payload.images = images;
        }

        const args = {
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        };

        const delayAmount = 2500;
        const MAX_RETRIES = 3;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const url = settings.streaming ? `${settings.api_server}/extra/generate/stream` : `${settings.api_server}/v1/generate`;
                const fetchResponse = await fetch(url, { method: 'POST', timeout: 0, ...args });
                if (!fetchResponse.ok) {
                    const errorText = await fetchResponse.text();
                    console.log(`Kobold returned error: ${fetchResponse.status} ${fetchResponse.statusText} ${errorText}`);

                    try {
                        const errorJson = JSON.parse(errorText);
                        const message = errorJson?.detail?.msg || errorText;
                        throw { status: 400, error: { message } };
                    } catch {
                        throw { status: 400, error: { message: errorText } };
                    }
                }
                return fetchResponse;
            } catch (error) {
                switch (error?.status) {
                    case 403:
                    case 503: // retry in case of temporary service issue, possibly caused by a queue failure?
                        console.debug(`KoboldAI is busy. Retry attempt ${i + 1} of ${MAX_RETRIES}...`);
                        await this.delay(delayAmount);
                        break;
                    default:
                        console.error('Error sending request:', error);
                        throw { status: 500, error: { message: error.message } };
                }
            }
        }
        console.log('Max retries exceeded. Giving up.');
        throw { status: 500, error: { message: 'Max retries exceeded' } };
    }

    /**
     * Handles streaming response from the API.
     * @param {Response} response - Fetch response object
     * @returns {Promise<string>} Accumulated response data
     */
    async handleStream(response) {
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
     * Cuts off unfinished sentences from the generated text.
     * @param {string} text - Generated text
     * @returns {string} Text with complete sentences
     */
    cutOffUnfinishedSentences(text) {
        for (let i = text.length - 1; i >= 0; i--) {
            if (".!?".includes(text[i])) {
                return text.substring(0, i + 1).trim();
            }
        }
        return text;
    }
}

module.exports = LLMHandler;