import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { reiniciarPreferencias } from '../preferencias/preferencias';
import { fecharPreferencias } from '../preferencias/PainelPreferencias';
import { reiniciarSimulacao } from '../data/codigos';

afterEach(() => {
  cleanup();
  for (const chave of Object.keys(localStorage)) {
    if (chave.startsWith('mkpause:cuidados:')) localStorage.removeItem(chave);
  }
  // Cada teste começa em português, sem opções de acessibilidade.
  reiniciarPreferencias();
  fecharPreferencias();
  reiniciarSimulacao();
});

// O jsdom não implementa rolagem; o ScrollRestoration chama window.scrollTo.
window.scrollTo = () => {};
