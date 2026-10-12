import { registrarArquivos, executar, consultar } from '../../db.js';
import { sqlSetup, sqlValidacao } from './queries.js';
import { criarOriginal } from './original.js';
import { criarDesignA } from './designA.js';
import { criarDesignB, COR_SETOR } from './designB.js';

export const meta = {
  titulo: 'Caso 2 · Quem consome o hélio do mundo?',
  pergunta: 'Consumo mundial de hélio por área de uso em 2025: quais usos dependem mais do gás e como o consumo se divide.',
  fonte: `Original: Physics Today (AIP), dados de Kornbluth Helium Consulting, via <a href="https://www.junkcharts.com/yet-another-way-to-order-pie-slices/" target="_blank" rel="noopener">Junk Charts (“Yet another way to order pie slices”)</a>. Dados: valores impressos no gráfico original.`,
  paineis: {
    original: { titulo: 'Pizza com 11 fatias', tarefa: 'ver a participação de cada uso no consumo.' },
    designA: { titulo: 'Ranking dos usos', tarefa: 'comparar os usos entre si e achar os maiores.' },
    designB: { titulo: 'Usos agrupados por setor', tarefa: 'ver como o consumo se divide entre setores e dentro de cada um.' },
  },
};

export async function render(layout) {
  criarOriginal(layout.original);
  layout.designA.innerHTML = '<p class="carregando">Carregando dados no DuckDB-WASM…</p>';
  layout.designB.innerHTML = '<p class="carregando">Carregando dados no DuckDB-WASM…</p>';

  await registrarArquivos([{ nome: 'helio.csv', url: 'data/caso2/helio.csv' }]);
  await executar(sqlSetup('helio.csv'));

  layout.designA.innerHTML = '';
  layout.designB.innerHTML = '';
  const A = criarDesignA(layout.designA);
  await A.atualizar('valor');
  await criarDesignB(layout.designB);
  await desenharRodape(layout.rodape);
}

async function desenharRodape(rodape) {
  const linhas = await consultar('SELECT * FROM helio ORDER BY ordem_original');
  const [{ n, total }] = await consultar(sqlValidacao());

  rodape.innerHTML = `
    <details open>
      <summary>Dados e método</summary>
      <div class="rodape-grade">
        <div>
          <h4>Dados (lidos do gráfico original)</h4>
          <table class="tabela-partidas">
            <thead><tr><th>Ordem no original</th><th>Uso</th><th>Setor</th><th>%</th></tr></thead>
            <tbody>${linhas.map((d) => `
              <tr><td>${d.ordem_original}</td><td>${d.uso_pt} <span class="nota">(${d.uso})</span></td>
                <td style="color:${COR_SETOR[d.setor]}">${d.setor}</td><td>${d.pct}%</td></tr>`).join('')}
            </tbody>
          </table>
          <p class="nota">Validação no DuckDB: ${n} categorias somando ${total}%.</p>
        </div>
        <div>
          <ul class="nota">
            <li>Os percentuais são os rótulos do gráfico original, já arredondados para inteiros.</li>
            <li>A coluna “Setor” não existe no original. Foi criada por nós para o Design B: hélio líquido
              (MRI, laboratório, outros criogênicos), manufatura e usos como gás de elevação ou respiração.</li>
            <li>O original não traz dados de anos anteriores, então não dá para mostrar a afirmação da legenda
              de que semicondutores ultrapassou MRI.</li>
          </ul>
        </div>
      </div>
    </details>`;
}
