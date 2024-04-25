import "./App.css";
import Form from "./components/Form";
import useLocalStorage from "./hooks/useLocalStorage";

function App() {
  const [textResponse, setTextResponse] = useLocalStorage('textResponse', []);
  const [form, setForm] = useLocalStorage(
    "form",
    {
      prompt: "",
    }
  );
  const currentIndex = textResponse.length - 1;

  return(
    <div className="App">
      <p></p>
      <p className="textResponse">{textResponse[textResponse.length-1]}</p>
      <Form form={form} setForm={setForm} currentIndex={currentIndex} setTextResponse={setTextResponse} />
    </div>
  );
}

export default App;
