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

  const handleArrayChange = (key) => (e) => {
    const values = e.target.value.split(',').map(item => item.trim());
    setForm({ ...form, [key]: values });
  };

  return (
    <ul className="paramWrapper">
      {includeKeys && includeKeys.map((key) => {
        if (paramConfig[key]) {  // Ensure the key exists in the configuration
          switch (paramConfig[key].type) {
            case "string":
              if (paramConfig[key].textArea) {
                return (
                  <li key={key} className="paramItem">
                    <label>
                      {key}:
                      <TextAreaInput name={key} />
                    </label>
                  </li>
                );
              } else {
                return (
                  <li key={key} className="paramItem">
                    <label>
                      {key}:
                      <input type="text" value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </label>
                  </li>
                );
              }
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
            case "array":
              if (paramConfig[key].items && paramConfig[key].items.type === "string") {
                return (
                  <li key={key} className="paramItem">
                    <label>
                      {key}:
                      <input
                        type="text"
                        value={form[key]?.join(', ') || ''}
                        onChange={handleArrayChange(key)}
                      />
                    </label>
                  </li>
                );
              }
              break;
            default:
              return null;  // Return null when there's no match or unsupported type
          }
        }
        return null;  // Return null for keys not found in config
      })}
    </ul>
  );
}
