const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { loadJson } = require('./utils');
const wavFileInfo = require('wav-file-info');

const audioSilenceStitch = async () => {

    const contextPath = path.join(__dirname, '../public', 'context', 'context.jsonl');
    const contextChunks = await loadJson(contextPath);
    let prevEndTime = 0;
    let prevAudioFile = null;
    Object.entries(contextChunks).forEach( async ([key, value], i) => {
        const lastEntry = value['segments'][value.segments.length - 1]['end']
        console.log(`lastEntry ${lastEntry}`)
        console.log(`prevEndTime ${prevEndTime}`)
        console.log(`prevAudioFile ${prevAudioFile}`)
        const currentAudioFilePath = path.join(__dirname, '../public', 'context', `audio${i}.wav`);
        const silenceDuration = Math.max(0, Math.floor((lastEntry - prevEndTime)) - (prevAudioFile || 0));
        wavFileInfo.infoByFilename(currentAudioFilePath, function(err, info){
            if (err) throw err;
            prevAudioFile = info.duration;
        });
        prevEndTime = value['segments'][value.segments.length -1]['end']
        console.log(`Silence duration ${silenceDuration} `)
    });
};

module.exports = { audioSilenceStitch };

/*
  loop through contextChunks
  for each chunk ...
    calculate silence_duration based on the (current chunk end time [-1]  - the prev end time [-1]) - the response audio length
    stitch silenceDuration corresponding audioclip from the chunk at "../public/context/audio{index}.wav"
    reformat to .wav, 44100, bits_per_sample=16
*/