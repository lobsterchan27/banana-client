import React from "react";
import fetchLMM from "../utils/fetchLMM";
import './form.css'

const Form = ({ form, setForm, setTextResponse }) => {

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prompt = e.target.elements.prompt.value;
    const response = await fetchLMM(prompt);
    setTextResponse(response);
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