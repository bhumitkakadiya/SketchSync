import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useThemeStore } from './store/themeStore.js'

// Apply saved theme immediately before first render
const { theme, applyTheme } = useThemeStore.getState();
applyTheme(theme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
