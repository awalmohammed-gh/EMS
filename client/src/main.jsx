import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ManagementContextProvider } from './context/ManagementContextProvider.jsx'
import { ThemeContextProvider } from './context/ThemeContext.jsx'
import { AttendanceProvider } from './context/AttendanceContext.jsx'

createRoot(document.getElementById("root")).render(
  <ThemeContextProvider>
    <AuthProvider>
      <ManagementContextProvider>
        <AttendanceProvider>
          <App />
        </AttendanceProvider>
      </ManagementContextProvider>
    </AuthProvider>
  </ThemeContextProvider>,
);

