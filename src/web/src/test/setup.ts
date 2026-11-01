import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { reiniciarPreferencias } from '../preferencias/preferencias';
import { fecharPreferencias } from '../preferencias/PainelPreferencias';

afterEach(() => {
  cleanup();
  // Cada teste começa em português, sem opções de acessibilidade.
  reiniciarPreferencias();
  fecharPreferencias();
});

// O jsdom não implementa rolagem; o ScrollRestoration chama window.scrollTo.
window.scrollTo = () => {};
