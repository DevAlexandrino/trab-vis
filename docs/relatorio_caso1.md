# Relatório Técnico: Redesign de Visualizações de Dados
**Disciplina:** Visualização de Dados – Universidade Federal Fluminense (UFF)  
**Projeto:** Redesign de Casos Críticos (Junk Charts / Makeover Monday)  
**Tecnologias:** D3.js (v7), DuckDB-WASM, HTML5/CSS3 nativo (sem frameworks de alto nível)

---

## 1. Introdução

Visualizações de dados publicadas em veículos jornalísticos, blogs especializados e relatórios técnicos frequentemente pretendem comunicar padrões complexos, mas acabam comprometendo a interpretação do leitor. Escolhas inadequadas de escalas, agregação, mapeamento visual, saturação e ausência de interação sobrecarregam a cognição do usuário.

Este projeto tem como meta aplicar a teoria de visualização de dados (marcas, canais, tarefas analíticas e expressividade/efetividade) no redesign crítico de gráficos reais. A arquitetura foi concebida para abrigar três casos de estudo em uma aplicação web integrada, com navegação fluida, execução analítica em tempo de execução via **DuckDB-WASM** (direto no navegador) e renderizações semânticas em **D3.js** de baixo nível.

### Relação com os Casos e Fontes de Dados
- **Caso 1 (Implementado):** *Padrões de Passe na Copa do Mundo de 2022 (Espanha × Inglaterra)*, baseado no estudo de Brennan Klein (Northeastern University / NetSI) e discutido no blog *Junk Charts* ("Making sense of long data sequences"). Os dados brutos foram obtidos do repositório aberto StatsBomb Open Data (evento a evento, jogos completos da Copa de 2022).
- **Casos 2 e 3 (Esqueleto estruturado para os colegas de grupo):** Estruturados na aplicação a partir de pautas e conjuntos de dados selecionados de repositórios como o portal de conjuntos de dados do *Makeover Monday* (`https://makeovermonday.vercel.app/datasets`).

---

## 2. Análise do Caso 1: Passes na Copa do Mundo de 2022 (Espanha × Inglaterra)

### 2.1 Apresentação do Original e Contexto
- **Fonte original:** Post "Making sense of long data sequences", publicado no *Junk Charts* (Kaiser Fung), baseado nas pesquisas em sports analytics de **Brennan Klein** (Northeastern University, Complexity & Society Lab).
- **Formato:** Dois mapas de campo contendo milhares de setas coloridas, gerados como um desafio/quiz ("que time é este?").
- **Pergunta que o gráfico pretende responder:** *Qual é o estilo de jogo e a identidade tática de cada seleção nacional com base em seus padrões de passe?*

### 2.2 Dados e Atributos Envolvidos
O gráfico original utiliza dados inferidos de eventos de futebol, mapeados pelo StatsBomb:
- **Origem do passe:** Coordenadas espaciais $(x_0, y_0)$ no campo (120 × 80 jardas).
- **Destino do passe:** Coordenadas espaciais $(x_1, y_1)$ no campo.
- **Comprimento e Ângulo:** Medidas métricas e angulares calculadas a partir das posições.
- **Identificador de Posse (`possession`):** Sequência temporal de eventos ininterruptos controlados pela mesma equipe.
- **Agrupamento original:** Clusters de passes calculados algoritmicamente (aparentemente k-means), mapeados por cor categórica.

### 2.3 Crítica Fundamentada da Visualização Original
A análise crítica fundamentada na teoria de visualização apontou 8 falhas severas:

1. **Comparação dependente de memória:** Espanha e Inglaterra são dispostas em figuras isoladas. O leitor precisa memorizar uma tela para tentar comparar com a outra.
2. **Frequência escondida (apagamento de diferenças):** O próprio autor admite que passes longos da Inglaterra "não aparecem no mapa" por terem menor volume que os curtos. O gráfico omite exatamente o traço que diferencia os estilos táticos.
3. **Volume não normalizado:** A Espanha troca um volume muito superior de passes (cerca de 34% a mais por jogo e por 90 min) em comparação à Inglaterra. Como a densidade de tinta não é ajustada pela quantidade de jogos ou minutos, os mapas não são comparáveis em termos absolutos.
4. **Cor categórica sem significado semântico:** O post cita um "cluster vermelho", mas as cores são rótulos arbitrários sem legenda explicativa das variáveis que as compõem. Cores distintas sugerem descontinuidades taxonômicas inexistentes.
5. **Sobreposição de setas (oclusão severa):** Milhares de passes curtos no círculo central geram sobreposição total de linhas ("hairball"), tornando ilegível a densidade real dos passes.
6. **Agregação que destrói a sequência temporal:** Embora o título fale em "sequências longas", o gráfico agrega os dados como uma "bolsa de passes" desordenada. A ordem de causa e efeito (o que acontece depois de um passe vertical?) é completamente descartada.
7. **Orientação espacial ambígua:** Frases como "atacou pela esquerda" dependem de saber para qual lado a equipe ataca, o que não estava explicitado no mapa.
8. **Método opaco:** Os parâmetros do clustering ($k$, normalização de atributos, distância euclidiana vs. angular) não são transparentes ao analista.

---

## 3. Propostas de Redesign

### 3.1 Design A – Comparação Direta Espacial
- **Tarefa analítica priorizada:** Comparar **onde** cada seleção constrói o seu jogo de passes pelo campo.
- **Mapeamento e Codificação Visual:**
  - O campo de jogo é dividido em uma grade regular de 6 colunas × 4 faixas (zonas de 20 × 20 jardas).
  - Emprega três painéis alinhados: Espanha, Inglaterra e um terceiro painel de **Diferença (Espanha − Inglaterra)**.
  - **Identidade visual coerente:** A Espanha utiliza escala sequencial em tons de vermelho (`d3.interpolateReds`) e a Inglaterra em tons de azul (`d3.interpolateBlues`). Ambos os painéis compartilham rigorosamente o **mesmo domínio de dados** ($[0, \max]$), assegurando comparação justa de intensidade e alinhamento direto com o painel divergente.
  - O painel de diferença utiliza uma escala **divergente balanceada e centrada em zero** (`d3.interpolateRdBu`, vermelho para predominância da Espanha e azul para predominância da Inglaterra).
  - Normalização interativa: o usuário pode alternar entre passes *por jogo*, *por 90 minutos* e *% do total de passes da equipe* (isolando a geometria do estilo do efeito do volume bruto).
  - Permite inspecionar zona de *origem* ou de *destino*.
  - **Problemas resolvidos:** Resolve os problemas 1 (comparação direta), 3 (normalização explícita) e 5 (eliminação de oclusão por agregação espacial zonal).

### 3.2 Design B – Tipos de Passe e Sequência de Jogada ("O que vem depois")
- **Tarefa analítica priorizada:** Compreender o **estilo tático** (repertório de passes) e a **estrutura sequencial** do jogo.
- **Mapeamento e Codificação Visual:**
  - Substitui o clustering opaco por uma taxonomia explícita e transparente baseada em regras de negócio: Comprimento (*Curto < 15 jd*, *Médio 15–30 jd*, *Longo ≥ 30 jd*) $\times$ Direção (*Trás*, *Lado*, *Frente*).
  - **Matriz 3 × 3 de setas glifo:** A espessura da haste do polígono da seta é mapeada linearmente na frequência do passe, com zero real em zero pixels. O comprimento do glifo indica a faixa e a orientação indica o sentido.
  - **Gráfico de barras agrupadas ordenadas:** Leitura numérica exata e rápida da frequência de cada tipo de passe lado a lado.
  - **Painel sequencial ("O que vem depois"):** Ao clicar em qualquer categoria de passe, uma consulta `LEAD()` no DuckDB computa a distribuição probabilística da próxima ação do mesmo time na mesma posse (novo passe por tipo, finalização/chute, perda ou passe errado).
  - **Campos duplos sincronizados:** Renderização dos passes reais daquela categoria específica em campos em miniatura, mitigando a oclusão por filtragem pontual.
  - **Problemas resolvidos:** Resolve os problemas 2 (lançamentos longos visíveis e mensuráveis), 4 (categorias com significado geométrico direto), 6 (análise sequencial de posse) e 8 (regras de SQL transparentes).

---

## 4. Comparação entre as Propostas de Redesign

| Critério | Design A (Grade de Zonas) | Design B (Tipos de Passe e Sequência) |
| :--- | :--- | :--- |
| **Tarefa Central** | Onde os passes ocorrem (geografia do campo). | Que passes são tentados e o que acontece em seguida. |
| **Velocidade de Leitura** | Imediata (visão de calor rápida e intuitiva). | Requer exploração analítica e interação. |
| **Tratamento da Sequência** | Não contempla (agregação espacial estática). | Central (rastreia transições de posse com `LEAD()`). |
| **Controle de Oclusão** | Completo (resolvido por binning em 24 zonas). | Parcial (resolvido por filtragem interativa e redução de opacidade). |
| **Contexto de Uso Recomendado** | Análise tática pré-jogo de ocupação territorial e zonas de pressão. | Análise aprofundada de modelo de jogo e transições ofensivas. |

---

## 5. Implementação Técnica e Modelagem com DuckDB-WASM

### 5.1 Arquitetura e Bibliotecas
A aplicação não utiliza bibliotecas de gráficos de alto nível (como Plotly, Vega-Lite ou Chart.js), cumprindo integralmente as exigências do curso. Toda a renderização gráfica utiliza unicamente **D3.js (v7)**:
- `d3.scaleLinear`, `d3.scaleBand`, `d3.scaleSequential`, `d3.scaleDiverging`;
- Seleções declarativas (`selectAll`, `data`, `join`);
- Interpolação suave e transições animadas (`transition().duration(600)`);
- Elementos vetoriais SVG paramétricos (`path`, `rect`, `line`, `text`, `marker`).

### 5.2 Modelagem de Dados no Navegador com DuckDB-WASM
Em vez de pré-processar agregados estáticos no servidor ou em Python, a aplicação registra o arquivo bruto NDJSON do StatsBomb e processa as transformações em tempo real via SQL dentro do WebAssembly:
1. `read_json_auto`: inferência automática de schemas complexos aninhados do StatsBomb (`location[1]`, `pass.end_location`, etc.).
2. `passes_cat`: categorização categórica transparente com `CASE WHEN` para faixas de distância e direção por ângulos em graus.
3. `acoes_posse`: janela analítica `LEAD(tipo) OVER (PARTITION BY match_id, possession, team ORDER BY idx)` para identificar o evento subsequente de cada jogada.
4. `minutos_jogo`: cálculo do tempo efetivo total de jogo a partir dos eventos `Half End`, viabilizando normalizações corretas por 90 minutos de bola rolando.

---

## 6. Considerações sobre os Requisitos e Próximos Passos do Grupo

1. **Atendimento aos requisitos do Caso 1:** O Caso 1 cumpre todos os requisitos do enunciado: contextualização do original, identificação de atributos, crítica dos 8 problemas, implementação dos Designs A e B em D3.js puro, processamento dinâmico com DuckDB e comentários detalhados no código.
2. **Integração com os Casos 2 e 3:** O esqueleto modular da aplicação (`js/cases/registry.js`, `js/layout.js`, `js/db.js`) está pronto para receber os dois próximos casos pelo grupo, suportando conjuntos de dados do portal Makeover Monday ou novos posts do Junk Charts.

