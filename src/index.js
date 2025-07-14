import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Assuming your main App component is in App.js or App.jsx
import './index.css'; // Optional: if you have a global CSS file

// Get the root element from your HTML (usually a div with id="root")
const container = document.getElementById('root');

// Create a root.
const root = createRoot(container);

// Initial render: Render your App component to the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
