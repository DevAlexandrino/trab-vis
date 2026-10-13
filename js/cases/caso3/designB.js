import { d3 } from '../../lib.js';
import { consultar } from '../../db.js';
import { sqlScatter } from './queries.js';

export async function criarDesignB(container) {
  const dados = await consultar(sqlScatter());

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
      <div style="font-size:12px; color:#64748b; line-height:1.4;">
        Relação entre <strong>volume físico alterado</strong> (Mha) e a <strong>severidade proporcional</strong> (% em relação a 2000). O raio das bolhas reflete o estoque em 2000.
      </div>
      <div id="chart-scatter-container" style="flex:1; width:100%; min-height:420px; position:relative;"></div>
    </div>
  `;

  const chartDiv = container.querySelector('#chart-scatter-container');
  const larguraTotal = chartDiv.clientWidth || 540;
  const alturaTotal = chartDiv.clientHeight || 420;
  const margem = { top: 25, right: 35, bottom: 45, left: 55 };
  const largura = larguraTotal - margem.left - margem.right;
  const altura = alturaTotal - margem.top - margem.bottom;

  const svg = d3.select(chartDiv)
    .append('svg')
    .attr('width', larguraTotal)
    .attr('height', alturaTotal)
    .append('g')
    .attr('transform', `translate(${margem.left},${margem.top})`);

  const x = d3.scaleLinear()
    .domain([-65, 55])
    .range([0, largura])
    .nice();

  const y = d3.scaleLinear()
    .domain([-20, 32])
    .range([altura, 0])
    .nice();

  const r = d3.scaleSqrt()
    .domain([0, d3.max(dados, d => d.area_2000_mha)])
    .range([4, 18]);

  // Linhas dos eixos neutros centrais (zero absoluto e zero relativo)
  svg.append('line')
    .attr('x1', x(0))
    .attr('x2', x(0))
    .attr('y1', 0)
    .attr('y2', altura)
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,4');

  svg.append('line')
    .attr('x1', 0)
    .attr('x2', largura)
    .attr('y1', y(0))
    .attr('y2', y(0))
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,4');

  // Eixo X
  svg.append('g')
    .attr('transform', `translate(0,${altura})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d > 0 ? '+' : ''}${d}`))
    .selectAll('text')
    .attr('fill', '#64748b')
    .attr('font-size', '11px');

  // Rótulo Eixo X
  svg.append('text')
    .attr('x', largura)
    .attr('y', altura + 36)
    .attr('text-anchor', 'end')
    .attr('fill', '#475569')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .text('Variação Líquida (milhões de hectares) →');

  // Eixo Y
  svg.append('g')
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d > 0 ? '+' : ''}${d}%`))
    .selectAll('text')
    .attr('fill', '#64748b')
    .attr('font-size', '11px');

  // Rótulo Eixo Y
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', 0)
    .attr('y', -38)
    .attr('text-anchor', 'end')
    .attr('fill', '#475569')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .text('Variação Relativa (%) →');

  // Círculos da dispersão
  svg.selectAll('.ponto-pais')
    .data(dados)
    .join('circle')
    .attr('cx', d => x(d.var_mha))
    .attr('cy', d => y(d.var_pct))
    .attr('r', d => r(d.area_2000_mha))
    .attr('fill', d => d.var_mha >= 0 ? '#10b981' : '#ef4444')
    .attr('fill-opacity', 0.6)
    .attr('stroke', d => d.var_mha >= 0 ? '#059669' : '#dc2626')
    .attr('stroke-width', 1.5);

  // Rótulos com os nomes dos países
  svg.selectAll('.rotulo-pais')
    .data(dados)
    .join('text')
    .attr('x', d => {
      if (d.pais === 'Brasil') return x(d.var_mha) + 16;
      if (d.pais === 'China') return x(d.var_mha) - 12;
      return x(d.var_mha) + r(d.area_2000_mha) + 5;
    })
    .attr('y', d => {
      if (d.pais === 'China') return y(d.var_pct) + 4;
      if (d.pais === 'Rússia') return y(d.var_pct) - 8;
      return y(d.var_pct) + 3;
    })
    .attr('text-anchor', d => d.pais === 'China' ? 'end' : 'start')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .attr('fill', '#1e293b')
    .text(d => d.pais);
}