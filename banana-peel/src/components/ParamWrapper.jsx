import { useContext } from "react";
import InputSlider from "./InputSlider";
import TextAreaInput from "./TextAreaInput";
import Checkbox from "@mui/material/Checkbox";
import { FormContext } from "../contexts/FormContext";
import formConfig from "../formConfig";
import "./css/paramWrapper.css";

export default function ParamWrapper({ includeKeys }) {
  const { form, setForm } = useContext(FormContext);
  const paramConfig = formConfig;

  const handleCheckbox = (key) => (e) => {
    setForm({ ...form, [key]: e.target.checked });
  };

  return (
    <ul className="paramWrapper">
      {includeKeys && includeKeys.map((key) => {
        if (paramConfig[key]) {  // Ensure the key exists in the configuration
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
                <li key={key} className="paramItem">
                  <label>
                    {key}:
                    <Checkbox
                      checked={form[key]}
                      onChange={handleCheckbox(key)}
                    />
                  </label>
                </li>
              );
            default:
              return null;  // Return null when there's no match or unsupported type
          }
        }
        return null;  // Return null for keys not found in config
      })}
    </ul>
  );
}
