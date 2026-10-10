/**
 * Caso 1 – Consultas SQL (DuckDB-WASM).
 *
 * TODA a modelagem dos dados acontece aqui, dentro da aplicação:
 *   eventos (JSON aninhado do StatsBomb)
 *     └─ passes            → filtra type = 'Pass' e achata os campos
 *         └─ passes_cat    → categorias transparentes (CASE WHEN) + zonas da grade
 *     └─ acoes_posse       → passes + chutes do time com a posse, com LEAD() = próxima ação
 *     └─ minutos_jogo      → duração real de cada jogo (para normalizar por 90 min)
 *
 * Este arquivo não depende do navegador: as funções só devolvem strings SQL.
 * Assim o mesmo SQL pode ser validado fora da aplicação (ver scripts/validar_caso1.mjs).
 */

/* ------------------------------------------------------------------ */
/* Parâmetros fixos das transformações                                 */
/* ------------------------------------------------------------------ */

/** Campo StatsBomb: 120 × 80 jardas; cada time ataca da esquerda (x=0) para a direita (x=120). */
export const CAMPO = { comprimento: 120, largura: 80 };

/** Grade do Design A: 6 colunas (ao longo do campo) × 4 faixas (ao longo da largura) = zonas de 20 × 20 jd. */
export const GRADE = { colunas: 6, linhas: 4 };

/** Limiares das categorias de passe do Design B (em jardas e graus). */
export const LIMIARES = {
  curto: 15, // comprimento < 15 jd → Curto
  medio: 30, // 15 ≤ comprimento < 30 → Médio; ≥ 30 → Longo
  frente: 45, // |ângulo| ≤ 45° → Frente
  tras: 135, // |ângulo| ≥ 135° → Trás; entre os dois → Lado
};

export const FAIXAS = ['Curto', 'Médio', 'Longo'];
export const DIRECOES = ['Trás', 'Lado', 'Frente'];
export const TIMES = ['Spain', 'England'];

/** Tipos de passe que contam como bola parada (campo pass.type.name do StatsBomb). */
const BOLAS_PARADAS = ['Corner', 'Free Kick', 'Throw-in', 'Goal Kick', 'Kick Off'];

/* ------------------------------------------------------------------ */
/* 1. Leitura e modelagem (executado uma vez, ao abrir o caso)         */
/* ------------------------------------------------------------------ */

/**
 * @param {string} arquivoEventos nome do arquivo NDJSON registrado no DuckDB
 * @param {string} arquivoPartidas nome do JSON de partidas registrado no DuckDB
 * @returns {string[]} lista de comandos SQL a executar em ordem
 */
export function sqlSetup(arquivoEventos, arquivoPartidas) {
  const { curto, medio, frente, tras } = LIMIARES;
  const larguraZona = CAMPO.comprimento / GRADE.colunas;
  const alturaZona = CAMPO.largura / GRADE.linhas;
  return [
    // (a) Leitura direta do JSON aninhado. sample_size=-1 faz o DuckDB inferir o
    //     esquema olhando TODAS as linhas (campos como pass.outcome são raros).
    `CREATE OR REPLACE TABLE eventos AS
       SELECT * FROM read_json_auto('${arquivoEventos}',
                                    format = 'newline_delimited', sample_size = -1)`,

    `CREATE OR REPLACE TABLE partidas AS
       SELECT * FROM read_json_auto('${arquivoPartidas}')`,

    // (b) Passes achatados. Listas do DuckDB começam em 1: location[1] = x, location[2] = y.
    `CREATE OR REPLACE VIEW passes AS
     SELECT
       match_id,
       "index"                              AS idx,
       period, minute, second,
       team.name                            AS time,
       possession                           AS posse,
       location[1]                          AS x0,
       location[2]                          AS y0,
       "pass".end_location[1]               AS x1,
       "pass".end_location[2]               AS y1,
       "pass".length                        AS comprimento,
       degrees("pass".angle)                AS angulo,      -- 0° = rumo ao gol adversário
       "pass".outcome.name IS NULL          AS completo,    -- StatsBomb omite outcome no passe certo
       coalesce("pass".type.name, 'Jogo corrido') AS tipo_passe,
       coalesce("pass".type.name IN (${BOLAS_PARADAS.map((t) => `'${t}'`).join(', ')}), false) AS bola_parada
     FROM eventos
     WHERE type.name = 'Pass'`,

    // (c) Categorias explícitas (substituem o k-means opaco do original) + zona da grade.
    //     least(...) evita a coluna/linha "extra" quando x = 120 ou y = 80 exatamente.
    `CREATE OR REPLACE VIEW passes_cat AS
     SELECT *,
       CASE WHEN comprimento < ${curto} THEN 'Curto'
            WHEN comprimento < ${medio} THEN 'Médio'
            ELSE 'Longo' END                                   AS faixa,
       CASE WHEN abs(angulo) <= ${frente} THEN 'Frente'
            WHEN abs(angulo) >= ${tras}   THEN 'Trás'
            ELSE 'Lado' END                                    AS direcao,
       least(floor(x0 / ${larguraZona}), ${GRADE.colunas - 1})::INTEGER AS zx_origem,
       least(floor(y0 / ${alturaZona}), ${GRADE.linhas - 1})::INTEGER   AS zy_origem,
       least(floor(x1 / ${larguraZona}), ${GRADE.colunas - 1})::INTEGER AS zx_destino,
       least(floor(y1 / ${alturaZona}), ${GRADE.linhas - 1})::INTEGER   AS zy_destino
     FROM passes`,

    // (d) Sequência: passes e chutes de cada time ordenados dentro de cada posse
    //     (posse = identificador "possession" do StatsBomb). LEAD() traz a ação
    //     seguinte do MESMO time na mesma posse; se não houver, a posse terminou.
    //     Particionar também por time evita descartar os ~3% de passes que o StatsBomb
    //     registra dentro de uma posse atribuída ao adversário (ex.: logo após um desarme).
    //     (Conduções/dribles foram descartados na preparação: "próxima ação" = próximo passe ou chute.)
    `CREATE OR REPLACE VIEW acoes_posse AS
     WITH acoes AS (
       SELECT e.match_id, e."index" AS idx, e.team.name AS time, e.possession AS posse,
              e.type.name AS tipo, p.faixa, p.direcao
       FROM eventos e
       LEFT JOIN passes_cat p ON p.match_id = e.match_id AND p.idx = e."index"
       WHERE e.type.name IN ('Pass', 'Shot')
     )
     SELECT *,
       LEAD(tipo)    OVER w AS prox_tipo,
       LEAD(faixa)   OVER w AS prox_faixa,
       LEAD(direcao) OVER w AS prox_direcao
     FROM acoes
     WINDOW w AS (PARTITION BY match_id, posse, time ORDER BY idx)`,

    // (e) Minutos jogados por jogo: soma da duração dos períodos 1–4 (o período 5 é a
    //     disputa de pênaltis). O timestamp do StatsBomb zera a cada período, então o
    //     evento "Half End" marca a duração de cada tempo, acréscimos incluídos.
    `CREATE OR REPLACE VIEW minutos_jogo AS
     SELECT match_id, time, sum(seg) / 60.0 AS minutos
     FROM (
       SELECT match_id, team.name AS time, period,
              -- read_json_auto pode inferir TIME ou VARCHAR; o CAST deixa robusto aos dois
              max(  CAST(split_part(CAST(timestamp AS VARCHAR), ':', 1) AS INTEGER) * 3600
                  + CAST(split_part(CAST(timestamp AS VARCHAR), ':', 2) AS INTEGER) * 60
                  + CAST(split_part(CAST(timestamp AS VARCHAR), ':', 3) AS DOUBLE)) AS seg
       FROM eventos
       WHERE type.name = 'Half End' AND period <= 4
       GROUP BY ALL
     )
     GROUP BY ALL`,

    // (f) Denominadores da normalização, por time.
    `CREATE OR REPLACE VIEW base_time AS
     SELECT time, count(*)::INTEGER AS jogos, sum(minutos) AS minutos
     FROM minutos_jogo GROUP BY time`,
  ];
}

/* ------------------------------------------------------------------ */
/* 2. Consultas parametrizadas (re-executadas a cada interação)        */
/* ------------------------------------------------------------------ */

/**
 * Filtro comum: incluir ou não bolas paradas (escanteio, lateral, tiro de meta...).
 * @param {{bolasParadas: boolean}} f
 */
function filtro(f, alias = '') {
  const a = alias ? `${alias}.` : '';
  return f.bolasParadas ? 'TRUE' : `NOT ${a}bola_parada`;
}

/**
 * Expressão SQL que transforma uma contagem `n` em valor normalizado.
 *   jogo  → n / jogos               (passes por jogo)
 *   p90   → n / (minutos / 90)      (passes por 90 minutos; corrige a prorrogação de Spain × Morocco)
 *   pct   → 100 · n / total do time (participação; remove o efeito de volume e isola o estilo)
 * Pressupõe as colunas b.jogos, b.minutos e t.total no escopo da consulta.
 */
function normalizar(n, modo) {
  if (modo === 'p90') return `${n} / (b.minutos / 90.0)`;
  if (modo === 'pct') return `100.0 * ${n} / t.total`;
  return `${n} * 1.0 / b.jogos`;
}

/** Total de passes por time após o filtro (denominador do modo "pct"). */
function cteTotais(f) {
  return `totais AS (
    SELECT time, count(*) AS total FROM passes_cat WHERE ${filtro(f)} GROUP BY time
  )`;
}

/** Resumo por time: volumes, normalizações e indicadores de estilo. */
export function sqlResumo(f) {
  return `
  WITH posses AS (
    -- número de passes em cada posse (mede "sequências longas")
    SELECT time, match_id, posse, count(*) AS n
    FROM passes_cat WHERE ${filtro(f)} GROUP BY ALL
  )
  SELECT p.time,
         b.jogos,
         round(b.minutos)::INTEGER                         AS minutos,
         count(*)::INTEGER                                 AS passes,
         count(*) * 1.0 / b.jogos                          AS por_jogo,
         count(*) / (b.minutos / 90.0)                     AS por_90,
         100.0 * avg(p.completo::INTEGER)                  AS pct_completos,
         avg(p.comprimento)                                AS comp_medio,
         100.0 * avg((p.faixa = 'Longo')::INTEGER)         AS pct_longos,
         (SELECT avg(n) FROM posses q WHERE q.time = p.time) AS passes_por_posse
  FROM passes_cat p JOIN base_time b USING (time)
  WHERE ${filtro(f, 'p')}
  GROUP BY p.time, b.jogos, b.minutos
  ORDER BY p.time DESC`;
}

/**
 * Design A: valor normalizado por zona da grade, para os dois times e a diferença.
 * A grade completa é gerada com range() para que zonas sem passes apareçam como 0.
 * @param {{bolasParadas:boolean, norm:string, zona:'origem'|'destino'}} f
 */
export function sqlZonas(f) {
  const zx = f.zona === 'destino' ? 'zx_destino' : 'zx_origem';
  const zy = f.zona === 'destino' ? 'zy_destino' : 'zy_origem';
  return `
  WITH ${cteTotais(f)},
  grade AS (
    SELECT c.range::INTEGER AS zx, l.range::INTEGER AS zy, t.time
    FROM range(${GRADE.colunas}) c, range(${GRADE.linhas}) l,
         (VALUES ${TIMES.map((t) => `('${t}')`).join(', ')}) t(time)
  ),
  contagem AS (
    SELECT time, ${zx} AS zx, ${zy} AS zy, count(*) AS n
    FROM passes_cat WHERE ${filtro(f)} AND ${zx} IS NOT NULL
    GROUP BY ALL
  ),
  valores AS (
    SELECT g.zx, g.zy, g.time, coalesce(c.n, 0) AS n,
           ${normalizar('coalesce(c.n, 0)', f.norm)} AS v
    FROM grade g
    LEFT JOIN contagem c USING (time, zx, zy)
    JOIN base_time b ON b.time = g.time
    JOIN totais t    ON t.time = g.time
  )
  -- "pivot" manual: uma linha por zona com Spain, England e a diferença
  SELECT zx, zy,
         sum(v) FILTER (WHERE time = 'Spain')   AS spain,
         sum(v) FILTER (WHERE time = 'England') AS england,
         sum(v) FILTER (WHERE time = 'Spain') - sum(v) FILTER (WHERE time = 'England') AS diff,
         sum(n) FILTER (WHERE time = 'Spain')::INTEGER   AS n_spain,
         sum(n) FILTER (WHERE time = 'England')::INTEGER AS n_england
  FROM valores
  GROUP BY zx, zy
  ORDER BY zx, zy`;
}

/** Design B: frequência normalizada de cada categoria (faixa × direção) por time. */
export function sqlCategorias(f) {
  return `
  WITH ${cteTotais(f)}
  SELECT p.time, p.faixa, p.direcao,
         count(*)::INTEGER                    AS n,
         ${normalizar('count(*)', f.norm)}    AS v,
         100.0 * avg(p.completo::INTEGER)     AS pct_completos,
         avg(p.comprimento)                   AS comp_medio
  FROM passes_cat p
  JOIN base_time b USING (time)
  JOIN totais t    USING (time)
  WHERE ${filtro(f, 'p')}
  GROUP BY p.time, p.faixa, p.direcao, b.jogos, b.minutos, t.total`;
}

/**
 * Design B (sequência): para os passes de uma categoria, qual é a ação seguinte na mesma posse.
 * Resultado em % dos passes daquela categoria, por time.
 */
export function sqlProxima(f, faixa, direcao) {
  return `
  WITH sel AS (
    SELECT p.time, p.completo, a.prox_tipo, a.prox_faixa, a.prox_direcao
    FROM passes_cat p
    JOIN acoes_posse a ON a.match_id = p.match_id AND a.idx = p.idx
    WHERE ${filtro(f, 'p')} AND p.faixa = '${faixa}' AND p.direcao = '${direcao}'
  ),
  rotulada AS (
    SELECT time,
      CASE WHEN NOT completo          THEN 'Passe errado'
           WHEN prox_tipo = 'Shot'    THEN 'Chute'
           WHEN prox_tipo IS NULL     THEN 'Fim da posse'
           ELSE prox_faixa || ' · ' || prox_direcao END AS proxima
    FROM sel
  )
  SELECT time, proxima, count(*)::INTEGER AS n,
         100.0 * count(*) / sum(count(*)) OVER (PARTITION BY time) AS pct
  FROM rotulada
  GROUP BY time, proxima`;
}

/** Design B: passes individuais de uma categoria (para desenhar no campo). */
export function sqlPassesCategoria(f, faixa, direcao) {
  return `
  SELECT time, x0, y0, x1, y1, completo
  FROM passes_cat
  WHERE ${filtro(f)} AND faixa = '${faixa}' AND direcao = '${direcao}'`;
}

/** Contexto: jogos e adversários de cada seleção (com minutos jogados). */
export function sqlPartidas() {
  return `
  SELECT strftime(CAST(p.match_date AS DATE), '%d/%m') AS data, p.stage AS fase,
         m.time,
         CASE WHEN p.home_team = m.time THEN p.away_team ELSE p.home_team END AS adversario,
         CASE WHEN p.home_team = m.time THEN p.home_score || '–' || p.away_score
              ELSE p.away_score || '–' || p.home_score END AS placar,
         round(m.minutos)::INTEGER AS minutos
  FROM minutos_jogo m JOIN partidas p USING (match_id)
  ORDER BY m.time DESC, p.match_date`;
}
