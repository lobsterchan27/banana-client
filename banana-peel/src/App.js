import "./App.css";
import Form from "./components/Form";
import useForm from "./hooks/useForm";

function App() {
  const [form, setForm] = useForm(
    {
      name: "",
      email: "",
    },
    "form"
  );

  return(
    <div className="App">
      <Form form={form} setForm={setForm} />
    </div>
  );
}

export default App;
