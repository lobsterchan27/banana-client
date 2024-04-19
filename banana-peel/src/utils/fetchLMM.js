
function fetchLMM(prompt) {
    return new Promise((resolve) => {
        resolve( prompt + " is a foo and a bar.")
    });
}

export default fetchLMM;