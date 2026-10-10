/**
 * Configuração do DuckDB-WASM e carregamento de dados (compartilhado pelos 3 casos).
 *
 * Uso típico dentro de um caso:
 *   import { registrarArquivos, executar, consultar } from '../../db.js';
 *   await registrarArquivos([{ nome: 'x.json', url: 'data/casoN/x.json' }]);
 *   await executar(`CREATE TABLE t AS SELECT * FROM read_json_auto('x.json')`);
 *   const linhas = await consultar(`SELECT ...`);   // → array de objetos JS simples
 *
 * O banco é criado uma única vez (lazy) e reaproveitado ao navegar entre casos.
 */
import { duckdb } from './lib.js';

let instancia = null; // Promise<{ db, conn }>
const registrados = new Set();

/** Atualiza o indicador de estado no topo da página. */
function status(texto, classe = '') {
  const el = document.getElementById('status-db');
  if (!el) return;
  el.textContent = `DuckDB: ${texto}`;
  el.className = `status-db ${classe}`;
}

/** Inicializa o DuckDB-WASM a partir do CDN jsDelivr (o bundle certo é escolhido pelo navegador). */
async function iniciar() {
  status('carregando…', 'carregando');
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  // O worker precisa ser same-origin: criamos um Blob que importa o script do CDN.
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
  );
  const worker = new Worker(workerUrl);
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  const conn = await db.connect();
  // read_json_auto vem da extensão json; garantimos que esteja carregada.
  try {
    await conn.query('LOAD json');
  } catch {
    await conn.query('INSTALL json; LOAD json');
  }
  status('pronto', 'ok');
  return { db, conn };
}

/** Devolve a instância única do banco, criando-a na primeira chamada. */
export function obterDB() {
  if (!instancia) {
    instancia = iniciar().catch((e) => {
      status('erro', 'erro');
      instancia = null;
      throw e;
    });
  }
  return instancia;
}

/**
 * Baixa arquivos (fetch) e os registra no sistema de arquivos virtual do DuckDB.
 * Arquivos já registrados são ignorados, então navegar entre casos não baixa de novo.
 * @param {{nome: string, url: string}[]} arquivos
 */
export async function registrarArquivos(arquivos) {
  const { db } = await obterDB();
  for (const { nome, url } of arquivos) {
    if (registrados.has(nome)) continue;
    status(`baixando ${nome}…`, 'carregando');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resp.status}`);
    await db.registerFileBuffer(nome, new Uint8Array(await resp.arrayBuffer()));
    registrados.add(nome);
  }
  status('pronto', 'ok');
}

/** Executa um ou mais comandos SQL sem retorno (CREATE, etc.), em ordem. */
export async function executar(...sqls) {
  const { conn } = await obterDB();
  for (const sql of sqls.flat()) await conn.query(sql);
}

/** Converte valores Arrow para JS simples (BIGINT → Number, listas/structs recursivamente). */
function paraJS(v) {
  if (typeof v === 'bigint') return Number(v);
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(paraJS);
    if (typeof v.toArray === 'function') return Array.from(v.toArray(), paraJS); // listas Arrow
    if (typeof v.toJSON === 'function') v = v.toJSON(); // structs Arrow
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraJS(x)]));
  }
  return v;
}

/**
 * Executa uma consulta e devolve as linhas como objetos JS.
 * @param {string} sql
 * @returns {Promise<object[]>}
 */
export async function consultar(sql) {
  const { conn } = await obterDB();
  const tabela = await conn.query(sql);
  return tabela.toArray().map((linha) => paraJS(linha.toJSON()));
}
