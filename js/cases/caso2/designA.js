import { d3 } from '../../lib.js';
import { consultar } from '../../db.js';
import { grupoBotoes } from '../../layout.js';
import { mostrarTooltip, esconderTooltip } from '../../components/tooltip.js';
import { sqlUsos, sqlTop3 } from './queries.js';

const COR_DESTAQUE = '#444';
const COR_RESTO = '#b8bec7';
const DURACAO = 600;

export function criarDesignA(corpo) {
  const W = 560;
  const H = 380;
  const m = { t: 10, r: 50, b: 30, l: 170 };

  corpo.appendChild(
    grupoBotoes('Ordem', [
      { valor: 'valor', texto: 'Por valor' },
      { valor: 'original', texto: 'Como no original' },
    ], 'valor', (v) => atualizar(v)),
  );

  const titulo = d3.select(corpo).append('h4');
  const svg = d3.select(corpo).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleLinear().domain([0, 25]).range([m.l, W - m.r]);
  const y = d3.scaleBand().range([m.t, H - m.b]).padding(0.2);

  svg.append('g').attr('class', 'eixo')
    .attr('transform', `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.t - m.b)).tickFormat((d) => `${d}%`));

  const barras = svg.append('g');
  d3.select(corpo).append('p').attr('class', 'nota')
    .text('Barras horizontais: o comprimento é o canal mais preciso para comparar valores. Os três maiores usos estão em cinza escuro.');

  async function atualizar(ordem) {
    const dados = await consultar(sqlUsos(ordem));
    const [{ pct: top3 }] = await consultar(sqlTop3());
    titulo.text(`Três usos consomem ${top3}% do hélio do mundo`);
    y.domain(dados.map((d) => d.uso_pt));

    const g = barras.selectAll('g.linha')
      .data(dados, (d) => d.uso_pt)
      .join((enter) => {
        const linha = enter.append('g').attr('class', 'linha')
          .attr('transform', (d) => `translate(0,${y(d.uso_pt)})`);
        linha.append('text').attr('class', 'eixo-rotulo')
          .attr('x', m.l - 8).attr('text-anchor', 'end').attr('dy', '0.35em');
        linha.append('rect').attr('x', m.l).attr('fill', (d) => (d.posicao <= 3 ? COR_DESTAQUE : COR_RESTO));
        linha.append('text').attr('class', 'valor eixo-sub').attr('dy', '0.35em');
        return linha;
      });

    g.on('mousemove', (ev, d) => mostrarTooltip(`<strong>${d.uso_pt}</strong><br/>${d.pct}% do consumo · ${d.posicao}º lugar<br/>Setor: ${d.setor}`, ev))
      .on('mouseleave', esconderTooltip);

    g.transition().duration(DURACAO).attr('transform', (d) => `translate(0,${y(d.uso_pt)})`);
    g.select('.eixo-rotulo').attr('y', y.bandwidth() / 2).text((d) => d.uso_pt);
    g.select('rect').attr('height', y.bandwidth()).attr('width', (d) => x(d.pct) - m.l);
    g.select('.valor').attr('x', (d) => x(d.pct) + 4).attr('y', y.bandwidth() / 2).text((d) => `${d.pct}%`);
  }

  return { atualizar };
}
