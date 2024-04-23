import React from "react";
import "./form.css";

const Form = ({ form, setForm, setTextResponse }) => {
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

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const dataLine = chunk.split("\n")[1];
        const jsonPart = dataLine.slice(5);
        const object = JSON.parse(jsonPart);
        console.log(object.token);
        setTextResponse((prev) => prev + object.token);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTextResponse("");
    const prompt = e.target.elements.prompt.value;
    fetchLMM(prompt);
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
