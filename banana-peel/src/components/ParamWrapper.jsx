import { useContext } from "react";
import InputSlider from "./InputSlider";
import TextAreaInput from "./TextAreaInput";
import Checkbox from "@mui/material/Checkbox";
import { FormContext } from "../contexts/FormContext";
import formConfig from "../formConfig";
import "./paramWrapper.css";

export default function ParamWrapper() {
  const { form, setForm } = useContext(FormContext);
  const paramConfig = formConfig;

  const handleCheckbox = (key) => (e) => {
    setForm({ ...form, [key]: e.target.checked });
  };

  return (
    <ul className="paramWrapper">
      {Object.keys(paramConfig).map((key) => {
        switch (key) {
          case "prompt":
          case "images":
          case "api_servers":
          case "tts_prompt":
          case "transcribe_video_url":
            return null;
          default:
            switch (paramConfig[key].type) {
              case "string":
                return (
                  <li key={key} className="paramItem">
                    <label>
                      {key}:
                      <TextAreaInput name={key} />
                    </label>
                  </li>
                );
              case "float":
              case "integer":
                return (
                  <li key={key} className="paramItem">
                    <label>
                      {key}:
                      <InputSlider name={key} />
                    </label>
                  </li>
                );
              case "boolean":
                return (
                  <li className="paramItem">
                    <label>{key}:</label>
                    <Checkbox
                      className="Checkbox"
                      checked={form[key]}
                      onChange={handleCheckbox(key)}
                    />
                  </li>
                );
              default:
                return null; // return null when there's no match
            }
        }
      })}
    </ul>
  );
}
