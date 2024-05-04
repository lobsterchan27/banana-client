import { useState, useContext } from "react";
import { FormContext } from "../contexts/FormContext";
import useLocalStorage from "../hooks/useLocalStorage";
import { fetchLMM, abort } from "../utils/LMM";
import fetchStitch from "../utils/fetchStitch";
import TextAreaInput from "./TextAreaInput";
import "./promptForm.css";

const PromptForm = () => {
  const { form, setForm } = useContext(FormContext);
  const [textResponse, setTextResponse] = useLocalStorage("textResponse", []);
  const [abortToggle, setAbortToggle] = useState(false); // New state for abortToggle
  let currentIndex = textResponse.length - 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAbortToggle(true); // Set abortToggle to true when waiting for a response
    fetchLMM(form, setTextResponse, currentIndex);
    setForm({
      ...form,
    });
  };

  const handleAbort = () => {
    abort();
    setAbortToggle(false); // Set abortToggle to false when aborting
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <TextAreaInput name="prompt" />
        {abortToggle && (
          <button type="button" onClick={handleAbort}>
            Abort
          </button>
        )}
        <button type="submit">Submit</button>
      </form>
      <button type="button" onClick={fetchStitch}>
        fetchStitch
      </button>
    </>
  );
};

export default PromptForm;