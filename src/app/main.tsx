import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { captureSensitiveLinkToken } from '../auth/sensitiveLink';
import '../styles/app.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('O elemento raiz da aplicação não foi encontrado.');
}

const initialSensitiveLink = captureSensitiveLinkToken(window.location.href, window.history);

createRoot(rootElement).render(
  <StrictMode>
    <App initialSensitiveLink={initialSensitiveLink} />
  </StrictMode>,
);
