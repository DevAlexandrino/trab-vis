/**
 * Painel "Original": o gráfico de Brennan Klein como apareceu no Junk Charts,
 * com crédito, contexto, a pergunta que ele tenta responder e a crítica.
 *
 * As imagens não são versionadas por direitos autorais: salve-as em
 * assets/caso1/original-spain.png e assets/caso1/original-england.png.
 * Se não existirem, um aviso com instruções aparece no lugar.
 */
const IMAGENS = [
  { arquivo: 'assets/caso1/original-spain.png', legenda: 'Spain – mapa de clusters de passes' },
  { arquivo: 'assets/caso1/original-england.png', legenda: 'England – mapa de clusters de passes' },
];

const PROBLEMAS = [
  ['Comparação só de memória', 'Spain e England estão em imagens separadas; é preciso lembrar de uma ao olhar a outra.'],
  ['Frequência escondida', 'O autor admite que os lançamentos longos da England “não aparecem no mapa” por serem pouco frequentes – justamente o contraste entre os estilos.'],
  ['Volume não normalizado', 'Não se sabe se os mapas estão na mesma escala nem se o total considera jogos ou minutos (Spain: 4 jogos; England: 5).'],
  ['Cor categórica sem significado', 'O “cluster vermelho” é um rótulo arbitrário; o leitor não aprende o que cada cor representa e cores diferentes sugerem diferenças maiores do que existem.'],
  ['Sobreposição de setas', 'Muitos passes curtos no meio-campo geram oclusão; a densidade real fica ilegível.'],
  ['Agregação perde a sequência', 'O título fala em “sequências longas”, mas o método trata passes como “bag of words”.'],
  ['Orientação ambígua', '“Atacou pela esquerda” depende do sentido de ataque, que não está indicado.'],
  ['Método opaco', 'Não se vê como os clusters foram formados (k, critério) e há pouco contexto (jogos, adversários).'],
];

export function criarOriginal(corpo) {
  corpo.innerHTML = `
    <div class="orig-imagens">
      ${IMAGENS.map((im) => `
        <figure>
          <img src="${im.arquivo}" alt="${im.legenda} (gráfico original)" loading="lazy"/>
          <div class="orig-ausente" hidden>
            Imagem original não incluída.<br/>Salve-a em <code>${im.arquivo}</code>.
          </div>
          <figcaption>${im.legenda}</figcaption>
        </figure>`).join('')}
    </div>
    <p class="credito">Gráficos: <strong>Brennan Klein</strong> (Northeastern University), Copa do Mundo 2022.
      Publicados e discutidos em <strong>Junk Charts</strong> (Kaiser Fung),
      <a href="https://www.junkcharts.com/making-sense-of-long-data-sequences/" target="_blank" rel="noopener">“Making sense of long data sequences”</a>.</p>

    <h4>O que o gráfico quer responder</h4>
    <p>Que estilo de jogo cada seleção tem, com base nos seus padrões de passe? O post faz isso como um
      quiz: “que time é este?”.</p>

    <h4>Dados (inferidos)</h4>
    <p>Passes com origem, destino, comprimento e direção, agrupados em <em>clusters</em> de passes parecidos.
      Cada seta é um passe; a cor é o cluster.</p>

    <h4>Problemas</h4>
    <ol class="problemas">
      ${PROBLEMAS.map(([t, d]) => `<li><strong>${t}.</strong> ${d}</li>`).join('')}
    </ol>
    <p class="nota">Design A resolve 1, 3 e 5 · Design B resolve 2, 4, 6 e 8 · ambos indicam o sentido de ataque (7).</p>`;

  // Fallback se a imagem não existir
  corpo.querySelectorAll('figure img').forEach((img) => {
    img.addEventListener('error', () => {
      img.hidden = true;
      img.nextElementSibling.hidden = false;
    });
  });
}

