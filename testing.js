const fetch = require('node-fetch').default;
const { Readable } = require('stream');

function forwardFetchResponse(from) {
  let statusCode = from.status;
  let statusText = from.statusText;

  if (!from.ok) {
    console.log(`Streaming request failed with status ${statusCode} ${statusText}`);
  }

  if (statusCode === 401) {
    statusCode = 400;
  }

  from.body
    .on('data', (chunk) => {
      // Convert the Buffer to a string and log it to the terminal
      console.log(chunk.toString());
    })
    .on('end', () => {
      console.log('Streaming request finished');
    });

  if (from.body instanceof Readable) {
    from.body.on('end', () => {
      from.body.destroy(); // Close the remote stream
    });
  }
}

async function makeRequest() {
  payload = {
    "prompt": `hey whats up?`,
    "temperature": 0.5,
    "top_p": 0.9,
    "max_length": 200
  };

  const args = {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  };


  const url = 'http://localhost:8080/api/extra/generate/stream';
  const response = await fetch(url, { method: 'POST', timeout: 0, ...args });

  const streaming = true;
  if (streaming) {
    // Pipe remote SSE stream to Express response
    forwardFetchResponse(response);
    return;
  } else {
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Kobold returned error: ${response.status} ${response.statusText} ${errorText}`);

      try {
        const errorJson = JSON.parse(errorText);
        const message = errorJson?.detail?.msg || errorText;
        return response_generate.status(400).send({ error: { message } });
      } catch {
        return response_generate.status(400).send({ error: { message: errorText } });
      }
    }

    const data = await response.json();
    console.log('Endpoint response:', data);
    return response_generate.send(data);
  }
}
makeRequest();