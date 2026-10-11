/**
 * Caso 1 – Padrões de passe na Copa 2022 (Spain × England).
 *
 * Fluxo:
 *   1. registra os arquivos de dados no DuckDB-WASM;
 *   2. executa o SQL de modelagem (queries.js → sqlSetup);
 *   3. desenha Original, Design A e Design B no layout padrão;
 *   4. controles globais (normalização, bolas paradas) re-executam as consultas
 *      e atualizam A e B com transições.
 */
import { registrarArquivos, executar, consultar } from '../../db.js';
import { grupoBotoes, caixaSelecao } from '../../layout.js';
import { sqlSetup, sqlPartidas } from './queries.js';
import { criarOriginal } from './original.js';
import { criarDesignA } from './designA.js';
import { criarDesignB } from './designB.js';
import { NORMALIZACAO, NOME_TIME, COR_TIME } from './comum.js';

export const meta = {
  titulo: 'Caso 1 · Que estilo de jogo os passes revelam?',
  pergunta: 'Espanha × Inglaterra na Copa do Mundo de 2022: onde, como e em que sequência cada seleção passa a bola.',
  fonte: `Original: Brennan Klein (Northeastern) via <a href="https://www.junkcharts.com/making-sense-of-long-data-sequences/" target="_blank" rel="noopener">Junk Charts (“Making sense of long data sequences”)</a>. Dados: <a href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener">StatsBomb Open Data</a> (Copa 2022, jogos completos).`,
  paineis: {
    original: { titulo: 'Clusters de passes', tarefa: 'identificar o estilo de cada time (“que time é este?”).' },
    designA: { titulo: 'Onde cada time passa', tarefa: 'comparar a distribuição espacial dos passes, lado a lado e na mesma escala.' },
    designB: { titulo: 'Tipos de passe e o que vem depois', tarefa: 'entender o estilo (tipos de passe) e a sequência (próxima ação).' },
  },
};

const ARQUIVOS = [
  { nome: 'eventos_esp_eng.ndjson', url: 'data/caso1/eventos_esp_eng.ndjson' },
  { nome: 'partidas_caso1.json', url: 'data/caso1/partidas.json' },
];

export async function render(layout) {
  // Filtros globais compartilhados por A e B
  const filtro = { norm: 'jogo', bolasParadas: true };

  criarOriginal(layout.original);
  layout.designA.innerHTML = '<p class="carregando">Carregando dados no DuckDB-WASM…</p>';
  layout.designB.innerHTML = '<p class="carregando">Carregando dados no DuckDB-WASM…</p>';

  await registrarArquivos(ARQUIVOS);
  await executar(sqlSetup('eventos_esp_eng.ndjson', 'partidas_caso1.json'));

  layout.designA.innerHTML = '';
  layout.designB.innerHTML = '';
  const A = criarDesignA(layout.designA);
  const B = criarDesignB(layout.designB);
  const atualizarTudo = () => Promise.all([A.atualizar({ ...filtro }), B.atualizar({ ...filtro })]);

  // Controles globais do caso
  layout.controles.append(
    grupoBotoes('Normalização', Object.entries(NORMALIZACAO).map(([valor, n]) => ({ valor, texto: n.texto })),
      filtro.norm, (v) => { filtro.norm = v; atualizarTudo(); }),
    caixaSelecao('Incluir bolas paradas', filtro.bolasParadas, (v) => { filtro.bolasParadas = v; atualizarTudo(); }),
  );

  await atualizarTudo();
  await desenharRodape(layout.rodape);
}

/** Rodapé: contexto (jogos e adversários) e transparência do método (SQL das categorias). */
async function desenharRodape(rodape) {
  const partidas = await consultar(sqlPartidas());
  const [, , , sqlCategorias, sqlSequencia] = sqlSetup('eventos_esp_eng.ndjson', 'partidas_caso1.json');
  // Remove a indentação do código-fonte e escapa HTML (o SQL contém "<")
  const limpar = (s) => s.replace(/^ {4}/gm, '').trim()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  rodape.innerHTML = `
    <details open>
      <summary>Dados e método</summary>
      <div class="rodape-grade">
        <div>
          <h4>Jogos considerados</h4>
          <table class="tabela-partidas">
            <thead><tr><th>Seleção</th><th>Data</th><th>Fase</th><th>Adversário</th><th>Placar</th><th>Min.</th></tr></thead>
            <tbody>${partidas.map((p) => `
              <tr><td style="color:${COR_TIME[p.time]}">${NOME_TIME[p.time]}</td><td>${p.data}</td><td>${p.fase}</td>
                <td>${p.adversario}</td><td>${p.placar}</td><td>${p.minutos}</td></tr>`).join('')}
            </tbody>
          </table>
          <p class="nota">Minutos = duração real dos tempos 1–4 (com acréscimos e prorrogação; sem pênaltis),
            usados na normalização “por 90 min”.</p>
          <ul class="nota">
            <li>Coordenadas StatsBomb em jardas (campo 120 × 80). Cada time sempre ataca da esquerda para a direita.</li>
            <li>“Bolas paradas” = escanteio, falta, lateral, tiro de meta e saída de bola.</li>
            <li>A sequência ignora conduções: “próxima ação” é o próximo passe ou chute do mesmo time na mesma posse.</li>
          </ul>
        </div>
        <div>
          <h4>Categorias de passe (SQL executado no navegador)</h4>
          <pre><code>${limpar(sqlCategorias)}</code></pre>
          <h4>Próxima ação (janela com LEAD)</h4>
          <pre><code>${limpar(sqlSequencia)}</code></pre>
        </div>
      </div>
    </details>`;
}
