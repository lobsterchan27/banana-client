const { subSchema } = require('./schema');

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
 * @param {Array} subtitles - An array of subtitle objects. Each object should have 'start', 'end', 'text', and 'words' properties.
 * @returns {string} The content of an ASS subtitle file.
 */
function generateASS(subtitles, styles) {
    const subStyles = subSchema(styles);
    const header = `[Script Info]
  Title: Generated Subtitles
  ScriptType: v4.00+
  Collisions: Normal
  PlayResX: 384
  PlayResY: 288
  
  [V4+ Styles]
  Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  Style: ${subStyles.Name}, ${subStyles.Fontname}, ${subStyles.Fontsize}, ${subStyles.PrimaryColour}, ${subStyles.SecondaryColour}, ${subStyles.OutlineColour}, ${subStyles.BackColour}, ${subStyles.Bold}, ${subStyles.Italic}, ${subStyles.Underline}, ${subStyles.StrikeOut}, ${subStyles.ScaleX}, ${subStyles.ScaleY}, ${subStyles.Spacing}, ${subStyles.Angle}, ${subStyles.BorderStyle}, ${subStyles.Outline}, ${subStyles.Shadow}, ${subStyles.Alignment}, ${subStyles.MarginL}, ${subStyles.MarginR}, ${subStyles.MarginV}, ${subStyles.Encoding}
  
  [Events]
  Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  
    let events = subtitles
      .flatMap((sub) => {
        return generateDialogueEntries(sub, subStyles.Mode);
      })
      .join("\n");
  
    return `${header}\n${events}`;
  }
  
/**
 * Generates dialogue entries for a single subtitle object.
 *
 * @param {Object} subtitle - A subtitle object with 'start', 'end', 'text', and 'words' properties.
 * @param {String} mode - The mode to use when generating dialogue entries. Currently supports "reveal".
 * @returns {Array} An array of dialogue strings for the subtitle.
 */
function generateDialogueEntries(subtitle, mode) {
    switch (mode) {
      case 'karaoke':
        return KaraokeDialogues(subtitle);
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }
  }

  function KaraokeDialogues(subtitle) {
    const { words } = subtitle;
    let dialogues = [];

    for (let i = 0; i < words.length; i += 5) {
        const segment = words.slice(i, i + 5);
        const segmentStart = segment[0].start;
        const segmentEnd = segment[segment.length - 1].end;
        let segmentText = "";

        segment.forEach((word) => {
            const wordStart = word.start;
            const wordEnd = word.end;

            segmentText += `{\\k${Math.round((wordEnd - wordStart) * 100)}}${word.word} `;
        });

        dialogues.push(`Dialogue: 0,${formatTimestamp(segmentStart)},${formatTimestamp(segmentEnd)},Default,,0,0,0,,${segmentText}`);
    }

    return dialogues;
}
  

module.exports = { generateASS };