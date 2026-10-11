/**
 * Constantes visuais e utilitários compartilhados pelo Original, Design A e Design B do Caso 1.
 */
import { d3 } from '../../lib.js';

/**
 * Cores dos times. Escolhidas para casar com as pontas da escala divergente
 * d3.interpolateRdBu usada no Design A (vermelho = Spain, azul = England),
 * de modo que "vermelho" signifique sempre a mesma coisa em todos os gráficos.
 */
export const COR_TIME = { Spain: '#b2182b', England: '#2166ac' };
export const NOME_TIME = { Spain: 'Espanha', England: 'Inglaterra' };
export const NOME_FASE = {
  'Group Stage': 'Fase de grupos',
  'Round of 16': 'Oitavas de final',
  'Quarter-finals': 'Quartas de final',
};
export const NOME_ADVERSARIO = {
  'Costa Rica': 'Costa Rica',
  Germany: 'Alemanha',
  Japan: 'Japão',
  Morocco: 'Marrocos',
  Iran: 'Irã',
  'United States': 'Estados Unidos',
  Wales: 'País de Gales',
  Senegal: 'Senegal',
  France: 'França',
};

/** Rótulos e formatos de cada modo de normalização. */
export const NORMALIZACAO = {
  jogo: { texto: 'Por jogo', unidade: 'passes/jogo', formato: ',.0f', formatoFino: ',.1f' },
  p90: { texto: 'Por 90 min', unidade: 'passes/90 min', formato: ',.0f', formatoFino: ',.1f' },
  pct: { texto: '% dos passes', unidade: '% dos passes do time', formato: '.1f', formatoFino: '.2f' },
};

/** Formata um valor segundo o modo de normalização (com "%" quando for participação). */
export function formatar(v, norm, fino = false) {
  const n = NORMALIZACAO[norm];
  const s = d3.format(fino ? n.formatoFino : n.formato)(v);
  return norm === 'pct' ? `${s}%` : s;
}

/** Rótulo da zona da grade 6×4 em linguagem de futebol. */
export function nomeZona(zx, zy) {
  const terco = ['defensivo', 'defensivo', 'médio', 'médio', 'ofensivo', 'ofensivo'][zx];
  const faixa = ['ponta esquerda', 'meio-esquerda', 'meio-direita', 'ponta direita'][zy];
  return `Terço ${terco} (coluna ${zx + 1}/6), ${faixa}`;
}

