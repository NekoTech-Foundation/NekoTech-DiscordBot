import React from 'react';
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'

const rootElement = document.getElementById('root');

if (rootElement) {
    rootElement.removeAttribute('aria-hidden');
}

ReactDOM.createRoot(rootElement!).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>
) 