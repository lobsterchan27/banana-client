import { FormProvider } from './contexts/FormContext';
import Form from "./components/Form";
import PresetComponent from './components/PresetComponent';
import './App.css';

function App() {
  return(
    <FormProvider>
      <div className="App">
        <PresetComponent />
        <Form />
      </div>
    </FormProvider>
  );
}

export default App;