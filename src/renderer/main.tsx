import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import '@/shared/styles/global.css';
import App from '@/app/App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
