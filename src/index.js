import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Optional: import './index.css' for global styles

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
