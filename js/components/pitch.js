/**
 * Campo de futebol em SVG + "projeção" das coordenadas StatsBomb para a tela.
 *
 * Sistema de coordenadas dos dados (StatsBomb):
 *   x ∈ [0, 120] jardas ao longo do campo; y ∈ [0, 80] jardas na largura.
 *   Os eventos de cada time já vêm normalizados para que ele ATAQUE DA ESQUERDA
 *   PARA A DIREITA (x crescente). Com y crescendo para baixo, o topo do desenho
 *   é o lado ESQUERDO de quem ataca e a base é o lado DIREITO.
 *
 * Projeção: duas escalas lineares (d3.scaleLinear) com o MESMO fator jardas→pixels
 * nos dois eixos, preservando a proporção 3:2 do campo (sem distorção).
 */
import { d3 } from '../lib.js';

/** Dimensões do campo StatsBomb, em jardas. */
export const CAMPO = { comprimento: 120, largura: 80 };

/**
 * Cria um <svg> responsivo com o campo desenhado.
 * @param {HTMLElement|d3.Selection} pai
 * @param {{largura?:number, margem?:{t,r,b,l}, rotulos?:boolean, classe?:string}} opcoes
 * @returns {{svg, g, fundo, dados, x, y, w, h}} camadas: `fundo` (abaixo das linhas, p/ heatmaps)
 *          e `dados` (acima das linhas, p/ setas); x/y são as escalas jardas → pixels
 */
export function criarCampo(pai, { largura = 480, margem, rotulos = true, classe = '' } = {}) {
  const m = margem ?? { t: rotulos ? 18 : 4, r: 6, b: rotulos ? 22 : 4, l: 6 };
  const w = largura - m.l - m.r;
  const h = (w * CAMPO.largura) / CAMPO.comprimento; // mesma razão jardas/pixel nos dois eixos

  // Escala x: jardas ao longo do campo → pixels horizontais
  const x = d3.scaleLinear().domain([0, CAMPO.comprimento]).range([0, w]);
  // Escala y: jardas na largura → pixels verticais (y=0 no topo, como nos dados)
  const y = d3.scaleLinear().domain([0, CAMPO.largura]).range([0, h]);

  const svg = d3
    .select(pai)
    .append('svg')
    .attr('class', `campo ${classe}`)
    .attr('viewBox', `0 0 ${largura} ${h + m.t + m.b}`)
    .attr('role', 'img');

  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  const fundo = g.append('g').attr('class', 'campo-fundo'); // heatmaps ficam embaixo das linhas
  const linhas = g.append('g').attr('class', 'campo-linhas');
  const dados = g.append('g').attr('class', 'campo-dados'); // setas ficam por cima

  desenharLinhas(linhas, x, y);

  if (rotulos) {
    // Orientação explícita (problema 7 do original): sentido de ataque e lados
    g.append('text').attr('class', 'campo-rotulo').attr('x', w / 2).attr('y', -5)
      .attr('text-anchor', 'middle').text('lado esquerdo do ataque');
    g.append('text').attr('class', 'campo-rotulo').attr('x', w / 2).attr('y', h + 14)
      .attr('text-anchor', 'middle').text('lado direito do ataque');
    g.append('text').attr('class', 'campo-rotulo campo-ataque').attr('x', w).attr('y', h + 14)
      .attr('text-anchor', 'end').text('ataque →');
  }

  return { svg, g, fundo, dados, x, y, w, h };
}

/** Linhas oficiais do campo (medidas em jardas, convertidas pelas escalas). */
function desenharLinhas(g, x, y) {
  const L = CAMPO.comprimento;
  const A = CAMPO.largura;
  const ret = (x0, y0, x1, y1) =>
    g.append('rect').attr('x', x(x0)).attr('y', y(y0))
      .attr('width', x(x1) - x(x0)).attr('height', y(y1) - y(y0));

  ret(0, 0, L, A); // linhas laterais e de fundo
  g.append('line').attr('x1', x(L / 2)).attr('x2', x(L / 2)).attr('y1', y(0)).attr('y2', y(A)); // meio-campo
  g.append('circle').attr('cx', x(L / 2)).attr('cy', y(A / 2)).attr('r', x(10) - x(0)); // círculo central (r = 10 jd)
  // Grandes áreas (18 jd de profundidade, de y=18 a y=62) e pequenas áreas (6 jd, y=30 a 50)
  ret(0, 18, 18, 62);
  ret(L - 18, 18, L, 62);
  ret(0, 30, 6, 50);
  ret(L - 6, 30, L, 50);
  // Marcas do pênalti e do centro
  for (const px of [12, L / 2, L - 12]) {
    g.append('circle').attr('class', 'marca').attr('cx', x(px)).attr('cy', y(A / 2)).attr('r', 1.5);
  }
  // Gols (8 jd: y=36 a 44), desenhados fora da linha de fundo
  ret(-1.5, 36, 0, 44).attr('class', 'gol');
  ret(L, 36, L + 1.5, 44).attr('class', 'gol');
}

/**
 * Define (uma vez por SVG) um marcador de ponta de seta para linhas finas.
 * @returns {string} url(#id) para usar em marker-end
 */
export function marcadorSeta(svg, id, cor) {
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.insert('defs', ':first-child');
  if (defs.select(`#${id}`).empty()) {
    defs.append('marker')
      .attr('id', id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', cor);
  }
  return `url(#${id})`;
}
