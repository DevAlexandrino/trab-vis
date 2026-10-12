// Consultas SQL do Caso 2, executadas no DuckDB-WASM.

// Cria a tabela helio a partir do CSV.
export function sqlSetup(arquivo) {
  return [
    `CREATE OR REPLACE TABLE helio AS SELECT * FROM read_csv_auto('${arquivo}')`,
  ];
}

// Lista os usos com a posição no ranking, ordenados por valor ou como no original.
export function sqlUsos(ordem) {
  const ordenacao = ordem === 'original' ? 'ordem_original' : 'pct DESC, uso_pt';
  return `
    SELECT uso_pt, setor, pct,
           rank() OVER (ORDER BY pct DESC) AS posicao
    FROM helio
    ORDER BY ${ordenacao}`;
}

// Soma dos três maiores usos (título do Design A).
export function sqlTop3() {
  return `
    SELECT sum(pct)::INTEGER AS pct
    FROM (SELECT pct FROM helio ORDER BY pct DESC LIMIT 3)`;
}

// Total por setor e posição inicial de cada uso na coluna empilhada (Design B).
export function sqlSetores() {
  return `
    -- inicio = soma acumulada dos usos anteriores (setores maiores primeiro)
    WITH totais AS (
      SELECT setor, sum(pct)::INTEGER AS total FROM helio GROUP BY setor
    )
    SELECT h.uso_pt, h.setor, h.pct, t.total,
           (sum(h.pct) OVER (ORDER BY t.total DESC, h.pct DESC, h.uso_pt) - h.pct)::INTEGER AS inicio
    FROM helio h JOIN totais t USING (setor)
    ORDER BY inicio`;
}

// Confere quantas categorias existem e se a soma dá 100%.
export function sqlValidacao() {
  return `SELECT count(*) AS n, sum(pct)::INTEGER AS total FROM helio`;
}
