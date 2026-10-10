/**
 * Layout padrão de um caso: cabeçalho (título, pergunta, fonte, controles) +
 * três painéis lado a lado (Original | Design A | Design B) + rodapé (dados e método).
 *
 * Cada painel tem botão "expandir" (ocupa a largura toda) e há um seletor global
 * "lado a lado / empilhado". Os SVGs usam viewBox, então se adaptam sem redesenhar.
 *
 * @param {HTMLElement} raiz
 * @param {{titulo:string, pergunta:string, fonte:string,
 *          paineis:{original:{titulo,tarefa}, designA:{titulo,tarefa}, designB:{titulo,tarefa}}}} meta
 * @returns {{raiz, controles, original, designA, designB, rodape}} elementos onde o caso desenha
 */
export function criarLayoutCaso(raiz, meta) {
  const p = meta.paineis;
  const painel = (chave, tag, cfg) => `
    <article class="painel" data-painel="${chave}">
      <header class="painel-cab">
        <span class="tag tag-${chave}">${tag}</span>
        <h3>${cfg.titulo}</h3>
        <button class="btn-expandir" title="Expandir/recolher este painel" aria-label="Expandir painel">⤢</button>
        ${cfg.tarefa ? `<p class="tarefa"><strong>Tarefa:</strong> ${cfg.tarefa}</p>` : ''}
      </header>
      <div class="painel-corpo"></div>
    </article>`;

  raiz.innerHTML = `
    <section class="caso">
      <header class="caso-cab">
        <div class="caso-titulo">
          <h1>${meta.titulo}</h1>
          <p class="pergunta">${meta.pergunta}</p>
          <p class="fonte">${meta.fonte}</p>
        </div>
        <div class="caso-acoes">
          <div class="caso-controles"></div>
          <div class="grupo-botoes alternar-layout" role="group" aria-label="Disposição dos painéis">
            <button data-layout="lado" class="ativo">Lado a lado</button>
            <button data-layout="pilha">Empilhado</button>
          </div>
        </div>
      </header>
      <div class="paineis lado">
        ${painel('original', 'Original', p.original)}
        ${painel('designA', 'Design A', p.designA)}
        ${painel('designB', 'Design B', p.designB)}
      </div>
      <section class="caso-rodape"></section>
    </section>`;

  const sec = raiz.querySelector('.caso');
  const paineis = sec.querySelector('.paineis');

  // Alternar disposição lado a lado / empilhada
  sec.querySelectorAll('.alternar-layout button').forEach((b) =>
    b.addEventListener('click', () => {
      paineis.className = `paineis ${b.dataset.layout}`;
      sec.querySelectorAll('.alternar-layout button').forEach((x) => x.classList.toggle('ativo', x === b));
    }),
  );
  // Expandir um painel para a largura total
  sec.querySelectorAll('.btn-expandir').forEach((b) =>
    b.addEventListener('click', () => b.closest('.painel').classList.toggle('expandido')),
  );

  const corpo = (k) => sec.querySelector(`[data-painel="${k}"] .painel-corpo`);
  return {
    raiz: sec,
    controles: sec.querySelector('.caso-controles'),
    original: corpo('original'),
    designA: corpo('designA'),
    designB: corpo('designB'),
    rodape: sec.querySelector('.caso-rodape'),
  };
}

/**
 * Cria um grupo de botões exclusivos (tipo "radio") e devolve o elemento.
 * @param {string} rotulo
 * @param {{valor:string, texto:string}[]} opcoes
 * @param {string} inicial
 * @param {(valor:string)=>void} aoMudar
 */
export function grupoBotoes(rotulo, opcoes, inicial, aoMudar) {
  const wrap = document.createElement('div');
  wrap.className = 'controle';
  wrap.innerHTML = `<span class="controle-rotulo">${rotulo}</span>
    <div class="grupo-botoes" role="group" aria-label="${rotulo}">
      ${opcoes.map((o) => `<button data-v="${o.valor}" class="${o.valor === inicial ? 'ativo' : ''}">${o.texto}</button>`).join('')}
    </div>`;
  wrap.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((x) => x.classList.toggle('ativo', x === b));
      aoMudar(b.dataset.v);
    }),
  );
  return wrap;
}

/** Cria uma caixa de seleção com rótulo e devolve o elemento. */
export function caixaSelecao(texto, inicial, aoMudar) {
  const wrap = document.createElement('label');
  wrap.className = 'controle controle-check';
  wrap.innerHTML = `<input type="checkbox" ${inicial ? 'checked' : ''}/> <span>${texto}</span>`;
  wrap.querySelector('input').addEventListener('change', (e) => aoMudar(e.target.checked));
  return wrap;
}

