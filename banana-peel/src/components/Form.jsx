import  { useState } from "react";
import { fetchLMM, abort } from "../utils/LMM";
import "./form.css";

const Form = ({ form, setForm, textResponse, setTextResponse }) => {
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
    <form onSubmit={handleSubmit}>
        <label>
          Prompt:
          <textarea
            name="prompt"
            value={form.prompt}
            onChange={handleChange}
            placeholder="prompt"
          />
        </label>
      <div className="formContainer">

    {showAdvanced && (
      <>
      
        <label>
          API Server:
          <input
            type="text"
            name="api_server"
            value={form.api_server}
            onChange={handleChange}
            placeholder="api_server"
          />
        </label>

        <label>
          max_context_length:
          <input
            type="number"
            name="max_context_length"
            value={form.max_context_length}
            onChange={handleChange}
            placeholder="max_context_length"
            min="1"
          />
          <small>
            (minimum: 1) Maximum number of tokens to send to the model.
          </small>
        </label>

        <label>
          max_length:
          <input
            type="number"
            name="max_length"
            value={form.max_length}
            onChange={handleChange}
            placeholder="max_length"
            min="1"
          />
          <small>(minimum: 1) Number of tokens to generate.</small>
        </label>

        <label>
          rep_pen:
          <input
            type="number"
            name="rep_pen"
            value={form.rep_pen}
            onChange={handleChange}
            placeholder="rep_pen"
            min="1"
            step="0.01"
          />
          <small>(minimum: 1) Base repetition penalty value.</small>
        </label>

        <label>
          rep_pen_range:
          <input
            type="number"
            name="rep_pen_range"
            value={form.rep_pen_range}
            onChange={handleChange}
            placeholder="rep_pen_range"
            min="0"
          />
          <small>(minimum: 0) Repetition penalty range.</small>
        </label>
        <label>
          sampler_order:
          <input
            type="text"
            name="sampler_order"
            value={form.sampler_order}
            onChange={handleChange}
            placeholder="sampler_order"
            minlength="6"
            pattern="^(\d+,?)+$"
          />
          <small>
            (minItems: 6) Sampler order to be used. If N is the length of this
            array, then N must be greater than or equal to 6 and the array must
            be a permutation of the first N non-negative integers.
          </small>
        </label>

        <label>
          sampler_seed:
          <input
            type="number"
            name="sampler_seed"
            value={form.sampler_seed}
            onChange={handleChange}
            placeholder="sampler_seed"
            min="1"
            max="999999"
          />
          <small>
            (maximum: 999999, minimum: 1) RNG seed to use for sampling. If not
            specified, the global RNG will be used.
          </small>
        </label>

        <label>
          stop_sequence:
          <input
            type="text"
            name="stop_sequence"
            value={form.stop_sequence}
            onChange={handleChange}
            placeholder="stop_sequence"
          />
          <small>
            An array of string sequences where the API will stop generating
            further tokens. The returned text WILL contain the stop sequence.
          </small>
        </label>

        <label>
          temperature:
          <input
            type="number"
            name="temperature"
            value={form.temperature}
            onChange={handleChange}
            placeholder="temperature"
            min="0.000001"
            step="0.000001"
          />
          <small>(exclusiveMinimum: 0) Temperature value.</small>
        </label>

        <label>
          tfs:
          <input
            type="number"
            name="tfs"
            value={form.tfs}
            onChange={handleChange}
            placeholder="tfs"
            min="0"
            max="1"
            step="0.01"
          />
          <small>(maximum: 1, minimum: 0) Tail free sampling value.</small>
        </label>

        <label>
          top_a:
          <input
            type="number"
            name="top_a"
            value={form.top_a}
            onChange={handleChange}
            placeholder="top_a"
            min="0"
            step="0.01"
          />
          <small>(minimum: 0) Top-a sampling value.</small>
        </label>

        <label>
          top_k:
          <input
            type="number"
            name="top_k"
            value={form.top_k}
            onChange={handleChange}
            placeholder="top_k"
            min="0"
          />
          <small>(integer, minimum: 0) Top-k sampling value.</small>
        </label>

        <label>
          top_p:
          <input
            type="number"
            name="top_p"
            value={form.top_p}
            onChange={handleChange}
            placeholder="top_p"
            min="0"
            max="1"
            step="0.01"
          />
          <small>(maximum: 1, minimum: 0) Top-p sampling value.</small>
        </label>

        <label>
          min_p:
          <input
            type="number"
            name="min_p"
            value={form.min_p}
            onChange={handleChange}
            placeholder="min_p"
            min="0"
            max="1"
            step="0.01"
          />
          <small>(maximum: 1, minimum: 0) Min-p sampling value.</small>
        </label>

        <label>
          typical:
          <input
            type="number"
            name="typical"
            value={form.typical}
            onChange={handleChange}
            placeholder="typical"
            min="0"
            max="1"
            step="0.01"
          />
          <small>(maximum: 1, minimum: 0) Typical sampling value.</small>
        </label>

        <label>
          use_default_badwordsids:
          <input
            type="checkbox"
            name="use_default_badwordsids"
            value={form.use_default_badwordsids}
            onChange={handleChange}
          />
          <small>
            (boolean, default: false) If true, prevents the EOS token from being
            generated (Ban EOS). For unbantokens, set this to false.
          </small>
        </label>

        <label>
          dynatemp_range:
          <input
            type="number"
            name="dynatemp_range"
            value={form.dynatemp_range}
            onChange={handleChange}
            placeholder="dynatemp_range"
            min="0.000001"
            step="0.000001"
          />
          <small>
            (number, default: 0, exclusiveMinimum: 0) If greater than 0, uses
            dynamic temperature. Dynamic temperature range will be between
            Temp+Range and Temp-Range. If less or equal to 0 , uses static
            temperature.
          </small>
        </label>

        <label>
          smoothing_factor:
          <input
            type="number"
            name="smoothing_factor"
            value={form.smoothing_factor}
            onChange={handleChange}
            placeholder="smoothing_factor"
            min="0.000001"
            step="0.000001"
          />
          <small>
            (number, default: 0, exclusiveMinimum: 0) Modifies temperature
            behavior. If greater than 0 uses smoothing factor.
          </small>
        </label>

        <label>
          dynatemp_exponent:
          <input
            type="number"
            name="dynatemp_exponent"
            value={form.dynatemp_exponent}
            onChange={handleChange}
            placeholder="dynatemp_exponent"
          />
          <small>(number, default: 1) Exponent used in dynatemp.</small>
        </label>

        <label>
          mirostat:
          <input
            type="number"
            name="mirostat"
            value={form.mirostat}
            onChange={handleChange}
            placeholder="mirostat"
            min="0"
            max="2"
          />
          <small>
            (number, minimum: 0, maximum: 2) KoboldCpp ONLY. Sets the mirostat
            mode, 0=disabled, 1=mirostat_v1, 2=mirostat_v2
          </small>
        </label>

        <label>
          mirostat_tau:
          <input
            type="number"
            name="mirostat_tau"
            value={form.mirostat_tau}
            onChange={handleChange}
            placeholder="mirostat_tau"
            min="0.000001"
            step="0.000001"
          />
          <small>
            (number, exclusiveMinimum: 0) KoboldCpp ONLY. Mirostat tau value.
          </small>
        </label>

        <label>
          mirostat_eta:
          <input
            type="number"
            name="mirostat_eta"
            value={form.mirostat_eta}
            onChange={handleChange}
            placeholder="mirostat_eta"
            min="0.000001"
            step="0.000001"
          />
          <small>
            (number, exclusiveMinimum: 0) KoboldCpp ONLY. Mirostat eta value.
          </small>
        </label>

        <label>
          grammar:
          <input
            type="text"
            name="grammar"
            value={form.grammar}
            onChange={handleChange}
            placeholder="grammar"
          />
          <small>
            KoboldCpp ONLY. A string containing the GBNF grammar to use.
          </small>
        </label>

        <label>
          grammar_retain_state:
          <input
            type="checkbox"
            name="grammar_retain_state"
            checked={form.grammar_retain_state}
            onChange={handleChange}
          />
          <small>
            (boolean, default: false) KoboldCpp ONLY. If true, retains the
            previous generation's grammar state, otherwise it is reset on new
            generation.
          </small>
        </label>

        <label>
          memory:
          <input
            type="text"
            name="memory"
            value={form.memory}
            onChange={handleChange}
            placeholder="memory"
          />
          <small>
            KoboldCpp ONLY. If set, forcefully appends this string to the
            beginning of any submitted prompt text. If resulting context exceeds
            the limit, forcefully overwrites text from the beginning of the main
            prompt until it can fit. Useful to guarantee full memory insertion
            even when you cannot determine exact token count.
          </small>
        </label>

        <label>
          images:
          <input
            type="text"
            name="images"
            value={form.images}
            onChange={handleChange}
            placeholder="images"
            pattern="^(data:image\/[a-zA-Z]*;base64,[a-zA-Z0-9+/]*,?)*$"
          />
          <small>
            KoboldCpp ONLY. If set, takes an array of base64 encoded strings,
            each one representing an image to be processed.
          </small>
        </label>
      </>
    )}
      </div>
      <button onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
      </button>
      <button type="button" onClick={abort}>Abort</button>
      <button type="submit">Submit</button>
    </form>
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
