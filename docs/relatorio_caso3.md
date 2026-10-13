O seu arquivo Markdown está pronto:


relatorio_caso3
 MD 
Copie o conteúdo do bloco abaixo e cole diretamente dentro do arquivo docs/relatorio_caso3.md no VS Code:

Markdown
# Relatório Técnico: Caso 3 – Cobertura Florestal Mundial
**Disciplina:** Visualização de Dados – Universidade Federal Fluminense (UFF)  
**Tecnologias:** D3.js (v7), DuckDB-WASM, HTML5/CSS3 nativo

---

## 1. Apresentação do Original e Contexto
- **Fonte original:** visualização interativa do painel digital **Global Data Tracker**, criado por Ben P. O gráfico utiliza dados consolidados da **FAO** (Organização das Nações Unidas para a Alimentação e a Agricultura) disponibilizados pelos Indicadores de Desenvolvimento Mundial do **Banco Mundial** (*World Bank WDI: AG.LND.FRST.K2*, área florestal como percentual da área terrestre).
- **Onde foi discutido:** post *"The art of curation"*, publicado no *Junk Charts* (Kaiser Fung) em 06/10/2026, analisando o gráfico original da plataforma e uma proposta alternativa divulgada pelo próprio autor no Reddit.
- **Contexto:** o *Global Data Tracker* consolida dados históricos de diversos países e do agregado mundial. Na seção de cobertura florestal, a aplicação exibe uma série temporal de 1990 a 2023. Fung pontua que o gráfico parece gerado por um template genérico e estático do software (*"came right out of the box"*), resultando em desperdício de espaço e perda de sinal.
- **Formato:** gráfico de linha temporal contínua em tema escuro (*Over time*), plotando a média mundial (*World figure: 31.1%*), com o eixo X estendido de 1960 a 2025, o eixo Y forçado a iniciar em 0% com teto em 33.01%, e um card de destaque textual à esquerda.
- **Pergunta que o gráfico pretende responder:** *Como evoluiu a área florestal mundial ao longo do tempo?* Em termos de sustentabilidade e ecologia prática, a pergunta real é: *onde as florestas estão diminuindo e onde estão se expandindo, e qual é a severidade dessas alterações em escala física e proporcional?*

---

## 2. Dados e Atributos Envolvidos
Os dados foram estruturados a partir da série histórica da FAO/Banco Mundial para os 10 países com as maiores coberturas florestais no ano 2000, salvos em `data/caso3/forest_data.csv`:

| Atributo | Tipo | Descrição |
| :--- | :--- | :--- |
| `pais` / `pais_en` | Categórico (nominal) | Nome do país em português e inglês (10 países selecionados). |
| `area_2000_mha` | Quantitativo (razão) | Área florestal no ano base 2000, expressa em milhões de hectares (Mha). |
| `area_2023_mha` | Quantitativo (razão) | Área florestal no ano final 2023, expressa em milhões de hectares (Mha). |
| `var_mha` | Quantitativo (intervalo) | Variação líquida absoluta de área florestal entre 2000 e 2023 ($Mha = \text{área}_{2023} - \text{área}_{2000}$). Valores positivos indicam ganho; negativos indicam perda. |
| `var_pct` | Quantitativo (razão) | Variação relativa percentual sobre o estoque de 2000 ($\%$). |
| `status` | Categórico (derivado) | Classificação derivada no DuckDB: *Ganho* ($\text{var\_mha} \ge 0$) ou *Perda* ($\text{var\_mha} < 0$). |

**Valores:** Rússia (857.1 Mha em 2000; +6.0 Mha; +0.7%), Brasil (553.3 Mha; -58.1 Mha; -10.5%), Canadá (333.3 Mha; -1.0 Mha; -0.3%), Estados Unidos (300.0 Mha; +6.3 Mha; +2.1%), China (176.7 Mha; +48.6 Mha; +27.5%), RD Congo (143.8 Mha; -21.0 Mha; -14.6%), Austrália (129.4 Mha; +2.2 Mha; +1.7%), Indonésia (101.9 Mha; -11.0 Mha; -10.8%), Angola (78.0 Mha; -12.8 Mha; -16.4%), Peru (76.1 Mha; -3.5 Mha; -4.6%).

**Tarefas analíticas:** comparar a magnitude dos estoques florestais entre os países, ranquear e diferenciar os países por ganho ou perda líquida absoluta, e correlacionar a escala do impacto geográfico bruto com a intensidade relativa local.

---

## 3. Crítica Fundamentada da Visualização Original

1. **Baixa razão dado-tinta (*Data-Ink Ratio* de Tufte) e template estático:** o eixo horizontal se estende de 1960 a 2025, mas os dados da FAO só iniciam por volta de 1990. Cerca de metade da área do gráfico é puro vazio horizontal. Isso decorre da reutilização cega do mesmo template de escala empregado em outros indicadores (como população urbana, que possuía dados desde 1960).
2. **Eixo vertical forçado em zero e achatamento do sinal:** pela teoria de visualização (Cleveland & McGill; Fung), gráficos de linha não são gráficos de barras e não exigem que o eixo Y inicie obrigatoriamente no zero quando a métrica varia em uma faixa restrita longe de zero. Como a média mundial oscilou sutilmente entre 31% e 33% ao longo de mais de 30 anos, fixar a base em 0% achatou completamente a inclinação da reta, dando a falsa impressão perceptual de imutabilidade estática.
3. **Linhas de grade com valores arbitrários:** os marcadores do eixo Y dividem a escala de modo algorítmico sem arredondamento humano, gerando linhas em níveis inusitados como 33.01% e 24.76%, aumentando a carga cognitiva sem acrescentar valor semântico.
4. **Agregação excessiva (falácia da média global):** ao resumir mais de 200 nações a uma única linha mundial (*"World figure: 31.1%"*), o gráfico neutraliza dinâmicas ecológicas opostas de escala planetária: enquanto a China acrescentou quase 50 milhões de hectares via reflorestamento, o Brasil reduziu quase 60 milhões de hectares no mesmo intervalo. A média mascara crises regionais agudas.
5. **Dilema métrico não resolvido (absoluto vs. relativo):** a visualização original avalia apenas percentuais da área terrestre de cada país. Isso remove a informação sobre a escala física territorial, tornando impossível discernir o impacto ecológico de grandes extensões de biomassa frente a pequenas variações locais.
6. **Ausência de foco narrativo (Vértice Q do *Trifecta Checkup*):** a visualização original exibe dados operacionais de banco de dados sem formular uma pergunta investigativa clara. Ela não responde quem lidera os ganhos, quem concentra as perdas ou qual a gravidade da transição de uso da terra.

---

## 4. Propostas de Redesign

### 4.1 Design A – Dumbbell Plot (Connected Dot Plot)
- **Tarefa priorizada:** comparar o volume total de floresta dos maiores países em dois pontos no tempo (2000 e 2023), identificando o sentido e a magnitude do deslocamento de cada nação em uma escala comum.
- **Codificação visual:**
  - **Dois círculos alinhados por país:** o ponto inicial no ano 2000 codificado em cinza neutro e o ponto final no ano 2023 codificado com cor semântica (verde para expansão, vermelho para retração).
  - **Segmento de reta horizontal conectando os pontos:** o comprimento do segmento expressa visualmente a magnitude da variação, enquanto a orientação espacial (se o ponto colorido está à direita ou à esquerda do cinza) indica ganho ou perda.
  - **Posição em escala linear comum (Eixo X):** expressa em milhões de hectares (Mha) começando em 0 Mha, mantendo a integridade da magnitude física dos estoques de cada país.
  - **Ordenação configurável calculada no DuckDB:** o usuário pode alternar a visualização entre o ranking por *Variação Líquida* (`ORDER BY var_mha DESC`) e o ranking por *Estoque Florestal Total em 2000* (`ORDER BY area_2000_mha DESC`).
  - **Rótulos diretos:** o valor absoluto da variação líquida é anotado diretamente à direita do maior ponto de cada linha, dispensando esforço de busca em eixos distantes.
- **Problemas resolvidos:** 1 (espaço 100% útil, focado no intervalo analisado), 2 (escala com resolução perceptiva adequada), 4 (desagregação por país) e 5 (exibe a dimensão física absoluta e a variação em uma única tela alinhada).

### 4.2 Design B – Dispersão de Quadrantes (Scatter Plot: Absoluto × Relativo)
- **Tarefa priorizada:** cruzar a dimensão física do impacto ambiental (saldo em milhões de hectares) com a dimensão proporcional local (severidade percentual em relação ao inventário original do país).
- **Codificação visual:**
  - **Eixo horizontal (X):** variação absoluta líquida ($Mha$), variando de -65 Mha a +55 Mha, com uma linha de referência vertical pontilhada destacando o ponto neutro (0 Mha).
  - **Eixo vertical (Y):** variação relativa percentual ($\%$), variando de -20% a +32%, com uma linha de referência horizontal pontilhada destacando a taxa neutra (0%).
  - **Quadrantes conceituais:** dividem claramente as nações em expansão simultânea (quadrante superior direito) e retração mútua (quadrante inferior esquerdo).
  - **Tamanho das marcas (área dos círculos):** codifica o estoque florestal inicial do país no ano 2000 via escala raiz quadrada (`d3.scaleSqrt`), preservando a percepção fiel da proporção de área geométrica.
  - **Cores divergentes com significado:** verde esmeralda para países com saldo florestal positivo e vermelho terracota para países com desmatamento líquido.
  - **Rótulos diretos:** nomes dos países posicionados estrategicamente próximos aos centros dos círculos para leitura imediata sem sobreposição.
- **Problemas resolvidos:** 2 (aproveitamento completo da área de plotagem), 4 (análise individualizada dos polos mundiais), 5 (resolve o dilema entre métrica absoluta e relativa integrando ambas nos eixos ortogonais) e 6 (narrativa analítica explícita sobre a severidade do desmatamento).

---

## 5. Comparação entre as Propostas

| Critério | Design A (Dumbbell Plot) | Design B (Dispersão de Quadrantes) |
| :--- | :--- | :--- |
| **Tarefa central** | Comparar estoques totais e o sentido do deslocamento histórico por país. | Correlacionar volume físico alterado com a severidade relativa local. |
| **Canal principal** | Posição em escala comum horizontal alinhada (canal mais preciso de Cleveland & McGill). | Posição em eixos ortogonais X e Y (dupla escala quantitativa com referencial neutro central). |
| **Uso da cor** | Categórica funcional: cinza para estado prévio (2000); verde/vermelho para estado atual (2023). | Categórica com polaridade semântica: verde para saldo positivo e vermelho para perda. |
| **Volume de referência** | Explícito e diretamente mensurável pelo comprimento ao longo do eixo X (0 a 860 Mha). | Codificado como canal secundário no tamanho da marca circular (`d3.scaleSqrt`). |
| **Curva de aprendizado** | Baixa: leitura linear e intuitiva, similar a um gráfico de barras pareadas. | Média: exige familiaridade com interpretação de dispersão e quadrantes bidimensionais. |
| **Contexto de uso** | Apresentações e relatórios executivos para demonstrar quem são os gigantes florestais e quem mudou. | Análise aprofundada de política ambiental para distinguir impacto planetário de impacto local. |

**Trade-offs:**
- O **Design A** privilegia a exatidão da comparação linear dos estoques físicos totais de cada país. Permite ver de imediato que a Rússia possui uma cobertura florestal vastamente superior a todas as outras, mas torna menos saliente a proporção relativa de perda (a leitura do percentual exige atenção aos rótulos numéricos).
- O **Design B** evidencia a correlação entre as duas métricas discutidas por Kaiser Fung: revela com clareza imediata que Angola sofreu um impacto ecológico local mais severo em proporção (-16.4%) do que o Brasil (-10.5%), ainda que o Brasil represente uma perda de biomassa física incomparavelmente maior (-58.1 Mha contra -12.8 Mha). No entanto, estimar os estoques totais pelo tamanho das bolhas é menos preciso do que a leitura em escala alinhada do Design A.

---

## 6. Implementação Técnica com DuckDB-WASM

O arquivo `forest_data.csv` é registrado no navegador e processado no banco em memória pelo método `read_csv_auto`. As rotinas SQL ficam centralizadas em `js/cases/caso3/queries.js`:

1. `sqlDumbbell(ordenacao)`: realiza a consulta de projeção dos estoques temporais e da variação, aplicando a ordenação dinâmica requisitada pelos botões de alternância da interface (`ORDER BY var_mha DESC` ou `ORDER BY area_2000_mha DESC`).
2. `sqlScatter()`: calcula os eixos do gráfico de dispersão e deriva condicionalmente o atributo de classe textual `status` (`CASE WHEN var_mha >= 0 THEN 'Ganho' ELSE 'Perda' END`).
3. `sqlValidacao()`: executa agregações de controle, retornando a contagem de nações analisadas, o ganho total somado (+63.1 Mha), a perda total somada (-107.4 Mha) e o saldo líquido agregado mundial (-44.3 Mha). O resultado alimenta dinamicamente o rodapé analítico da página.

A renderização visual é realizada estritamente com D3.js nativo (v7), dispensando bibliotecas de abstração:
- Escalas: `d3.scaleBand` para ancoragem dos países, `d3.scaleLinear` para eixos lineares numéricos e `d3.scaleSqrt` para calibrar áreas circulares sem distorção perceptiva de raio.
- Eixos: `d3.axisBottom` e `d3.axisLeft` com estilização e formatação de unidades customizadas (`Mha` e `%`).
- Elementos SVG: geração direta de `<line>` para conectores e eixos neutros, `<circle>` para marcas pontuais e `<text>` para rótulos diretos, utilizando o padrão declarativo `.data().join()`.

---

## 7. Limitações
- **Cobertura agregada de florestas:** os dados do Banco Mundial e da FAO combinam florestas primárias nativas e áreas plantadas/silvicultura comercial sob a mesma métrica de cobertura. O ganho de área florestal verificado na China (+48.6 Mha), por exemplo, resulta em grande parte de reflorestamentos homogêneos, que possuem valor ecossistêmico e biodiversidade distintos de uma floresta tropical nativa preservada.
- **Seleção amostral restrita (Top 10):** a seleção considera os 10 maiores países em área florestal no ano base 2000. Isso exclui países menores que podem ter sofrido taxas de desmatamento proporcional ainda mais alarmantes (ex.: casos de corte raso na América Central ou Sudeste Asiático que não entram no top 10 absoluto).
- **Sem detalhamento temporal ano a ano:** os redesigns concentram-se na comparação do saldo líquido entre 2000 e 2023. Eventos pontuais dentro do intervalo (como períodos de desaceleração do desmatamento seguidos de novas altas) não são visíveis nesta granularidade bienal.