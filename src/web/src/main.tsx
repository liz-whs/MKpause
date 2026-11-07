import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { api } from './data/api';
import './styles/index.css';
import { iniciarVLibrasSeLigado } from './preferencias/VLibras';

// Libras (VLibras): precisa carregar junto com a página.
iniciarVLibrasSeLigado();

// Retoma a sessão do backend (cookie) e carrega os dados da conta.
void api.sincronizar().catch(() => undefined); // A raiz apresenta o erro e a opção de tentar novamente.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
