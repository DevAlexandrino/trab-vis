/**
 * Tooltip HTML único, compartilhado por todos os gráficos.
 */
const el = () => document.getElementById('tooltip');

/** Mostra o tooltip perto do ponteiro. @param {string} html @param {MouseEvent} evento */
export function mostrarTooltip(html, evento) {
  const t = el();
  if (!t) return;
  t.innerHTML = html;
  t.hidden = false;
  // Posiciona à direita/abaixo do ponteiro, mantendo dentro da janela
  const { innerWidth: W, innerHeight: H } = window;
  const r = t.getBoundingClientRect();
  let x = evento.clientX + 14;
  let y = evento.clientY + 14;
  if (x + r.width > W - 8) x = evento.clientX - r.width - 14;
  if (y + r.height > H - 8) y = evento.clientY - r.height - 14;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
}

export function esconderTooltip() {
  const t = el();
  if (t) t.hidden = true;
}

