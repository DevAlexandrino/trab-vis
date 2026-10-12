export function sqlSetup(arquivo) {
  return [
    `CREATE OR REPLACE TABLE helio AS SELECT * FROM read_csv_auto('${arquivo}')`,
  ];
}

export function sqlUsos(ordem) {
  const ordenacao = ordem === 'original' ? 'ordem_original' : 'pct DESC, uso_pt';
  return `
    SELECT uso_pt, setor, pct,
           rank() OVER (ORDER BY pct DESC) AS posicao
    FROM helio
    ORDER BY ${ordenacao}`;
}

export function sqlTop3() {
  return `
    SELECT sum(pct)::INTEGER AS pct
    FROM (SELECT pct FROM helio ORDER BY pct DESC LIMIT 3)`;
}

export function sqlSetores() {
  return `
    WITH totais AS (
      SELECT setor, sum(pct)::INTEGER AS total FROM helio GROUP BY setor
    )
    SELECT h.uso_pt, h.setor, h.pct, t.total,
           (sum(h.pct) OVER (ORDER BY t.total DESC, h.pct DESC, h.uso_pt) - h.pct)::INTEGER AS inicio
    FROM helio h JOIN totais t USING (setor)
    ORDER BY inicio`;
}

export function sqlValidacao() {
  return `SELECT count(*) AS n, sum(pct)::INTEGER AS total FROM helio`;
}
