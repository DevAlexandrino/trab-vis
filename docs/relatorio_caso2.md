# Relatório Técnico: Caso 2 – Consumo Mundial de Hélio
**Disciplina:** Visualização de Dados – Universidade Federal Fluminense (UFF)  
**Tecnologias:** D3.js (v7), DuckDB-WASM, HTML5/CSS3 nativo

---

## 1. Apresentação do Original e Contexto
- **Fonte original:** reportagem *"Helium users brace as shortages begin"*, de Toni Feder, publicada na revista **Physics Today** (American Institute of Physics, p. 17). O gráfico foi adaptado de dados da **Kornbluth Helium Consulting**.
- **Onde foi discutido:** post *"Yet another way to order pie slices"*, publicado no *Junk Charts* (Kaiser Fung) em 04/08/2026, a partir de um exemplo enviado pelo leitor Aleksander B.
- **Contexto:** a reportagem trata da falta de hélio causada pelo conflito no Oriente Médio. O Catar fornece cerca de 30% do hélio mundial e o Estreito de Ormuz estava praticamente fechado. O gráfico mostra quem consome o hélio do mundo.
- **Formato:** gráfico de pizza com 11 fatias, legenda separada com 11 cores e percentuais escritos nas fatias.
- **Pergunta que o gráfico pretende responder:** *Quais áreas consomem o hélio do mundo, e quanto cada uma consome?* Num contexto de escassez, a pergunta prática é: *quem depende mais do hélio?*

## 2. Dados e Atributos Envolvidos
Os dados foram lidos diretamente dos rótulos do gráfico original e salvos em `data/caso2/helio.csv`:

| Atributo | Tipo | Descrição |
| :--- | :--- | :--- |
| `uso` / `uso_pt` | Categórico (nominal) | Área de uso, com o nome em inglês e em português (11 categorias). |
| `pct` | Quantitativo (razão) | Participação no consumo mundial de 2025, em %. Os valores são inteiros e somam 100. |
| `ordem_original` | Ordinal | Posição da fatia no gráfico, contada a partir do topo no sentido horário. |
| `setor` | Categórico (derivado) | **Não existe no original.** Criamos o atributo para o Design B: *Manufatura*, *Criogenia (hélio líquido)* e *Aeroespacial, balões e mergulho*. |

**Valores:** Semicondutores 23, Ressonância magnética 18, Soldagem 12, Balões e elevação 10, Laboratório 10, Aeroespacial 8, Detecção de vazamentos 6, Outros criogênicos 4, Atmosferas controladas 3, Fibra óptica 3, Mergulho e respiração 3.

**Tarefas analíticas:** comparar valores entre categorias, encontrar os maiores consumidores (ranking e extremos) e entender a composição do total (parte-todo e agrupamentos).

## 3. Crítica Fundamentada da Visualização Original

1. **Ordem sem critério:** as fatias não seguem o valor nem a ordem alfabética. Semicondutores (23%) vem depois de MRI (18%). Fung supõe que a ordem venha de anos anteriores, mas o gráfico não explica. Ordenar por valor é a forma mais simples de apoiar a tarefa de ranking.
2. **Ângulo e área são canais pouco precisos:** pela hierarquia de efetividade dos canais (Cleveland & McGill; Munzner), comparar ângulos e áreas é bem menos preciso que comparar posições ou comprimentos em uma escala comum. Fatias de 10% e 12%, ou de 18% e 23%, parecem quase iguais. Os rótulos numéricos acabam substituindo o gráfico.
3. **Cores demais:** são 11 matizes para 11 categorias nominais, bem acima das 6 a 8 cores que se distinguem com segurança. Há tons parecidos (dois roxos, dois azuis escuros), e a cor não carrega nenhum significado além de identificar a categoria.
4. **Legenda separada:** para identificar cada fatia, o leitor precisa ir e voltar entre a fatia e a legenda. Isso exige memória de curto prazo. Rótulos diretos eliminariam esse esforço.
5. **Fragmentação sem estrutura:** cinco categorias têm entre 3% e 6%. O gráfico trata as 11 como equivalentes e não mostra uma estrutura importante do domínio: alguns usos dependem de hélio **líquido** (criogenia), outros usam hélio como **gás**.
6. **Mensagem ausente:** a legenda afirma duas coisas: semicondutores ultrapassou MRI, e a pesquisa responde por cerca de 10%. O gráfico não destaca nenhuma delas. Como diz o leitor citado por Fung, *"o autor só incluiu o gráfico sem considerar qual mensagem queria passar"*. Isso corresponde ao vértice **Q** (pergunta) do *Trifecta Checkup* de Fung.

---

## 4. Propostas de Redesign

### 4.1 Design A – Ranking dos Usos
- **Tarefa priorizada:** comparar os usos entre si e encontrar os maiores consumidores.
- **Codificação visual:**
  - **Barras horizontais** em escala linear com zero real (0 a 25%). O comprimento substitui o ângulo, e a posição em escala comum é o canal mais preciso para dados quantitativos.
  - **Ordenação decrescente por valor**, calculada no DuckDB (`ORDER BY pct DESC`).
  - **Rótulos diretos:** o nome à esquerda e o valor no fim da barra. Não há legenda.
  - **Destaque dos 3 maiores** em cinza escuro, com o restante em cinza claro. O título é calculado por consulta: *"Três usos consomem 53% do hélio do mundo"*. Usamos uma única cor de destaque em vez de 11 matizes.
  - **Interação:** um botão alterna entre "Por valor" e "Como no original", com transição animada. Isso mostra ao leitor quanto a ordem afeta a leitura. Um *tooltip* mostra a posição no ranking e o setor.
- **Problemas resolvidos:** 1 (ordem), 2 (ângulo → comprimento), 3 (cores) e 4 (legenda).

### 4.2 Design B – Usos Agrupados por Setor
- **Tarefa priorizada:** entender como o consumo se divide, primeiro entre setores e depois dentro de cada setor.
- **Codificação visual:**
  - **Uma única coluna empilhada de 100%**, em que a altura de cada segmento é proporcional ao percentual. A posição dos segmentos (`inicio`) é calculada no DuckDB com uma soma acumulada (`sum(pct) OVER (...)`).
  - **Agrupamento por setor**, com os setores ordenados pelo total e os usos ordenados dentro de cada setor:
    - *Manufatura* (47%): semicondutores, soldagem, detecção de vazamentos, atmosferas controladas e fibra óptica;
    - *Criogenia – hélio líquido* (32%): ressonância magnética, laboratório e outros usos criogênicos;
    - *Aeroespacial, balões e mergulho* (21%): balões e elevação, aeroespacial, mergulho e respiração.
  - **Cor por setor** (3 matizes em vez de 11). Aqui a cor tem significado: indica a que grupo o uso pertence.
  - **Chaves laterais** com o total de cada setor e **rótulos diretos** à direita de cada segmento.
- **Problemas resolvidos:** 2 (comprimento em vez de ângulo), 4 (rótulos diretos), 5 (estrutura do consumo) e 6 (mensagem: a manufatura consome quase metade do hélio, e um terço é usado como hélio líquido).

---

## 5. Comparação entre as Propostas

| Critério | Design A (Ranking) | Design B (Setores) |
| :--- | :--- | :--- |
| **Tarefa central** | Comparar usos individuais e achar os maiores. | Ver a composição do total e os grupos. |
| **Canal principal** | Comprimento em escala comum (muito preciso). | Comprimento empilhado (preciso para o total de cada setor, menos para segmentos internos). |
| **Uso da cor** | Destaque (3 maiores × resto). | Categórica com significado (setor). |
| **Parte-todo** | Implícita (só o título mostra o 53%). | Explícita (a coluna soma 100%). |
| **Dependência de interpretação nossa** | Nenhuma: usa só os dados do original. | Alta: os setores são uma escolha nossa. |
| **Contexto de uso** | Leitura rápida: reportagem e resposta direta a "quem consome mais?". | Análise de impacto: saber quais setores sofrem mais com a falta de hélio. |

**Trade-offs:**
- O Design A é o mais fiel aos dados e o mais fácil de ler, mas perde a noção de parte-todo e não agrupa nada.
- O Design B conta uma história mais rica, mas segmentos empilhados que não estão alinhados a uma linha de base comum são mais difíceis de comparar entre si. Por exemplo, comparar Laboratório (10%) com Balões (10%) é mais difícil no B do que no A. Além disso, a mensagem depende de um agrupamento que outro analista poderia fazer de outra forma.

---

## 6. Implementação Técnica com DuckDB-WASM

O arquivo `helio.csv` é registrado no navegador e lido com `read_csv_auto`. As consultas ficam em `js/cases/caso2/queries.js`:

1. `sqlUsos(ordem)`: lista os usos com `rank() OVER (ORDER BY pct DESC)`, ordenando por valor ou pela ordem original.
2. `sqlTop3()`: soma dos três maiores percentuais, usada no título do Design A.
3. `sqlSetores()`: total por setor (CTE com `GROUP BY`) e posição acumulada de cada segmento com função de janela, usada para desenhar a coluna do Design B.
4. `sqlValidacao()`: confere que há 11 categorias somando 100%. O resultado aparece no rodapé da aplicação.

As somas são convertidas para `INTEGER` (`::INTEGER`). Sem isso, o DuckDB devolve `HUGEINT`, que não vira número diretamente em JavaScript.

A renderização usa apenas D3.js: `scaleLinear`, `scaleBand`, `axisBottom`, `selectAll().data().join()` com chave estável para a transição de reordenação, e elementos SVG (`rect`, `text`, `path`).

---

## 7. Limitações
- **Dados arredondados:** os percentuais vêm dos rótulos do gráfico, arredondados para inteiros. Diferenças de 1 ponto podem ser efeito do arredondamento.
- **Sem série histórica:** não há dados de anos anteriores, então não é possível mostrar a principal afirmação da legenda (semicondutores ultrapassou MRI). Uma terceira proposta seria um *slope chart* entre dois anos, se esses dados estivessem disponíveis.
- **Setores criados por nós:** o agrupamento do Design B foi definido pelo grupo a partir do tipo de uso do hélio (líquido × gás). Não é uma classificação oficial.
- **Sem volumes absolutos:** o gráfico mostra participação percentual, não volume. Não dá para saber se o consumo total cresceu ou caiu.
