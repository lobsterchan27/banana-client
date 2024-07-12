# Banana Client

Banana Client is a powerful web application for AI-assisted video content creation, offering features like text generation, speech synthesis, video processing, and subtitle generation. This is a work-in-progress local PC WebUI client for use with a corresponding WhisperX and LLM servers.

## Features

- Text generation using AI models
- Text-to-speech conversion
- Video transcription and processing
- Subtitle generation and embedding
- Task management for batch processing
- Live2D integration for character animation
- YouTube video downloading and processing
- Image analysis for thumbnail generation

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/lobsterchan27/banana-client.git
   cd banana-client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the project root and add the following:
   ```
   HOSTNAME=127.0.0.1
   PORT=8128
   API_KEY=your_api_key_here
   ```

4. Install yt-dlp:
   The application will automatically download the yt-dlp binary on first run. Alternatively, you can manually place it in the `bin` directory.

## Usage

1. Start the server:
   ```
   node server.js
   ```

2. Open a web browser and navigate to `http://localhost:8128` (or the port you specified in the .env file).

3. Use the web interface to:
   - Generate text using AI models
   - Convert text to speech
   - Download and process YouTube videos
   - Generate subtitles for videos
   - Manage tasks for batch processing

## Configuration

- API servers can be configured in the web interface under the "API Servers" dropdown.
- Adjust text generation parameters using the sliders in the "Settings" dropdown.
- Customize prompt settings in the "Prompt Settings" dropdown.

## TODO

- [X] Implement chunk determination:
  - [X] Run a pass over the video using a scene change threshold with a minimum interval variable.
  - [ ] Create an array containing timestamps of the overall activity level.
  - [ ] Use this information along with timestamped transcriptions to determine how to trigger responses from the LLM.
- [ ] Add support for outputting video in different languages.
- [X] Improve integration with WhisperX server for transcription.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for YouTube video downloading
- [FFmpeg](https://ffmpeg.org/) for video processing
- [Live2D](https://www.live2d.com/) for character animation
