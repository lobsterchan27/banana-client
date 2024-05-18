import { firstToken, userToken, assistantToken } from '../script.js';


function getPrefix(role) {
    return role === 'user' ? userToken : assistantToken;
}

function constructFullPrompt(permanentPrompt, chatHistory, userName, characterName) {
    let prompt = firstToken + permanentPrompt;

    prompt += chatHistory.map(entry => {
        // Use the user name for user entries and the character name for AI entries
        const name = entry.role === 'user' ? userName : characterName;
        return getPrefix(entry.role) + name + ":" + entry.message;
    }).join('');

    // Append the assistant token at the end
    prompt += assistantToken + characterName + ":";

    return prompt;
}

export {
    constructFullPrompt,
}