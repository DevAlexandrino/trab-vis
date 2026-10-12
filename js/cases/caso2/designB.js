import { d3 } from '../../lib.js';
import { consultar } from '../../db.js';
import { legendaCategorica } from '../../components/legend.js';
import { mostrarTooltip, esconderTooltip } from '../../components/tooltip.js';
import { sqlSetores } from './queries.js';

// Design B: uma coluna de 100% com os usos agrupados por setor.

// Uma cor por setor (também usada no rodapé).
export const COR_SETOR = {
  Manufatura: '#3b6ea8',
  'Criogenia (hélio líquido)': '#c8553d',
  'Aeroespacial, balões e mergulho': '#6a994e',
};

export async function criarDesignB(corpo) {
  const W = 560;
  const H = 440;
  const m = { t: 10, b: 10 };
  const coluna = { x: 220, largura: 70 };

  // Dados já vêm ordenados e com a posição inicial de cada uso
  const dados = await consultar(sqlSetores());
  const y = d3.scaleLinear().domain([0, 100]).range([m.t, H - m.b]);

  // Total e início de cada setor, para as chaves e a legenda
  const setores = d3.rollups(dados, (v) => ({
    total: v[0].total,
    inicio: d3.min(v, (d) => d.inicio),
  }), (d) => d.setor).map(([setor, s]) => ({ setor, ...s }));

  legendaCategorica(corpo, setores.map((s) => ({ rotulo: `${s.setor}: ${s.total}%`, cor: COR_SETOR[s.setor] })), 'Setor');

  const svg = d3.select(corpo).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // Segmentos da coluna: altura proporcional ao percentual
  svg.append('g').selectAll('rect')
    .data(dados)
    .join('rect')
    .attr('x', coluna.x)
    .attr('width', coluna.largura)
    .attr('y', (d) => y(d.inicio))
    .attr('height', (d) => y(d.pct) - y(0))
    .attr('fill', (d) => COR_SETOR[d.setor])
    .attr('stroke', '#fff')
    .on('mousemove', (ev, d) => mostrarTooltip(`<strong>${d.uso_pt}</strong><br/>${d.pct}% do consumo<br/>${d.setor} (${d.total}%)`, ev))
    .on('mouseleave', esconderTooltip);

  // Rótulo direto à direita de cada segmento
  svg.append('g').selectAll('text')
    .data(dados)
    .join('text')
    .attr('class', 'eixo-sub')
    .attr('x', coluna.x + coluna.largura + 8)
    .attr('y', (d) => y(d.inicio + d.pct / 2))
    .attr('dy', '0.35em')
    .text((d) => `${d.uso_pt} · ${d.pct}%`);

  // Chave à esquerda com o total e o nome de cada setor
  const chave = svg.append('g').selectAll('g')
    .data(setores)
    .join('g')
    .attr('transform', `translate(${coluna.x - 12},0)`);

  chave.append('path')
    .attr('d', (d) => `M6,${y(d.inicio) + 2} H0 V${y(d.inicio + d.total) - 2} H6`)
    .attr('fill', 'none')
    .attr('stroke', (d) => COR_SETOR[d.setor]);

  chave.append('text')
    .attr('class', 'eixo-rotulo')
    .attr('x', -8)
    .attr('y', (d) => y(d.inicio + d.total / 2))
    .attr('text-anchor', 'end')
    .attr('fill', (d) => COR_SETOR[d.setor])
    .call((t) => t.append('tspan').attr('font-weight', 700).text((d) => `${d.total}%`))
    .call((t) => t.append('tspan').attr('x', -8).attr('dy', '1.2em').text((d) => d.setor));

  d3.select(corpo).append('p').attr('class', 'nota')
    .text('Uma única coluna de 100%, com os usos agrupados por setor e ordenados dentro de cada setor. O agrupamento é nosso: separa o hélio líquido (criogenia) dos usos como gás.');
}
