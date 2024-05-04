import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../contexts/FormContext";
import useLocalStorage from "../hooks/useLocalStorage";
import "./presetComponent.css";


const PresetComponent = () => {
  const { form, setForm, presets, setPresets, defaultPreset } = useContext(FormContext);
  const [presetName, setPresetName] = useLocalStorage("presetName", "");
  const [selectedPreset, setSelectedPreset] = useLocalStorage(
    "selectedPreset",
    ""
  );
  
  const [toggle, setToggle] = useState(false);

  useEffect(() => {
    if (selectedPreset !== "") {
      loadPreset(selectedPreset);
    }
  }, [selectedPreset]);

  const handlePresetNameChange = (e) => {
    setPresetName(e.target.value);
  };

  const addPreset = () => {
    if (presetName.trim() !== "") {
      const updatedPresets = [
        ...presets,
        { id: presetName.trim(), value: { ...form } },
      ];
      setPresets(updatedPresets);
      setSelectedPreset(presetName.trim());
      setPresetName("");
      setToggle(false);
    }
  };

  const deletePreset = (id) => {
    const updatedPresets = presets.filter((presets) => presets.id !== id);
    setPresets(updatedPresets);
    setSelectedPreset("");
    setForm(defaultPreset);
  };

  const updatePreset = (id) => {
    const updatedPresets = presets.map((presets) =>
      presets.id === id ? { id: id, value: { ...form } } : presets
    );
    setPresets(updatedPresets);
  };

  const loadPreset = (id) => {
    if (!id) setForm(defaultPreset);
    const presetToLoad = presets.find((presets) => presets.id === id);
    if (presetToLoad) {
      setForm(presetToLoad.value);
    }
  };

  return (
    <div className="presetWrapper">
      {toggle && (
          <div className="presetItem">
          <input
            type="text"
            value={presetName}
            onChange={handlePresetNameChange}
            placeholder="Enter presets name"
          />
          <button onClick={addPreset}>Add</button>
        </div>
      )}
      <div className="presetItem">

      <button onClick={() => setToggle(!toggle)}>{toggle ? "x" : "+"}</button>
      <select
        value={selectedPreset}
        onChange={(e) => setSelectedPreset(e.target.value)}
      >
        <option value="">-- Select a presets --</option>
        {presets.length > 0
          ? presets.map((presets) => (
              <option key={presets.id} value={presets.id}>
                {presets.id}
              </option>
            ))
          : null}
      </select>
      </div>
      {selectedPreset !== "" && (
        <div className="presetItem">
          <button onClick={() => updatePreset(selectedPreset)}>Save</button>
          <button onClick={() => deletePreset(selectedPreset)}>Delete</button>
        </div>
      )}
    </div>
  );
};

export default PresetComponent;
