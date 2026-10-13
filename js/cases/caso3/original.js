// Painel que exibe a visualização original e a análise crítica inicial.
export function criarOriginal(container) {
  container.innerHTML = `
    <div class="painel-conteudo" style="display:flex; flex-direction:column; gap:14px; font-size:13px; line-height:1.5;">
      <div style="background:#0f172a; padding:12px; border-radius:8px; text-align:center;">
        <img 
          src="assets/caso3/original-forest2.jpg" 
          alt="Visualização original do Global Data Tracker mostrando a evolução da área florestal mundial" 
          style="max-width:100%; height:auto; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.3);"
        />
      </div>

      <div class="bloco-critica">
        <h4 style="margin:0 0 6px 0; font-size:14px; color:#1e293b;">Diagnóstico Crítico da Visualização Original</h4>
        <ul style="margin:0; padding-left:18px; color:#475569; display:flex; flex-direction:column; gap:6px;">
          <li>
            <strong>Espaço Inútil e Quebra da Série Temporal:</strong> O eixo horizontal estende-se de 1960 a 2025, mas os dados do Banco Mundial só começam na década de 1990. Metade da área do gráfico é puro vazio visual devido ao uso de um template estático.
          </li>
          <li>
            <strong>Eixo Vertical Inadequado e Achatamento:</strong> O eixo Y foi forçado a iniciar em 0% para uma métrica que oscilou apenas entre 31% e 33% em mais de 30 anos. Essa decisão achatou a curva, fazendo parecer que nenhuma mudança relevante ocorreu no planeta.
          </li>
          <li>
            <strong>Linhas de Grade com Rótulos Arbitrários:</strong> A escala vertical exibe marcas em frações confusas como <code>33.01</code> e <code>24.76</code>, gerando ruído cognitivo desnecessário.
          </li>
          <li>
            <strong>Agregação Cega (Média Global):</strong> Reduzir a cobertura florestal do planeta a uma taxa única esconde dinâmicas cruciais e opostas: enquanto a China acrescentou quase 50 milhões de hectares, o Brasil perdeu quase 60 milhões no mesmo período.
          </li>
        </ul>
      </div>
    </div>
  `;
}