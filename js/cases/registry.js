/**
 * Registro dos 3 casos do trabalho.
 *
 * Para adicionar/editar um caso basta mexer aqui: a navegação e a página inicial
 * são geradas a partir desta lista. Cada módulo de caso exporta:
 *
 *   export const meta = { titulo, pergunta, fonte, paineis: { original, designA, designB } };
 *   export async function render(layout, ctx) { ... }   // opcional: devolver função de limpeza
 *
 * `layout` é criado por js/layout.js (painéis Original / Design A / Design B lado a lado).
 */
export const CASOS = [
  {
    id: 'caso1',
    rotulo: 'Caso 1 · Passes na Copa 2022',
    resumo: 'Espanha × Inglaterra: que estilo de jogo os padrões de passe revelam? (Junk Charts / Brennan Klein)',
    carregar: () => import('./caso1/index.js'),
  },
  {
    id: 'caso2',
    rotulo: 'Caso 2 · Consumo de hélio',
    resumo: 'Quem consome o hélio do mundo? Uma pizza de 11 fatias redesenhada (Junk Charts / Physics Today).',
    carregar: () => import('./caso2/index.js'),
  },
  {
    id: 'caso3',
    rotulo: 'Caso 3 · Cobertura florestal',
    resumo: 'Onde as florestas estão a encolher e a crescer? Curadoria e trade-offs dos 10 maiores países (Junk Charts / Kaiser Fung).',
    carregar: () => import('./caso3/index.js'),
  },
];

