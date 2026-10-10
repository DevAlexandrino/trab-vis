/**
 * Design B – Tipos de passe e o que vem depois.
 *
 * Tarefa: entender o ESTILO (que tipos de passe cada seleção usa) e a SEQUÊNCIA
 * (o que acontece depois de cada tipo de passe).
 *
 * Componentes:
 *   1. Resumo numérico (tabela) – volume, normalizações e indicadores de estilo.
 *   2. Matriz de setas 3 × 3 – linhas = comprimento (Curto/Médio/Longo), colunas = direção
 *      (Trás/Lado/Frente). Cada célula tem uma seta por time; a ESPESSURA da seta é a
 *      frequência normalizada (escala linear com zero em zero), a direção e o tamanho
 *      da seta mostram a própria categoria. Categorias explícitas substituem os clusters
 *      de cor arbitrária do original (problemas 2, 4 e 8).
 *   3. Barras agrupadas – a mesma frequência, para leitura precisa (comprimento > espessura).
 *   4. "O que vem depois" – ao clicar numa categoria, a distribuição da próxima ação na
 *      mesma posse (LEAD() no DuckDB) e os passes reais daquela categoria no campo (problema 6).
 */
import { d3 } from '../../lib.js';
import { consultar } from '../../db.js';
import { criarCampo, marcadorSeta } from '../../components/pitch.js';
import { legendaCategorica } from '../../components/legend.js';
import { mostrarTooltip, esconderTooltip } from '../../components/tooltip.js';
import {
  sqlResumo, sqlCategorias, sqlProxima, sqlPassesCategoria, FAIXAS, DIRECOES, TIMES, LIMIARES,
} from './queries.js';
import { COR_TIME, NOME_TIME, NORMALIZACAO, formatar } from './comum.js';

const DURACAO = 600;
const CATEGORIAS = FAIXAS.flatMap((f) => DIRECOES.map((d) => ({ faixa: f, direcao: d, id: `${f} · ${d}` })));
const PROXIMAS = [...CATEGORIAS.map((c) => c.id), 'Chute', 'Passe errado', 'Fim da posse'];

/**
 * Polígono de uma seta "gorda" de (x0,y0) a (x1,y1), com haste de espessura `w`.
 * Usamos um <path> preenchido (em vez de stroke + marker) para que a ponta cresça
 * proporcionalmente à espessura sem distorcer. `dupla` = ponta nas duas extremidades.
 */
function setaGorda(x0, y0, x1, y1, w, dupla = false) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len; // vetor unitário ao longo da seta
  const uy = (y1 - y0) / len;
  const nx = -uy; // vetor normal
  const ny = ux;
  const hw = Math.max(w * 1.9, 8); // largura da ponta
  const hl = Math.min(Math.max(w * 1.1, 7), len * 0.4); // comprimento da ponta
  const P = (t, s) => [x0 + ux * t + nx * s, y0 + uy * t + ny * s]; // t = ao longo, s = lateral
  const pts = dupla
    ? [P(0, 0), P(hl, hw / 2), P(hl, w / 2), P(len - hl, w / 2), P(len - hl, hw / 2), P(len, 0),
      P(len - hl, -hw / 2), P(len - hl, -w / 2), P(hl, -w / 2), P(hl, -hw / 2)]
    : [P(0, w / 2), P(len - hl, w / 2), P(len - hl, hw / 2), P(len, 0),
      P(len - hl, -hw / 2), P(len - hl, -w / 2), P(0, -w / 2)];
  return `M${pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join('L')}Z`;
}

export function criarDesignB(corpo) {
  const estado = { sel: CATEGORIAS.find((c) => c.faixa === 'Longo' && c.direcao === 'Frente') };
  let filtro = null;
  let categorias = [];

  const raiz = d3.select(corpo).append('div').attr('class', 'b-grade');
  const colEsq = raiz.append('div').attr('class', 'b-col');
  const colDir = raiz.append('div').attr('class', 'b-col');

  /* ---------------- 1. Resumo numérico ---------------- */
  colEsq.append('h4').text('Resumo');
  const tabela = colEsq.append('table').attr('class', 'b-resumo');

  /* ---------------- 2. Matriz de setas ---------------- */
  colEsq.append('h4').text('Tipos de passe (espessura = frequência)');
  const M = { w: 460, h: 330, l: 64, t: 26, r: 6, b: 4 };
  const cw = (M.w - M.l - M.r) / DIRECOES.length; // largura da célula
  const ch = (M.h - M.t - M.b) / FAIXAS.length; // altura da célula
  // Escalas de banda posicionam as células: direção → coluna, faixa de comprimento → linha
  const colX = d3.scaleBand().domain(DIRECOES).range([M.l, M.w - M.r]);
  const linY = d3.scaleBand().domain(FAIXAS).range([M.t, M.h - M.b]);
  // Comprimento visual da seta cresce com a faixa (Curto < Médio < Longo): fração da célula
  const fracao = { Curto: 0.32, Médio: 0.58, Longo: 0.84 };

  const svgM = colEsq.append('svg').attr('class', 'b-matriz').attr('viewBox', `0 0 ${M.w} ${M.h}`);
  svgM.selectAll('text.col').data(DIRECOES).join('text').attr('class', 'eixo-rotulo col')
    .attr('x', (d) => colX(d) + cw / 2).attr('y', 16).attr('text-anchor', 'middle')
    .text((d) => ({ Trás: '← Para trás', Lado: '↕ Para o lado', Frente: 'Para frente →' })[d]);
  svgM.selectAll('text.lin').data(FAIXAS).join('text').attr('class', 'eixo-rotulo lin')
    .attr('x', M.l - 8).attr('y', (d) => linY(d) + ch / 2).attr('text-anchor', 'end').attr('dy', '0.35em')
    .text((d) => d);
  svgM.selectAll('text.lin-sub').data(FAIXAS).join('text').attr('class', 'eixo-sub')
    .attr('x', M.l - 8).attr('y', (d) => linY(d) + ch / 2 + 13).attr('text-anchor', 'end')
    .text((d) => ({ Curto: `< ${LIMIARES.curto} jd`, Médio: `${LIMIARES.curto}–${LIMIARES.medio} jd`, Longo: `≥ ${LIMIARES.medio} jd` })[d]);

  const celulas = svgM.selectAll('g.b-celula').data(CATEGORIAS, (d) => d.id).join('g')
    .attr('class', 'b-celula')
    .attr('transform', (d) => `translate(${colX(d.direcao)},${linY(d.faixa)})`)
    .on('click', (_, d) => selecionar(d));
  celulas.append('rect').attr('class', 'b-fundo').attr('x', 2).attr('y', 2)
    .attr('width', cw - 4).attr('height', ch - 4).attr('rx', 6);

  /** Geometria da seta de um time dentro de uma célula (coordenadas locais da célula). */
  function geometria(c, time) {
    const lado = time === 'Spain' ? -1 : 1; // Espanha acima/à esquerda, Inglaterra abaixo/à direita
    if (c.direcao === 'Lado') {
      const L = (ch - 16) * fracao[c.faixa];
      const x = cw / 2 + lado * 14;
      return { x0: x, y0: ch / 2 + L / 2, x1: x, y1: ch / 2 - L / 2, dupla: true };
    }
    const L = (cw - 20) * fracao[c.faixa];
    const y = ch / 2 + lado * 13;
    const [a, b] = c.direcao === 'Frente' ? [cw / 2 - L / 2, cw / 2 + L / 2] : [cw / 2 + L / 2, cw / 2 - L / 2];
    return { x0: a, y0: y, x1: b, y1: y, dupla: false };
  }

  const legendaLargura = colEsq.append('div').attr('class', 'b-legenda-largura');
  legendaCategorica(colEsq.node(), TIMES.map((t) => ({ rotulo: NOME_TIME[t], cor: COR_TIME[t] })), 'Cor = seleção');

  /* ---------------- 3. Barras agrupadas ---------------- */
  colDir.append('h4').text('Frequência por tipo (leitura precisa)');
  const B = { w: 460, h: 300, l: 104, r: 46, t: 22, b: 6 };
  const svgB = colDir.append('svg').attr('class', 'b-barras').attr('viewBox', `0 0 ${B.w} ${B.h}`);
  // Escala de banda: uma faixa por categoria; sub-banda: um time por barra dentro da faixa
  const yB = d3.scaleBand().domain(CATEGORIAS.map((c) => c.id)).range([B.t, B.h - B.b]).padding(0.18);
  const ySub = d3.scaleBand().domain(TIMES).range([0, yB.bandwidth()]).padding(0.08);
  const xB = d3.scaleLinear().range([B.l, B.w - B.r]); // domínio definido a cada atualização
  const eixoB = svgB.append('g').attr('class', 'eixo').attr('transform', `translate(0,${B.t})`);
  const linhasB = svgB.selectAll('g.b-linha').data(CATEGORIAS, (d) => d.id).join('g')
    .attr('class', 'b-linha').attr('transform', (d) => `translate(0,${yB(d.id)})`)
    .on('click', (_, d) => selecionar(d));
  linhasB.append('rect').attr('class', 'b-fundo').attr('x', 0).attr('width', B.w).attr('y', -2)
    .attr('height', yB.bandwidth() + 4);
  linhasB.append('text').attr('class', 'eixo-rotulo').attr('x', B.l - 6).attr('y', yB.bandwidth() / 2)
    .attr('dy', '0.35em').attr('text-anchor', 'end').text((d) => d.id);

  /* ---------------- 4. O que vem depois ---------------- */
  const tituloProx = colDir.append('h4');
  const P = { w: 460, h: 330, l: 104, r: 46, t: 22, b: 6 };
  const svgP = colDir.append('svg').attr('class', 'b-proxima').attr('viewBox', `0 0 ${P.w} ${P.h}`);
  const yP = d3.scaleBand().domain(PROXIMAS).range([P.t, P.h - P.b]).padding(0.18);
  const yPSub = d3.scaleBand().domain(TIMES).range([0, yP.bandwidth()]).padding(0.08);
  const xP = d3.scaleLinear().range([P.l, P.w - P.r]);
  const eixoP = svgP.append('g').attr('class', 'eixo').attr('transform', `translate(0,${P.t})`);
  const linhasP = svgP.selectAll('g.p-linha').data(PROXIMAS).join('g')
    .attr('class', (d) => `p-linha ${CATEGORIAS.some((c) => c.id === d) ? '' : 'p-terminal'}`)
    .attr('transform', (d) => `translate(0,${yP(d)})`);
  linhasP.append('text').attr('class', 'eixo-rotulo').attr('x', P.l - 6).attr('y', yP.bandwidth() / 2)
    .attr('dy', '0.35em').attr('text-anchor', 'end').text((d) => d);
  const notaProx = colDir.append('p').attr('class', 'nota');

  colDir.append('h4').text('Esses passes no campo');
  const miniCampos = colDir.append('div').attr('class', 'b-minicampos');
  const campos = Object.fromEntries(TIMES.map((t) => {
    const bloco = miniCampos.append('div');
    const titulo = bloco.append('div').attr('class', 'mini-titulo').style('color', COR_TIME[t]);
    const campo = criarCampo(bloco.node(), { largura: 300 });
    return [t, { titulo, campo, seta: marcadorSeta(campo.svg, `seta-b-${t}`, COR_TIME[t]) }];
  }));
  legendaCategorica(colDir.node(), [
    { rotulo: 'passe certo', cor: '#555' },
    { rotulo: 'passe errado', cor: '#555', tracejado: true },
  ]);

  /* ---------------- Atualizações ---------------- */

  /** Destaca a categoria selecionada na matriz e nas barras (vínculo entre as vistas). */
  function marcarSelecao() {
    celulas.classed('selecionada', (d) => d.id === estado.sel.id);
    linhasB.classed('selecionada', (d) => d.id === estado.sel.id);
  }

  function selecionar(c) {
    estado.sel = c;
    marcarSelecao();
    atualizarSequencia();
  }

  function tooltipCategoria(ev, c, time) {
    const r = categorias.find((x) => x.time === time && x.faixa === c.faixa && x.direcao === c.direcao);
    if (!r) return;
    mostrarTooltip(`<strong style="color:${COR_TIME[time]}">${NOME_TIME[time]}</strong> – ${c.id}<br/>
      Frequência: <b>${formatar(r.v, filtro.norm, true)}</b> ${filtro.norm === 'pct' ? '' : NORMALIZACAO[filtro.norm].unidade}<br/>
      Total: ${r.n} passes · ${d3.format('.0f')(r.pct_completos)}% certos<br/>
      Comprimento médio: ${d3.format('.1f')(r.comp_medio)} jd<br/><em>Clique para ver o que vem depois</em>`, ev);
  }

  async function atualizar(f) {
    filtro = f;
    const [resumo, cats] = await Promise.all([consultar(sqlResumo(f)), consultar(sqlCategorias(f))]);
    categorias = cats;
    desenharResumo(resumo);
    desenharMatriz();
    desenharBarras();
    marcarSelecao();
    await atualizarSequencia();
  }

  function desenharResumo(resumo) {
    const por = Object.fromEntries(resumo.map((r) => [r.time, r]));
    const linhas = [
      ['Jogos (minutos)', (r) => `${r.jogos} (${r.minutos})`, null],
      ['Passes no total', (r) => d3.format(',')(r.passes), (e, i) => e.passes / i.passes],
      ['Passes por jogo', (r) => d3.format(',.0f')(r.por_jogo), (e, i) => e.por_jogo / i.por_jogo],
      ['Passes por 90 min', (r) => d3.format(',.0f')(r.por_90), (e, i) => e.por_90 / i.por_90],
      ['% de passes certos', (r) => `${d3.format('.1f')(r.pct_completos)}%`, null],
      ['% de passes longos', (r) => `${d3.format('.1f')(r.pct_longos)}%`, null],
      ['Passes por posse (média)', (r) => d3.format('.1f')(r.passes_por_posse), null],
    ];
    const [e, i] = [por.Spain, por.England];
    tabela.html(`
      <thead><tr><th></th>
        <th style="color:${COR_TIME.Spain}">Espanha</th>
        <th style="color:${COR_TIME.England}">Inglaterra</th>
        <th title="Quanto a Inglaterra fez a menos que a Espanha">Ing vs Esp</th></tr></thead>
      <tbody>${linhas.map(([rot, fmt, razao]) => `
        <tr><td>${rot}</td><td>${fmt(e)}</td><td>${fmt(i)}</td>
        <td>${razao ? d3.format('+.0%')(1 / razao(e, i) - 1) : ''}</td></tr>`).join('')}
      </tbody>`);
  }

  function desenharMatriz() {
    // ESCALA DE ESPESSURA: linear de 0 a 20 px, domínio [0, maior frequência entre os
    // dois times]. Zero em zero → espessura proporcional ao valor (comparação honesta).
    const max = d3.max(categorias, (d) => d.v);
    const larg = d3.scaleLinear().domain([0, max]).range([0, 20]);
    const valor = (c, t) => categorias.find((x) => x.time === t && x.faixa === c.faixa && x.direcao === c.direcao)?.v ?? 0;

    celulas.selectAll('path.b-seta')
      .data((c) => TIMES.map((t) => ({ c, t })), (d) => d.t)
      .join('path')
      .attr('class', 'b-seta')
      .attr('fill', (d) => COR_TIME[d.t])
      .on('mousemove', (ev, d) => tooltipCategoria(ev, d.c, d.t))
      .on('mouseleave', esconderTooltip)
      .transition().duration(DURACAO)
      .attr('d', (d) => {
        const g = geometria(d.c, d.t);
        return setaGorda(g.x0, g.y0, g.x1, g.y1, Math.max(1.2, larg(valor(d.c, d.t))), g.dupla);
      });

    // Legenda da espessura: três setas de referência com valores "redondos" da escala
    legendaLargura.selectAll('*').remove();
    const ref = larg.ticks(3).filter((v) => v > 0).slice(-3);
    const svgL = legendaLargura.append('svg').attr('viewBox', '0 0 460 44').attr('class', 'legenda');
    svgL.append('text').attr('class', 'legenda-titulo').attr('x', 6).attr('y', 11)
      .text(`Espessura = ${NORMALIZACAO[filtro.norm].unidade}`);
    ref.forEach((v, k) => {
      const x = 10 + k * 130;
      svgL.append('path').attr('fill', '#777').attr('d', setaGorda(x, 30, x + 60, 30, larg(v)));
      svgL.append('text').attr('class', 'legenda-nota').attr('x', x + 66).attr('y', 30).attr('dy', '0.35em')
        .text(formatar(v, filtro.norm));
    });
  }

  function desenharBarras() {
    xB.domain([0, d3.max(categorias, (d) => d.v)]).nice();
    eixoB.transition().duration(DURACAO)
      .call(d3.axisTop(xB).ticks(5).tickSize(-(B.h - B.t - B.b)).tickFormat((v) => formatar(v, filtro.norm)));
    const valor = (c, t) => categorias.find((x) => x.time === t && x.faixa === c.faixa && x.direcao === c.direcao) ?? { v: 0, n: 0 };

    linhasB.selectAll('rect.barra')
      .data((c) => TIMES.map((t) => ({ c, t, ...valor(c, t) })), (d) => d.t)
      .join((en) => en.append('rect').attr('class', 'barra').attr('x', B.l).attr('width', 0))
      .attr('y', (d) => ySub(d.t)).attr('height', ySub.bandwidth()).attr('fill', (d) => COR_TIME[d.t])
      .on('mousemove', (ev, d) => tooltipCategoria(ev, d.c, d.t))
      .on('mouseleave', esconderTooltip)
      .transition().duration(DURACAO)
      .attr('width', (d) => xB(d.v) - B.l);

    linhasB.selectAll('text.valor')
      .data((c) => TIMES.map((t) => ({ c, t, ...valor(c, t) })), (d) => d.t)
      .join('text').attr('class', 'valor')
      .attr('y', (d) => ySub(d.t) + ySub.bandwidth() / 2).attr('dy', '0.35em')
      .text((d) => formatar(d.v, filtro.norm))
      .transition().duration(DURACAO)
      .attr('x', (d) => xB(d.v) + 3);
  }

  async function atualizarSequencia() {
    const c = estado.sel;
    const [prox, passes] = await Promise.all([
      consultar(sqlProxima(filtro, c.faixa, c.direcao)),
      consultar(sqlPassesCategoria(filtro, c.faixa, c.direcao)),
    ]);
    if (c !== estado.sel) return; // outra seleção chegou antes

    tituloProx.html(`O que vem depois de um passe <span class="sel">${c.id}</span>?`);
    const valor = (k, t) => prox.find((x) => x.proxima === k && x.time === t) ?? { pct: 0, n: 0 };

    xP.domain([0, Math.max(10, d3.max(prox, (d) => d.pct))]).nice();
    eixoP.transition().duration(DURACAO)
      .call(d3.axisTop(xP).ticks(5).tickSize(-(P.h - P.t - P.b)).tickFormat((v) => `${v}%`));

    const dadosLinha = (k) => TIMES.map((t) => ({ k, t, ...valor(k, t) }));
    linhasP.selectAll('rect.barra').data(dadosLinha, (d) => d.t)
      .join((en) => en.append('rect').attr('class', 'barra').attr('x', P.l).attr('width', 0))
      .attr('y', (d) => yPSub(d.t)).attr('height', yPSub.bandwidth()).attr('fill', (d) => COR_TIME[d.t])
      .on('mousemove', (ev, d) => mostrarTooltip(`<strong style="color:${COR_TIME[d.t]}">${NOME_TIME[d.t]}</strong><br/>
          Depois de <b>${c.id}</b> → <b>${d.k}</b><br/>${d3.format('.1f')(d.pct)}% (${d.n} passes)`, ev))
      .on('mouseleave', esconderTooltip)
      .transition().duration(DURACAO)
      .attr('width', (d) => xP(d.pct) - P.l);
    linhasP.selectAll('text.valor').data(dadosLinha, (d) => d.t)
      .join('text').attr('class', 'valor')
      .attr('y', (d) => yPSub(d.t) + yPSub.bandwidth() / 2).attr('dy', '0.35em')
      .text((d) => (d.n ? `${d3.format('.0f')(d.pct)}%` : ''))
      .transition().duration(DURACAO)
      .attr('x', (d) => xP(d.pct) + 3);

    const n = Object.fromEntries(TIMES.map((t) => [t, d3.sum(prox.filter((x) => x.time === t), (x) => x.n)]));
    notaProx.html(`Próxima ação do mesmo time na mesma posse (identificador <code>possession</code> do StatsBomb,
      via <code>LEAD()</code>). Base: ${n.Spain} passes da Espanha e ${n.England} da Inglaterra.
      <b>Passe errado</b> = o próprio passe não chegou; <b>Fim da posse</b> = passe certo, mas a posse
      terminou sem novo passe ou chute (ex.: perda em drible, falta).`);

    // Passes reais da categoria em dois campos lado a lado (mesma escala, sem depender de memória)
    for (const t of TIMES) {
      const { titulo, campo, seta } = campos[t];
      const meus = passes.filter((p) => p.time === t);
      titulo.text(`${NOME_TIME[t]} – ${meus.length} passes`);
      const { x, y } = campo;
      // Opacidade cai com a quantidade para reduzir a oclusão (problema 5)
      const opac = Math.max(0.12, Math.min(0.7, 40 / Math.max(1, meus.length)));
      campo.dados.selectAll('line.passe').data(meus).join('line').attr('class', 'passe')
        .attr('x1', (d) => x(d.x0)).attr('y1', (d) => y(d.y0))
        .attr('x2', (d) => x(d.x1)).attr('y2', (d) => y(d.y1))
        .attr('stroke', COR_TIME[t]).attr('stroke-width', 1.1)
        .attr('stroke-dasharray', (d) => (d.completo ? null : '3 2'))
        .attr('marker-end', seta)
        .attr('opacity', 0)
        .transition().duration(DURACAO)
        .attr('opacity', opac);
    }
  }

  return { atualizar };
}
