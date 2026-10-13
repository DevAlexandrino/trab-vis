import { registrarArquivos, executar, consultar } from '../../db.js';
import { sqlSetup, sqlValidacao } from './queries.js';
import { criarOriginal } from './original.js';
import { criarDesignA } from './designA.js';
import { criarDesignB } from './designB.js';

// Caso 3: Mudança de área florestal nos 10 maiores países (Global Data Tracker, via Junk Charts).

// Metadados do cabeçalho e descrições dos painéis
export const meta = {
  titulo: 'Caso 3 · Onde as florestas estão a encolher e a crescer?',
  pergunta: 'Como evoluiu a cobertura florestal entre 2000 e 2023 nos 10 países com as maiores áreas florestais do planeta?',
  fonte: `Original: Global Data Tracker (World Bank WDI: AG.LND.FRST.K2), analisado por Kaiser Fung em <a href="https://junkcharts.typepad.com/" target="_blank" rel="noopener">Junk Charts (“The art of curation”)</a>.`,
  paineis: {
    original: { 
      titulo: 'Série Temporal Agregada', 
      tarefa: 'observar a suposta estabilidade da cobertura florestal mundial ao longo do tempo.' 
    },
    designA: { 
      titulo: 'Dumbbell Plot (2000 vs 2023)', 
      tarefa: 'comparar os volumes absolutos e o sentido/magnitude da mudança por país.' 
    },
    designB: { 
      titulo: 'Dispersão de Quadrantes: Absoluto vs Relativo', 
      tarefa: 'correlacionar a escala do impacto bruto (Mha) com o impacto proporcional local (%).' 
    },
  },
};

// Carrega os dados no DuckDB e inicializa os painéis visuais
export async function render(layout) {
  criarOriginal(layout.original);
  layout.designA.innerHTML = '<p class="carregando">A carregar dados no DuckDB-WASM…</p>';
  layout.designB.innerHTML = '<p class="carregando">A carregar dados no DuckDB-WASM…</p>';

  await registrarArquivos([{ nome: 'forest_data.csv', url: 'data/caso3/forest_data.csv' }]);
  await executar(sqlSetup('forest_data.csv'));

  layout.designA.innerHTML = '';
  layout.designB.innerHTML = '';

  const painelA = criarDesignA(layout.designA);
  await painelA.atualizar('var_mha');

  await criarDesignB(layout.designB);
  await desenharRodape(layout.rodape);
}

// Rodapé analítico: tabela detalhada e validação calculada no DuckDB
async function desenharRodape(rodape) {
  const linhas = await consultar('SELECT * FROM florestas ORDER BY var_mha DESC');
  const [{ total_paises, ganho_total, perda_total, saldo_liquido }] = await consultar(sqlValidacao());

  rodape.innerHTML = `
    <details open>
      <summary>Dados e método</summary>
      <div class="rodape-grade">
        <div>
          <h4>Top 10 Países em Cobertura Florestal (2000–2023)</h4>
          <table class="tabela-partidas">
            <thead>
              <tr>
                <th>País</th>
                <th>Área 2000 (Mha)</th>
                <th>Área 2023 (Mha)</th>
                <th>Variação Líquida</th>
                <th>Variação Relativa</th>
              </tr>
            </thead>
            <tbody>
              ${linhas.map((d) => `
                <tr>
                  <td>${d.pais} <span class="nota">(${d.pais_en})</span></td>
                  <td>${d.area_2000_mha.toFixed(1)}</td>
                  <td>${d.area_2023_mha.toFixed(1)}</td>
                  <td style="color:${d.var_mha >= 0 ? '#10b981' : '#ef4444'}; font-weight:600;">
                    ${d.var_mha > 0 ? '+' : ''}${d.var_mha.toFixed(1)} Mha
                  </td>
                  <td style="color:${d.var_pct >= 0 ? '#10b981' : '#ef4444'};">
                    ${d.var_pct > 0 ? '+' : ''}${d.var_pct.toFixed(1)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="nota">Validação DuckDB: ${total_paises} países. Ganho acumulado: +${ganho_total} Mha | Perda acumulada: ${perda_total} Mha | Saldo líquido: ${saldo_liquido} Mha.</p>
        </div>
        <div>
          <ul class="nota">
            <li><strong>Critério de Selecção:</strong> Os 10 países com maiores áreas florestais mundiais no ano 2000.</li>
            <li><strong>Unidades:</strong> Milhões de hectares (Mha) e variação percentual sobre o inventário de 2000.</li>
            <li><strong>Fonte:</strong> FAO / World Development Indicators (AG.LND.FRST.K2).</li>
            <li><strong>Ressalva Metodológica:</strong> O dado mede a área líquida combinada (florestas naturais e plantadas), sem discriminar corte raso ou degradação de floresta primária virgem.</li>
          </ul>
        </div>
      </div>
    </details>`;
}