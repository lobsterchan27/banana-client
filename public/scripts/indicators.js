function showProcessingIndicator(processingIndicator, completionIndicator) {
    if (processingIndicator) {
        processingIndicator.style.display = 'block';
    }
    
    if (completionIndicator) {
        completionIndicator.style.display = 'none';
    }
}

function showCompletionIndicator(processingIndicator, completionIndicator) {
    if (processingIndicator) {
        processingIndicator.style.display = 'none';
    }

    if (completionIndicator) {
        completionIndicator.style.display = 'block';
        setTimeout(() => {
            completionIndicator.style.display = 'none';
        }, 1000); // Hide after 1 second
    }
}

export {
    showProcessingIndicator,
    showCompletionIndicator,
}