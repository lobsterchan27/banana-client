import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../contexts/FormContext";
import useLocalStorage from "../hooks/useLocalStorage";
import formConfig from "../formConfig";

const PresetComponent = () => {
  const { form, setForm, presets, setPresets } = useContext(FormContext);
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
      setPresetName(""); // Clear input after adding presets
    }
  };

  const deletePreset = (id) => {
    const updatedPresets = presets.filter((presets) => presets.id !== id);
    setPresets(updatedPresets);
    setSelectedPreset("");
    setForm(formConfig);
  };

  const updatePreset = (id) => {
    const updatedPresets = presets.map((presets) =>
      presets.id === id ? { id: id, value: { ...form } } : presets
    );
    setPresets(updatedPresets);
  };

  const loadPreset = (id) => {
    if (!id) setForm(formConfig);
    const presetToLoad = presets.find((presets) => presets.id === id);
    if (presetToLoad) {
      setForm(presetToLoad.value);
    }
  };

  return (
    <div>
      {toggle && (
          <>
          <input
            type="text"
            value={presetName}
            onChange={handlePresetNameChange}
            placeholder="Enter presets name"
          />
          <button onClick={addPreset}>Add</button>
        </>
      )}
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
      {selectedPreset !== "" && (
        <>
          <button onClick={() => updatePreset(selectedPreset)}>Save</button>
          <button onClick={() => deletePreset(selectedPreset)}>Delete</button>
        </>
      )}
    </div>
  );
};

export default PresetComponent;
