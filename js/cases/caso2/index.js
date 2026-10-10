/**
 * Caso 2 – ESQUELETO (a ser preenchido pelo colega responsável).
 *
 * Como usar este modelo (o Caso 1 em js/cases/caso1/ é um exemplo completo):
 *   1. Coloque os dados em data/caso2/ e (se preciso) um script de preparo em scripts/.
 *   2. Edite `meta` abaixo (título, pergunta, fonte e a tarefa de cada painel).
 *   3. Em `render`, registre os arquivos, rode o SQL de modelagem e desenhe nos painéis:
 *        layout.original, layout.designA, layout.designB, layout.controles, layout.rodape
 */
import { registrarArquivos, executar, consultar } from '../../db.js';

export const meta = {
  titulo: 'Caso 2 · (título do caso)',
  pergunta: 'Pergunta que o gráfico original quer responder.',
  fonte: 'Fonte do gráfico original e dos dados.',
  paineis: {
    original: { titulo: 'Gráfico original', tarefa: '' },
    designA: { titulo: 'Design A', tarefa: '' },
    designB: { titulo: 'Design B', tarefa: '' },
  },
};

// eslint-disable-next-line no-unused-vars
export async function render(layout) {
  // Exemplo de uso do DuckDB-WASM (descomente e adapte):
  // await registrarArquivos([{ nome: 'dados_caso2.csv', url: 'data/caso2/dados.csv' }]);
  // await executar(`CREATE OR REPLACE TABLE caso2 AS SELECT * FROM read_csv_auto('dados_caso2.csv')`);
  // const linhas = await consultar('SELECT * FROM caso2 LIMIT 10');
  void registrarArquivos; void executar; void consultar;

  for (const k of ['original', 'designA', 'designB']) {
    layout[k].innerHTML = '<p class="placeholder">Em construção.</p>';
  }
}

