import { FormProvider } from './contexts/FormContext';
import PromptForm from "./components/PromptForm";
import './App.css';
import Sidebar from './components/Sidebar';


function App() {
  return(
    <FormProvider>
      <div className="App">
        <Sidebar />
        <main>
          <PromptForm />
        </main>
      </div>
    </FormProvider>
  );
}

export default App;