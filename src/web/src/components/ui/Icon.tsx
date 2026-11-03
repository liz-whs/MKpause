/**
 * Ícones de traço do protótipo: grade de 24 px, traço de 2,2 px e pontas redondas.
 * São decorativos por padrão (aria-hidden). Um ícone sozinho num botão
 * precisa de aria-label no próprio botão.
 */
const PATHS = {
  inicio: 'M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6',
  atividades: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  broto: 'M12 21v-9 M12 12c0-4.2-3-6.5-7.5-6.5 0 4.2 3 6.5 7.5 6.5z M12 14.5c0-3.4 2.6-5.5 6.5-5.5 0 3.4-2.6 5.5-6.5 5.5z',
  respiracao: 'M3 8h11a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h8',
  porta: 'M5 21V4a1 1 0 0 1 1-1h9v18 M3 21h18 M15 3l4 2v16 M11.5 12h.01',
  pausa: 'M9 5v14 M15 5v14',
  mao: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11 M11 10V4.5a1.5 1.5 0 0 1 3 0V11 M14 10.5V6a1.5 1.5 0 0 1 3 0v7 M8 13l-1.6-1.6a1.6 1.6 0 0 0-2.3 2.2L8 18c1.3 1.6 3 3 5.5 3H14a5 5 0 0 0 5-5v-3',
  alerta: 'M12 4l9 16H3z M12 10v4 M12 17h.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7.5h.01',
  pessoas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7 M18 14a6 6 0 0 1 4 7',
  sair: 'M10 4H5v16h5 M14 8l4 4-4 4 M18 12H9',
  check: 'M5 12l5 5 9-10',
  voltar: 'M15 5l-7 7 7 7',
  seguir: 'M9 5l7 7-7 7',
  cadeado: 'M6 11h12v10H6z M8 11V8a4 4 0 0 1 8 0v3',
  agua: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z',
  alongar: 'M12 6.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z M4 9l8 1.5L20 9 M12 10.5V15 M12 15l-3.5 6 M12 15l3.5 6',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.5v2 M12 19.5v2 M4.6 4.6L6 6 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4L6 18 M18 6l1.4-1.4',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  fechar: 'M6 6l12 12 M18 6L6 18',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  pessoa: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  sino: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0',
  lapis: 'M4 20h4l11-11-4-4L4 16z M13.5 6.5l4 4',
  duvida: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14 M12 17.5h.01',
  telefone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  musica: 'M9 18V6l11-2v12 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  play: 'M8 5v14l11-7z',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  seta: 'M5 12h14 M13 6l6 6-6 6',
  coracao: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  fruta: 'M12 7c-2-1.6-6-1-6 4 0 4.5 3 9 6 8 3 1 6-3.5 6-8 0-5-4-5.6-6-4z M12 7c0-2 1-3.5 3-4',
  caminhar: 'M13 5.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z M10 21l2-6 3 3v3 M12 15l1-6 3 3h3 M13 9l-3.5 1L8 13',
  conversa: 'M4 5h16v11H9l-5 4z',
  lua: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  vinculo: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  ficha: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6',
  camadas: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  mais: 'M12 5v14 M5 12h14',
  lixeira: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  envelope: 'M3 5h18v14H3z M3 6l9 7 9-7',
  // Acessibilidade: pessoa de braços abertos dentro do círculo.
  acessibilidade: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.3h.01 M7.5 10l4.5 1.2 4.5-1.2 M12 11.2v3 M12 14.2l-2.3 3.8 M12 14.2l2.3 3.8',
  globo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3.5 12h17 M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9 M12 3c-2.4 2.6-3.6 5.6-3.6 9s1.2 6.4 3.6 9',
  chave: 'M8 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h9 M18 12v3 M15 12v2',
  copiar: 'M9 9h11v11H9z M5 15H4V4h11v1',
  pocao: 'M9 3h6 M10 3v5.5L5.6 16.8A2.8 2.8 0 0 0 8 21h8a2.8 2.8 0 0 0 2.4-4.2L14 8.5V3 M7.3 14h9.4',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 24, strokeWidth = 2.2, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
