let controller = new AbortController();

async function fetchLMM(form, setTextResponse, currentIndex) {
    try {
      let data = {
        ...form,
        can_abort: true,
      };

      let payload = managePayload(data);

      const response = await fetch("http://localhost:5000/kobold/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      console.log(payload)

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulator = "";

      setTextResponse((prev) => [...prev, ""]);
      currentIndex++

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        accumulator += chunk;

        let boundary = accumulator.indexOf('\n\n');
        while (boundary !== -1) {
            const message = extractData(accumulator.slice(0, boundary));
            console.log(message)
            accumulator = accumulator.slice(boundary + 2);
            boundary = accumulator.indexOf('\n\n');
            setTextResponse((prev) => {
              let updatedArray = [...prev];
              updatedArray[currentIndex] += message;
              return updatedArray;
            });
          }
        }
        
    } catch (error) {
      console.error("Error:", error);
    }
  }

  function extractData(chunk) {
    const match = chunk.match(/data: (.*)/);
    if (match) {
        try {
            const data = JSON.parse(match[1]);
            return data.token;
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return null;
        }
    } else {
        return null;
    }
}

function managePayload(payload) {
  for (let key in payload) {
    if (payload[key] === "") {
      delete payload[key];
    } else if (!isNaN(payload[key])) {
      payload[key] = Number(payload[key]);
    }
  }
  return payload;
}

async function abort() {
    controller.abort();
    controller = new AbortController();
}

module.exports = { fetchLMM, abort };