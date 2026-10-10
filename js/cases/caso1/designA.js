/**
 * Design A – Comparação direta por zona do campo.
 *
 * Tarefa: comparar ONDE cada seleção passa a bola.
 * Codificação:
 *   - Campo dividido em grade 6 × 4 (zonas de 20 × 20 jardas).
 *   - Cor sequencial = passes por zona, normalizados (por jogo, por 90 min ou % do time).
 *     Espanha e Inglaterra usam a MESMA escala (mesmo domínio) → cores comparáveis.
 *   - Terceiro painel com escala divergente centrada em zero: Espanha − Inglaterra.
 * Resolve os problemas 1 (comparação de memória), 3 (volume não normalizado)
 * e 5 (oclusão de setas: a agregação em zonas elimina a sobreposição).
 */
import { d3 } from '../../lib.js';
import { consultar } from '../../db.js';
import { criarCampo } from '../../components/pitch.js';
import { legendaContinua } from '../../components/legend.js';
import { mostrarTooltip, esconderTooltip } from '../../components/tooltip.js';
import { grupoBotoes } from '../../layout.js';
import { sqlZonas, GRADE, CAMPO } from './queries.js';
import { COR_TIME, NOME_TIME, NORMALIZACAO, formatar, nomeZona } from './comum.js';

const DURACAO = 600; // ms das transições de cor

export function criarDesignA(corpo) {
  const estado = { zona: 'origem' };
  let ultimoFiltro = null;

  // Controle local: contar o passe pela zona de origem ou de destino
  corpo.appendChild(
    grupoBotoes('Zona do passe', [
      { valor: 'origem', texto: 'Origem' },
      { valor: 'destino', texto: 'Destino' },
    ], estado.zona, (v) => {
      estado.zona = v;
      atualizar(ultimoFiltro);
    }),
  );

  const grade = d3.select(corpo).append('div').attr('class', 'a-grade');

  // Três campos: Espanha, Inglaterra (escala sequencial comum) e diferença (divergente)
  const paineis = ['spain', 'england', 'diff'].map((chave) => {
    const bloco = grade.append('div').attr('class', `a-bloco a-${chave}`);
    const titulo = bloco.append('h4');
    const campo = criarCampo(bloco.node(), { largura: 460 });
    const legenda = bloco.append('div').attr('class', 'a-legenda');
    return { chave, bloco, titulo, campo, legenda };
  });

  const nota = d3.select(corpo).append('p').attr('class', 'nota');

  // Tamanho de cada zona em jardas (as escalas do campo convertem para pixels)
  const zw = CAMPO.comprimento / GRADE.colunas;
  const zh = CAMPO.largura / GRADE.linhas;

  /** Desenha/atualiza as células de um campo com a escala de cor dada. */
  function desenharCelulas(p, dados, valor, escala, fmtCelula) {
    const { x, y, fundo } = p.campo;
    const cel = fundo.selectAll('g.celula')
      .data(dados, (d) => `${d.zx}-${d.zy}`) // chave estável → transição suave entre filtros
      .join((enter) => {
        const g = enter.append('g').attr('class', 'celula');
        g.append('rect')
          .attr('x', (d) => x(d.zx * zw)).attr('y', (d) => y(d.zy * zh))
          .attr('width', x(zw) - x(0)).attr('height', y(zh) - y(0))
          .attr('fill', '#fff');
        g.append('text').attr('class', 'celula-valor')
          .attr('x', (d) => x(d.zx * zw + zw / 2)).attr('y', (d) => y(d.zy * zh + zh / 2))
          .attr('dy', '0.35em').attr('text-anchor', 'middle');
        return g;
      });

    cel.select('rect').transition().duration(DURACAO).attr('fill', (d) => escala(valor(d)));
    // Texto escuro em células claras e claro em células escuras (contraste)
    cel.select('text')
      .text((d) => fmtCelula(valor(d)))
      .transition().duration(DURACAO)
      .attr('fill', (d) => (d3.hsl(escala(valor(d))).l > 0.55 ? '#222' : '#fff'));

    // Interação: hover destaca a mesma zona nos três campos (vínculo entre vistas)
    cel.on('mouseenter', (ev, d) => destacar(d, ev))
      .on('mousemove', (ev, d) => destacar(d, ev))
      .on('mouseleave', () => destacar(null));
  }

  let dadosAtuais = [];
  function destacar(d, ev) {
    for (const p of paineis) {
      p.campo.fundo.selectAll('g.celula').classed('destaque', (c) => d && c.zx === d.zx && c.zy === d.zy);
    }
    if (!d) return esconderTooltip();
    const f = ultimoFiltro;
    mostrarTooltip(`
      <strong>${nomeZona(d.zx, d.zy)}</strong><br/>
      Passes com ${estado.zona} nesta zona (${NORMALIZACAO[f.norm].unidade}):<br/>
      <span style="color:${COR_TIME.Spain}">■</span> Espanha: <b>${formatar(d.spain, f.norm, true)}</b> (${d.n_spain} no total)<br/>
      <span style="color:${COR_TIME.England}">■</span> Inglaterra: <b>${formatar(d.england, f.norm, true)}</b> (${d.n_england} no total)<br/>
      Diferença (Esp − Ing): <b>${d.diff > 0 ? '+' : ''}${formatar(d.diff, f.norm, true)}</b>`, ev);
  }

  async function atualizar(filtro) {
    if (!filtro) return;
    ultimoFiltro = filtro;
    const f = { ...filtro, zona: estado.zona };
    dadosAtuais = await consultar(sqlZonas(f));
    const norm = NORMALIZACAO[f.norm];
    const fmt = (v) => formatar(v, f.norm);

    // ESCALA SEQUENCIAL COMPARTILHADA: domínio [0, máximo entre os DOIS times].
    // Usar o mesmo domínio é o que permite comparar cor com cor entre os painéis.
    const max = d3.max(dadosAtuais, (d) => Math.max(d.spain, d.england));
    const seq = d3.scaleSequential(d3.interpolatePurples).domain([0, max]);

    // ESCALA DIVERGENTE: centrada em 0 e simétrica (±maior diferença absoluta),
    // para que a mesma intensidade de cor signifique a mesma diferença nos dois sentidos.
    // interpolateRdBu vai de vermelho (t=0) a azul (t=1); invertemos para positivo = Espanha = vermelho.
    const m = d3.max(dadosAtuais, (d) => Math.abs(d.diff)) || 1;
    const div = d3.scaleDiverging((t) => d3.interpolateRdBu(1 - t)).domain([-m, 0, m]);

    const totais = {
      spain: d3.sum(dadosAtuais, (d) => d.spain),
      england: d3.sum(dadosAtuais, (d) => d.england),
    };

    for (const p of paineis) {
      p.legenda.selectAll('*').remove();
      if (p.chave === 'diff') {
        p.titulo.html(`Diferença: <span style="color:${COR_TIME.Spain}">Espanha</span> − <span style="color:${COR_TIME.England}">Inglaterra</span>`);
        desenharCelulas(p, dadosAtuais, (d) => d.diff, div, (v) => (v > 0 ? '+' : '') + fmt(v));
        legendaContinua(p.legenda.node(), div, {
          titulo: `Diferença (${norm.unidade})`, formato: (v) => (v > 0 ? '+' : '') + fmt(v),
          rotuloEsq: '◄ Inglaterra passa mais', rotuloDir: 'Espanha passa mais ►',
        });
      } else {
        const time = p.chave === 'spain' ? 'Spain' : 'England';
        const total = f.norm === 'pct' ? '' : ` · ${fmt(totais[p.chave])} ${norm.unidade}`;
        p.titulo.html(`<span style="color:${COR_TIME[time]}">${NOME_TIME[time]}</span>${total}`);
        desenharCelulas(p, dadosAtuais, (d) => d[p.chave], seq, fmt);
        legendaContinua(p.legenda.node(), seq, { titulo: `${norm.unidade} (mesma escala nos dois times)`, formato: fmt });
      }
    }

    nota.html(`Contagem pela zona de <b>${estado.zona}</b> do passe. Normalização: <b>${norm.unidade}</b>
      (Espanha: 4 jogos; Inglaterra: 5). ${f.bolasParadas ? 'Inclui' : 'Exclui'} bolas paradas.
      Passe o mouse em uma zona para ver os valores nos três campos.`);
  }

  return { atualizar };
}

