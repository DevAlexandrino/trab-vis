// Consultas SQL do Caso 3, executadas no DuckDB-WASM.

// Cria a tabela florestas a partir do ficheiro CSV.
export function sqlSetup(arquivo) {
  return [
    `CREATE OR REPLACE TABLE florestas AS SELECT * FROM read_csv_auto('${arquivo}')`,
  ];
}

// Retorna os dados para o Dumbbell Plot (Design A) ordenados por variação líquida ou por área em 2000.
export function sqlDumbbell(ordenacao = 'var_mha') {
  const criterio = ordenacao === 'area' ? 'area_2000_mha DESC' : 'var_mha DESC';
  return `
    SELECT 
      pais,
      pais_en,
      area_2000_mha,
      area_2023_mha,
      var_mha,
      var_pct
    FROM florestas
    ORDER BY ${criterio}`;
}

// Retorna os dados para a Dispersão em Quadrantes (Design B).
export function sqlScatter() {
  return `
    SELECT 
      pais,
      pais_en,
      var_mha,
      var_pct,
      area_2000_mha,
      CASE 
        WHEN var_mha >= 0 THEN 'Ganho' 
        ELSE 'Perda' 
      END AS status
    FROM florestas
    ORDER BY var_mha DESC`;
}

// Validação e cálculo dos saldos globais no DuckDB.
export function sqlValidacao() {
  return `
    SELECT 
      count(*)::INTEGER AS total_paises,
      round(sum(CASE WHEN var_mha > 0 THEN var_mha ELSE 0 END), 1) AS ganho_total,
      round(sum(CASE WHEN var_mha < 0 THEN var_mha ELSE 0 END), 1) AS perda_total,
      round(sum(var_mha), 1) AS saldo_liquido
    FROM florestas`;
}