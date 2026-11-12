/*
 * Tocador dos efeitos do mk potion no navegador (copiado para public/jogos/mkpotion/ no build).
 *
 * O áudio do pygame no navegador é preenchido entre um quadro e outro do jogo; quando um quadro
 * atrasa, o som falha e chia. Aqui os sons tocam pela Web Audio, que roda à parte do jogo:
 * o Python só chama window.mkpauseSom.tocar(nome, volume).
 */
window.mkpauseSom = (() => {
  const nomes = ['select', 'pour', 'undo', 'win'];
  const buffers = {};
  let ctx = null;

  // O navegador só libera o som depois de um toque ou clique: o contexto nasce no primeiro gesto.
  function iniciar() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return;
    }
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    ctx = new Contexto();
    for (const nome of nomes) {
      fetch(`sons/${nome}.wav`)
        .then((resposta) => resposta.arrayBuffer())
        // Forma com callbacks: o Safari antigo não devolve Promise em decodeAudioData.
        .then((dados) => new Promise((ok, erro) => ctx.decodeAudioData(dados, ok, erro)))
        .then((buffer) => { buffers[nome] = buffer; })
        .catch(() => { /* Sem este som: o jogo segue sem áudio. */ });
    }
  }
  for (const evento of ['pointerdown', 'touchstart', 'keydown']) {
    window.addEventListener(evento, iniciar, { capture: true, passive: true });
  }

  return {
    /** Devolve false se o som ainda não carregou (o jogo simplesmente não toca). */
    tocar(nome, volume) {
      iniciar();
      const buffer = buffers[nome];
      if (!ctx || !buffer) return false;
      const fonte = ctx.createBufferSource();
      fonte.buffer = buffer;
      const ganho = ctx.createGain();
      ganho.gain.value = Math.max(0, Math.min(1, Number(volume) || 0));
      fonte.connect(ganho).connect(ctx.destination);
      fonte.start();
      return true;
    },
  };
})();
