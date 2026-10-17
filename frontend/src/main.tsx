import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { logger } from './utils/logger';

logger.info('Free API Hub Frontend initialized! Mode: ' + import.meta.env.MODE);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

