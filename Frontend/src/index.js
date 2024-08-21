import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import { DarkModeProvider } from './DarkModeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DarkModeProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </DarkModeProvider>
);


reportWebVitals();
