/**
 * Roteamento por hash (#/caso1, #/caso2, ...) e página inicial.
 * Sem framework: cada rota limpa <main> e pede ao módulo do caso para se desenhar.
 */
import { CASOS } from './cases/registry.js';
import { criarLayoutCaso } from './layout.js';
import { esconderTooltip } from './components/tooltip.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav-casos');
let limpezaAtual = null; // função de limpeza devolvida pelo caso ativo
let renderId = 0; // evita que um caso lento sobrescreva a rota seguinte

// Navegação gerada a partir do registro
nav.innerHTML = CASOS.map((c) => `<a href="#/${c.id}" data-id="${c.id}">${c.rotulo}</a>`).join('');

function paginaInicial() {
  app.innerHTML = `
    <section class="inicio">
      <h1>Redesign de visualizações</h1>
      <p>Cada caso apresenta o gráfico <strong>original</strong>, a crítica e duas propostas de
      redesign (<strong>Design A</strong> e <strong>Design B</strong>) lado a lado. Os dados são
      carregados e transformados no navegador com DuckDB-WASM; os gráficos são feitos em D3.js.</p>
      <div class="cards">
        ${CASOS.map((c) => `
          <a class="card" href="#/${c.id}">
            <h2>${c.rotulo}</h2>
            <p>${c.resumo}</p>
          </a>`).join('')}
      </div>
    </section>`;
}

async function rota() {
  const id = location.hash.replace(/^#\/?/, '');
  const meuId = ++renderId;
  if (limpezaAtual) {
    limpezaAtual();
    limpezaAtual = null;
  }
  esconderTooltip();
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('ativo', a.dataset.id === id));

  const caso = CASOS.find((c) => c.id === id);
  if (!caso) return paginaInicial();

  app.innerHTML = '<p class="carregando">Carregando caso…</p>';
  try {
    const modulo = await caso.carregar();
    if (meuId !== renderId) return;
    const layout = criarLayoutCaso(app, modulo.meta);
    const limpeza = await modulo.render(layout, { id });
    if (meuId === renderId && typeof limpeza === 'function') limpezaAtual = limpeza;
  } catch (e) {
    console.error(e);
    if (meuId === renderId) {
      app.insertAdjacentHTML('afterbegin', `<p class="erro">Erro ao carregar o caso: ${e.message}</p>`);
    }
  }
}

window.addEventListener('hashchange', rota);
rota();

