import { useState } from "react";
import "./App.css";
import Form from "./components/Form";
import useLocalStorage from "./hooks/useLocalStorage";

function App() {
  const [textResponse, setTextResponse] = useState("");
  const [form, setForm] = useLocalStorage(
    {
      prompt: "",
    },
    "form"
  );

  return(
    <div className="App">
      <h4>{textResponse}</h4>
      <Form form={form} setForm={setForm} setTextResponse={setTextResponse} />
    </div>
  );
}

export default App;
