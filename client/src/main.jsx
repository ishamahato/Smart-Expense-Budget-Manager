import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
