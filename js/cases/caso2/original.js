// Painel Original: imagem do gráfico, fonte, pergunta, dados e crítica.

// Problemas do gráfico original: [título, descrição].
const PROBLEMAS = [
  ['Ordem sem critério', 'As fatias não seguem o valor nem a ordem alfabética. Semicondutores (23%) aparece depois de MRI (18%) e o leitor não sabe por quê.'],
  ['Ângulos difíceis de comparar', 'Fatias próximas (10% × 12%, 18% × 23%) parecem iguais. Comparar ângulos e áreas é menos preciso que comparar comprimentos.'],
  ['Cores demais', 'São 11 categorias e 11 cores. Há tons parecidos (dois roxos, dois azuis escuros) e a cor não significa nada além do rótulo.'],
  ['Legenda separada', 'O leitor precisa ir e voltar entre a legenda e a fatia para saber o que é cada cor.'],
  ['Fragmentação', 'Cinco categorias têm entre 3% e 6%. Sem agrupamento, o gráfico não mostra a estrutura do consumo (hélio líquido × gás).'],
  ['Mensagem ausente', 'A legenda diz que semicondutores passou a MRI e que pesquisa é cerca de 10%, mas nada no gráfico destaca isso.'],
];

export function criarOriginal(corpo) {
  corpo.innerHTML = `
    <div class="orig-imagens">
      <figure>
        <img src="assets/caso2/original-helio.jpg" alt="Gráfico de pizza original do consumo mundial de hélio por uso em 2025" loading="lazy"/>
        <figcaption>Consumo mundial de hélio por área de uso, 2025</figcaption>
      </figure>
    </div>
    <p class="credito">Gráfico: <strong>Physics Today</strong> (AIP), reportagem “Helium users brace as shortages begin”,
      de Toni Feder, adaptado de Kornbluth Helium Consulting. Discutido em <strong>Junk Charts</strong> (Kaiser Fung),
      <a href="https://www.junkcharts.com/yet-another-way-to-order-pie-slices/" target="_blank" rel="noopener">“Yet another way to order pie slices”</a>, 04/08/2026.</p>

    <h4>O que o gráfico quer responder</h4>
    <p>Quais setores consomem o hélio do mundo, e quanto cada um consome? A reportagem trata da falta de hélio,
      então interessa saber quem depende mais dele.</p>

    <h4>Dados</h4>
    <p>11 áreas de uso (categórico) e a participação de cada uma no consumo de 2025 (quantitativo, em %, somando 100).</p>

    <h4>Problemas</h4>
    <ol class="problemas">
      ${PROBLEMAS.map(([t, d]) => `<li><strong>${t}.</strong> ${d}</li>`).join('')}
    </ol>
    <p class="nota">Design A resolve 1, 2, 3 e 4 · Design B resolve 2, 4, 5 e 6.</p>`;

  // Clique na imagem abre em tamanho real
  corpo.querySelector('img').addEventListener('click', (e) => window.open(e.target.src, '_blank'));
}
