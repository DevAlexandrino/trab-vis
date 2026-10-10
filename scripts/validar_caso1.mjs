/**
 * Gera um script .sql com EXATAMENTE as mesmas consultas usadas na aplicação,
 * para conferir os números fora do navegador (DuckDB CLI ou Python).
 *
 * Uso (na raiz do projeto):
 *   node scripts/validar_caso1.mjs > /tmp/caso1.sql
 *   duckdb < /tmp/caso1.sql                 # DuckDB CLI
 *   # ou: python -c "import duckdb,sys; [print(duckdb.sql(q)) for q in open('/tmp/caso1.sql').read().split(';\n') if q.strip()]"
 */
import * as Q from '../js/cases/caso1/queries.js';

const f = { bolasParadas: true, norm: 'jogo', zona: 'origem' };
const blocos = [
  ...Q.sqlSetup('data/caso1/eventos_esp_eng.ndjson', 'data/caso1/partidas.json'),
  Q.sqlPartidas(),
  Q.sqlResumo(f),
  Q.sqlResumo({ ...f, bolasParadas: false }),
  `SELECT faixa, direcao, count(*) FILTER (WHERE time='Spain') AS spain,
          count(*) FILTER (WHERE time='England') AS england
   FROM passes_cat GROUP BY ALL ORDER BY faixa, direcao`,
  Q.sqlZonas({ ...f, norm: 'jogo' }),
  Q.sqlProxima(f, 'Longo', 'Frente') + ' ORDER BY time, pct DESC',
];
console.log(blocos.map((s) => s.trim()).join(';\n') + ';');

