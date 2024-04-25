import React from "react";
import "./form.css";

const Form = ({ form, setForm, setTextResponse, currentIndex }) => {
  async function fetchLMM(prompt) {
    try {
      const payload = {
        prompt: prompt,
      };
      const response = await fetch("http://localhost:5000/kobold/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      setTextResponse((prev) => {
        let updatedArray = [...prev];
        updatedArray.push("");
        return updatedArray;
      });
      currentIndex++;

      if (currentIndex > 2) {
        setTextResponse((prev) => {
          let updatedArray = [...prev];
          updatedArray.shift();
          return updatedArray;
        });
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        buffer += chunk;

        // Split the buffer into events
        const events = buffer.split("\n\n");
        buffer = events.pop(); // Keep the last incomplete event in the buffer

        // Process each complete event
        for (const event of events) {
          const [header, data] = event.split("\n");
          if (header.trim() === "event: message") {
            const jsonPart = JSON.parse(data.slice("data: ".length));
            setTextResponse((prev) => {
              let updatedArray = [...prev];
              updatedArray[currentIndex] += jsonPart.token;
              return updatedArray;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prompt = e.target.elements.prompt.value;
    fetchLMM(prompt);
    setForm({
      ...form,
      prompt: "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="prompt"
        value={form.prompt}
        onChange={handleChange}
        placeholder="prompt"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default Form;
