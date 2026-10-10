/**
 * Legendas reutilizáveis (todas as escalas de cor/tamanho devem ter legenda).
 */
import { d3 } from '../lib.js';

let contadorGradiente = 0;

/**
 * Legenda contínua para escalas sequenciais ou divergentes.
 * Um <linearGradient> amostra a escala de cor ao longo do seu domínio, e um eixo
 * linear (mesmo domínio → largura em pixels) dá os valores.
 *
 * @param {HTMLElement} pai
 * @param {d3.ScaleSequential|d3.ScaleDiverging} escala
 * @param {{titulo:string, largura?:number, formato?:string|Function, ticks?:number,
 *          rotuloEsq?:string, rotuloDir?:string}} op
 */
export function legendaContinua(pai, escala, op) {
  const { titulo, largura = 300, ticks = 5, rotuloEsq, rotuloDir } = op;
  const fmt = typeof op.formato === 'function' ? op.formato : d3.format(op.formato ?? ',.0f');
  const altura = rotuloEsq || rotuloDir ? 58 : 44;
  const m = { l: 12, r: 12 };
  const dom = escala.domain();
  const [min, max] = [dom[0], dom[dom.length - 1]];

  const svg = d3.select(pai).append('svg').attr('class', 'legenda')
    .attr('viewBox', `0 0 ${largura} ${altura}`);
  const id = `grad-${++contadorGradiente}`;

  // Amostra 20 pontos da escala de cor para montar o gradiente
  svg.append('defs').append('linearGradient').attr('id', id)
    .selectAll('stop')
    .data(d3.range(0, 1.0001, 0.05))
    .join('stop')
    .attr('offset', (t) => `${t * 100}%`)
    .attr('stop-color', (t) => escala(min + t * (max - min)));

  svg.append('text').attr('class', 'legenda-titulo').attr('x', m.l).attr('y', 11).text(titulo);
  svg.append('rect').attr('x', m.l).attr('y', 16).attr('width', largura - m.l - m.r).attr('height', 10)
    .attr('fill', `url(#${id})`).attr('stroke', '#999').attr('stroke-width', 0.5);

  // Eixo: escala linear auxiliar do domínio de dados para a largura da barra
  const eixo = d3.scaleLinear().domain([min, max]).range([m.l, largura - m.r]);
  svg.append('g').attr('class', 'eixo').attr('transform', 'translate(0,26)')
    .call(d3.axisBottom(eixo).ticks(ticks).tickSize(4).tickFormat(fmt));

  if (rotuloEsq) svg.append('text').attr('class', 'legenda-nota').attr('x', m.l).attr('y', altura - 3).text(rotuloEsq);
  if (rotuloDir) {
    svg.append('text').attr('class', 'legenda-nota').attr('x', largura - m.r).attr('y', altura - 3)
      .attr('text-anchor', 'end').text(rotuloDir);
  }
  return svg;
}

/**
 * Legenda categórica (quadrados coloridos + rótulos), em HTML.
 * @param {HTMLElement} pai
 * @param {{rotulo:string, cor:string, tracejado?:boolean}[]} itens
 */
export function legendaCategorica(pai, itens, titulo = '') {
  const div = d3.select(pai).append('div').attr('class', 'legenda-cat');
  if (titulo) div.append('span').attr('class', 'legenda-titulo').text(titulo);
  const it = div.selectAll('span.item').data(itens).join('span').attr('class', 'item');
  it.append('svg').attr('width', 22).attr('height', 10)
    .append('line').attr('x1', 1).attr('x2', 21).attr('y1', 5).attr('y2', 5)
    .attr('stroke', (d) => d.cor).attr('stroke-width', (d) => (d.tracejado ? 2 : 6))
    .attr('stroke-dasharray', (d) => (d.tracejado ? '3 2' : null));
  it.append('span').text((d) => d.rotulo);
  return div;
}

