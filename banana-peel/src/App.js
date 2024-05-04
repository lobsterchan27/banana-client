import { FormProvider } from './contexts/FormContext';
import PromptForm from "./components/PromptForm";
import './App.css';
import Sidebar from './components/Sidebar';

function App() {
  return(
    <FormProvider>
        <Sidebar />
      <div className="App">
        <PromptForm />
      </div>
    </FormProvider>
  );
}

export default App;