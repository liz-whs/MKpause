import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import './styles/index.css';
import { iniciarVLibrasSeLigado } from './preferencias/VLibras';

// Libras (VLibras): precisa carregar junto com a página.
iniciarVLibrasSeLigado();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
