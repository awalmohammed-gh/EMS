// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ManagementContextProvider } from './context/ManagementContextProvider.jsx'

createRoot(document.getElementById("root")).render(
  <ManagementContextProvider>
    <App />
  </ManagementContextProvider>,
);
