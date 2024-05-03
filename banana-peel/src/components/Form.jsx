import { useState, useContext } from "react";
import { FormContext } from "../contexts/FormContext";
import useLocalStorage from "../hooks/useLocalStorage";
import { fetchLMM, abort } from "../utils/LMM";
import fetchStitch from "../utils/fetchStitch";
import InputSlider from "./InputSlider";
import TextAreaInput from "./TextAreaInput";
import "./form.css";

const Form = () => {
  const { form, setForm } = useContext(FormContext);
  const [textResponse, setTextResponse] = useLocalStorage('textResponse', []);
  const [showAdvanced, setShowAdvanced] = useState(false);
  let currentIndex = textResponse.length - 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    fetchLMM(form, setTextResponse, currentIndex);
    setForm({
      ...form,
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="sliderWrapper">

      {Object.keys(form).map((key) => {
        if (form[key].type === "string") {
          return (
            <label key={key}>
              {key}:
              <TextAreaInput 
                name={key}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
              />
            </label>
          );
        }
        if (form[key].type === "float" || form[key].type === "integer") {
          return (
            <label key={key}>
              <InputSlider 
                name={key}
              />
            </label>
          );
        }
        return null; // return null when there's no match
      })}
        </div>
        <div className="formContainer">{showAdvanced && <></>}</div>
        <button onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
        </button>
        <button type="button" onClick={abort}>
          Abort
        </button>
        <button type="submit">Submit</button>
      </form>
      <button type="button" onClick={fetchStitch}>fetchStitch</button>
    </>
  );
};

export default Form;

// {
//   max_context_length:  integer minimum: 1 Maximum number of tokens to send to the model.,
//   max_length: integer minimum: 1 Number of tokens to generate.,
//   rep_pen:	number minimum: 1 Base repetition penalty value.,
//   rep_pen_range: 	integer minimum: 0 Repetition penalty range.,
//   sampler_order: [ minItems: 6 Sampler order to be used. If N is the length of this array, then N must be greater than or equal to 6 and the array must be a permutation of the first N non-negative integers. integer],
//   sampler_seed: integer maximum: 999999 minimum: 1 RNG seed to use for sampling. If not specified, the global RNG will be used.,
//   stop_sequence: [ An array of string sequences where the API will stop generating further tokens. The returned text WILL contain the stop sequence. string],
//   temperature:	number exclusiveMinimum: 0 Temperature value.,
//   tfs:	number maximum: 1 minimum: 0 Tail free sampling value.,
//   top_a:	number minimum: 0 Top-a sampling value.,
//   top_k:	integer minimum: 0 Top-k sampling value.,
//   top_p: number maximum: 1 minimum: 0 Top-p sampling value.,
//   min_p:	number maximum: 1 minimum: 0,Min-p sampling value.,
//   typical:	number maximum: 1 minimum: 0 Typical sampling value.,
//   use_default_badwordsids:	boolean default: false If true, prevents the EOS token from being generated (Ban EOS). For unbantokens, set this to false.,
//   dynatemp_range:	number default: 0 exclusiveMinimum: 0 If greater than 0, uses dynamic temperature. Dynamic temperature range will be between Temp+Range and Temp-Range. If less or equal to 0 , uses static temperature.,
//   smoothing_factor:	number default: 0 exclusiveMinimum: 0 Modifies temperature behavior. If greater than 0 uses smoothing factor.,
//   dynatemp_exponent: 	number default: 1 Exponent used in dynatemp.,
//   mirostat: 	number minimum: 0 maximum: 2 KoboldCpp ONLY. Sets the mirostat mode, 0=disabled, 1=mirostat_v1, 2=mirostat_v2,
//   mirostat_tau: number exclusiveMinimum: 0 KoboldCpp ONLY. Mirostat tau value.,
//   mirostat_eta:	number exclusiveMinimum: 0 KoboldCpp ONLY. Mirostat eta value.,
//   grammar: 	string KoboldCpp ONLY. A string containing the GBNF grammar to use.,
//   grammar_retain_state: boolean default: false KoboldCpp ONLY. If true, retains the previous generation's grammar state, otherwise it is reset on new generation.,
//   memory: 	string KoboldCpp ONLY. If set, forcefully appends this string to the beginning of any submitted prompt text. If resulting context exceeds the limit, forcefully overwrites text from the beginning of the main prompt until it can fit. Useful to guarantee full memory insertion even when you cannot determine exact token count.,
//   images: [ KoboldCpp ONLY. If set, takes an array of base64 encoded strings, each one representing an image to be processed. ],
// }
