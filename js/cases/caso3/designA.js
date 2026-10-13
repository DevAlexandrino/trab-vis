import { d3 } from '../../lib.js';
import { consultar } from '../../db.js';
import { sqlDumbbell } from './queries.js';

export function criarDesignA(container) {
  // 1. Estrutura de controles interativos e área do gráfico
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="font-size:12px; color:#64748b;">
          Ordenar países por:
          <button id="btn-ordem-var" class="btn-toggle ativo" style="margin-left:4px; padding:3px 8px; font-size:11px; cursor:pointer;">Variação Líquida</button>
          <button id="btn-ordem-area" class="btn-toggle" style="padding:3px 8px; font-size:11px; cursor:pointer;">Área Total (2000)</button>
        </div>
        <div style="display:flex; gap:12px; font-size:11px; color:#475569;">
          <span style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#94a3b8; display:inline-block;"></span> 2000</span>
          <span style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></span> Ganho (2023)</span>
          <span style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#ef4444; display:inline-block;"></span> Perda (2023)</span>
        </div>
      </div>
      <div id="chart-dumbbell-container" style="flex:1; width:100%; min-height:420px; position:relative;"></div>
    </div>
  `;

  const btnVar = container.querySelector('#btn-ordem-var');
  const btnArea = container.querySelector('#btn-ordem-area');

  // Alternância de botões
  btnVar.addEventListener('click', () => {
    btnVar.classList.add('ativo');
    btnArea.classList.remove('ativo');
    atualizar('var_mha');
  });

  btnArea.addEventListener('click', () => {
    btnArea.classList.add('ativo');
    btnVar.classList.remove('ativo');
    atualizar('area');
  });

  // 2. Renderização em D3.js com dados do DuckDB
  async function atualizar(criterio = 'var_mha') {
    const dados = await consultar(sqlDumbbell(criterio));
    const chartDiv = container.querySelector('#chart-dumbbell-container');
    chartDiv.innerHTML = '';

    const larguraTotal = chartDiv.clientWidth || 540;
    const alturaTotal = chartDiv.clientHeight || 420;
    const margem = { top: 20, right: 90, bottom: 40, left: 110 };
    const largura = larguraTotal - margem.left - margem.right;
    const altura = alturaTotal - margem.top - margem.bottom;

    const svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', larguraTotal)
      .attr('height', alturaTotal)
      .append('g')
      .attr('transform', `translate(${margem.left},${margem.top})`);

    const y = d3.scaleBand()
      .domain(dados.map(d => d.pais))
      .range([0, altura])
      .padding(0.4);

    const xMax = d3.max(dados, d => Math.max(d.area_2000_mha, d.area_2023_mha)) * 1.05;
    const x = d3.scaleLinear()
      .domain([0, xMax])
      .range([0, largura])
      .nice();

    // Grade sutil vertical
    svg.append('g')
      .attr('transform', `translate(0,${altura})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-altura).tickFormat(''))
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '2,2');

    // Eixo X inferior
    svg.append('g')
      .attr('transform', `translate(0,${altura})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d} Mha`))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '11px');

    // Eixo Y com nomes dos países
    svg.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#1e293b')
      .attr('font-weight', '600')
      .attr('font-size', '12px');

    // Segmentos conectando 2000 a 2023
    svg.selectAll('.linha-conexao')
      .data(dados)
      .join('line')
      .attr('x1', d => x(d.area_2000_mha))
      .attr('x2', d => x(d.area_2023_mha))
      .attr('y1', d => y(d.pais) + y.bandwidth() / 2)
      .attr('y2', d => y(d.pais) + y.bandwidth() / 2)
      .attr('stroke', d => d.var_mha >= 0 ? '#10b981' : '#ef4444')
      .attr('stroke-width', 3.5)
      .attr('stroke-opacity', 0.85);

    // Pontos do ano 2000
    svg.selectAll('.ponto-2000')
      .data(dados)
      .join('circle')
      .attr('cx', d => x(d.area_2000_mha))
      .attr('cy', d => y(d.pais) + y.bandwidth() / 2)
      .attr('r', 5)
      .attr('fill', '#94a3b8');

    // Pontos do ano 2023
    svg.selectAll('.ponto-2023')
      .data(dados)
      .join('circle')
      .attr('cx', d => x(d.area_2023_mha))
      .attr('cy', d => y(d.pais) + y.bandwidth() / 2)
      .attr('r', 6)
      .attr('fill', d => d.var_mha >= 0 ? '#10b981' : '#ef4444');

    // Rótulos de variação líquida direta
    svg.selectAll('.texto-delta')
      .data(dados)
      .join('text')
      .attr('x', d => x(Math.max(d.area_2000_mha, d.area_2023_mha)) + 10)
      .attr('y', d => y(d.pais) + y.bandwidth() / 2 + 4)
      .attr('fill', d => d.var_mha >= 0 ? '#059669' : '#dc2626')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => `${d.var_mha > 0 ? '+' : ''}${d.var_mha.toFixed(1)} Mha`);
  }

  return { atualizar };
}