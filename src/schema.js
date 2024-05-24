const subSchema = (styles = {}) => {
    return {
        Mode: styles.Mode || "basic",
        Name: styles.Name || "Default",
        Fontname: styles.Fontname || "Hug Me Tight",
        Fontsize: styles.Fontsize || 18,
        PrimaryColour: styles.PrimaryColour || "&H0040EEE8",
        SecondaryColour: styles.SecondaryColour || "&H00FFFFFF",
        OutlineColour: styles.OutlineColour || "&H00000000",
        BackColour: styles.BackColour || "&H00000000",
        Bold: styles.Bold || 0,
        Italic: styles.Italic || 0,
        Underline: styles.Underline || 0,
        StrikeOut: styles.StrikeOut || 0,
        ScaleX: styles.ScaleX || 100,
        ScaleY: styles.ScaleY || 100,
        Spacing: styles.Spacing || 0,
        Angle: styles.Angle || 0,
        BorderStyle: styles.BorderStyle || 1,
        Outline: styles.Outline || 1,
        Shadow: styles.Shadow || 2,
        Alignment: styles.Alignment || 2,
        MarginL: styles.MarginL || 10,
        MarginR: styles.MarginR || 10,
        MarginV: styles.MarginV || 10,
        Encoding: styles.Encoding || 0
    }
}

module.exports = { subSchema };