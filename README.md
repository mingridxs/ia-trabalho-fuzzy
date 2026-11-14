# Simulador Fuzzy Mamdani — Tempo de Irrigação

Atividade prática de Sistemas Fuzzy · Inteligência Artificial · UFPI · 2026.2

- **Aplicação publicada:** https://mingridxs.github.io/ia-trabalho-fuzzy/
- **Repositório:** https://github.com/mingridxs/ia-trabalho-fuzzy

## Autores

- Maria Ingrid Xavier Sousa ([mingridxs](https://github.com/mingridxs))
- Carlos Henrique Reis Portela Leal ([CarlosRPL](https://github.com/CarlosRPL))

## Descrição do modelo Mamdani

O simulador recomenda o tempo de irrigação de um jardim, de 0 a 30 minutos, a partir da umidade do solo (0% a 100%) e da temperatura do ambiente (10 °C a 40 °C). A inferência segue cinco etapas:

1. **Fuzzificação:** calcula os três graus de pertinência da umidade e os três da temperatura para os valores informados.
2. **Avaliação das regras:** o operador E é o mínimo. A ativação de cada regra é h(r) = mín(μ umidade(U), μ temperatura(T)).
3. **Implicação:** o conjunto de saída de cada regra é recortado na altura h(r): μr(z) = mín(h(r), μ consequente(z)). Regras com ativação zero não contribuem.
4. **Agregação:** para cada z, a saída agregada é o máximo entre os recortes. As áreas sobrepostas não são somadas.
5. **Defuzzificação:** centroide da saída agregada por pontos médios. Para o passo Δz, N = 30/Δz e z(k) = (k + 0,5) × Δz, com k de 0 a N − 1; z* = Σ[z(k) × μ(z(k))] / Σ[μ(z(k))]. Se o denominador for zero, o simulador informa que não há saída agregada válida.

A precisão interna é mantida e o arredondamento acontece somente na exibição. Os graus de pertinência indicam a compatibilidade do valor com cada termo linguístico; não são probabilidades e não precisam somar 1. O tempo calculado decorre das regras e dos conjuntos definidos, não de aprendizado.

### Conjuntos

Funções lineares por partes, descritas por (a, b, c, d): μ = 1 em [b, c]; μ = 0 fora de [a, d]; subida (x − a)/(b − a); descida (d − x)/(d − c). O trecho de pertinência 1 é avaliado antes das rampas, de modo que, quando a = b ou c = d, a divisão da rampa vazia nunca é calculada.

| Variável | Conjunto | (a, b, c, d) |
| --- | --- | --- |
| Umidade (%) | seco | (0, 0, 20, 50) |
| Umidade (%) | intermediário | (20, 50, 50, 80) |
| Umidade (%) | úmido | (50, 80, 100, 100) |
| Temperatura (°C) | baixa | (10, 10, 15, 25) |
| Temperatura (°C) | média | (15, 25, 25, 35) |
| Temperatura (°C) | alta | (25, 35, 40, 40) |
| Tempo de irrigação (min) | curto | (0, 0, 0, 15) |
| Tempo de irrigação (min) | médio | (0, 15, 15, 30) |
| Tempo de irrigação (min) | longo | (15, 30, 30, 30) |

### Regras padrão

| Regra | SE o solo é | E a temperatura é | ENTÃO o tempo é |
| --- | --- | --- | --- |
| R1 | seco | baixa | médio |
| R2 | seco | média | longo |
| R3 | seco | alta | longo |
| R4 | intermediário | baixa | curto |
| R5 | intermediário | média | médio |
| R6 | intermediário | alta | longo |
| R7 | úmido | baixa | curto |
| R8 | úmido | média | curto |
| R9 | úmido | alta | curto |

Os antecedentes são fixos; o consequente de cada regra pode ser trocado na interface.

### Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos, temas claro e escuro e layout responsivo |
| `fuzzy.js` | Inferência Mamdani: pertinência, fuzzificação, regras, implicação, agregação, centroide e validação das entradas |
| `app.js` | Interface: campos, controles, etapas, gráficos (em `<canvas>`) e log |
| `testes.js` | Testes da seção 6 (usados pela página e pelo terminal) |
| `rodar-testes.js` | Executa os testes no terminal com `node rodar-testes.js` |
| `favicon.svg`, `gotas.svg` | Ícone da página e fundo |

## Instruções de uso

1. Abra a aplicação publicada (ou o arquivo `index.html` em um navegador; não há instalação nem servidor).
2. Informe a **umidade do solo** (valor inicial 35%) e a **temperatura** (valor inicial 30 °C), digitando ou usando os controles deslizantes.
3. Se quiser, troque o **consequente** de qualquer regra na tabela "Base de regras" (curto, médio ou longo) e escolha o **passo Δz** (0,1; 0,05 ou 0,01 minuto; inicial 0,1).
4. Controles:
   - **Calcular:** executa toda a inferência.
   - **Avançar etapa:** executa uma etapa por vez, na ordem, mostrando os valores e os gráficos de cada uma.
   - **Restaurar padrão:** repõe entradas, regras e passo iniciais e limpa os resultados.
5. Qualquer alteração limpa os resultados anteriores e reinicia a sequência de etapas.
6. Campos vazios, valores não numéricos e valores fora dos intervalos bloqueiam o cálculo e geram uma mensagem. O valor digitado não é ajustado para o limite mais próximo.
7. Toque em uma regra (ou use o seletor "Regra") para ver o consequente original e o recorte produzido pela implicação.
8. O botão **Executar testes** roda os testes da seção 6 na própria página. O botão **Modo noturno** alterna o tema e não afeta os cálculos.

O que a tela mostra:

- **Entradas:** os três conjuntos de cada variável, o valor informado como linha vertical e todos os graus de pertinência, inclusive os iguais a zero.
- **Regras:** a base completa, as regras ativadas em destaque, os graus dos antecedentes, a operação mínimo e h(r).
- **Saída:** os conjuntos curto, médio e longo, os recortes, a região agregada preenchida, a linha do centroide e o tempo recomendado com duas casas decimais.
- **Log:** os valores de cada etapa executada.

## Bibliotecas auxiliares

Nenhuma biblioteca externa é utilizada. A inferência, os gráficos (desenhados em `<canvas>`) e a interface foram implementados no próprio projeto.

## Resultados dos testes (seção 6)

Os testes estão em `testes.js` e chamam as mesmas funções usadas pelo simulador. Salvo indicação em contrário, base de regras padrão e Δz = 0,1 minuto. Tolerâncias: 0,000001 para pertinências e ativações; 0,01 minuto para os tempos.

### 6.1 Pertinências e extremos

| Entrada | Saída obtida | Referência |
| --- | --- | --- |
| U = 35% | seco = 0,5; intermediário = 0,5; úmido = 0 | igual |
| T = 30 °C | baixa = 0; média = 0,5; alta = 0,5 | igual |
| U = 0% | (1; 0; 0) | igual |
| U = 100% | (0; 0; 1) | igual |
| T = 10 °C | (1; 0; 0) | igual |
| T = 40 °C | (0; 0; 1) | igual |

Também foi conferido que μcurto(0) = 1 e μlongo(30) = 1 e que, em 1001 pontos de cada um dos nove conjuntos, todos os graus são finitos e ficam entre 0 e 1.

**Conclusão:** valores iguais à referência, sem divisões por zero.

### 6.2 Ativação de uma única regra

| Entrada | Regras ativadas | Saída agregada | Tempo obtido | Referência |
| --- | --- | --- | --- | --- |
| U = 20%, T = 35 °C | R3 → longo, h = 1 | conjunto longo completo | 25,00 min (24,999889) | ≈ 25,00 |
| U = 50%, T = 25 °C | R5 → médio, h = 1 | conjunto médio completo | 15,00 min (15,000000) | 15,00 |
| U = 80%, T = 25 °C | R8 → curto, h = 1 | conjunto curto completo | 5,00 min (5,000111) | ≈ 5,00 |

**Conclusão:** em cada caso só uma regra é ativada e a saída agregada coincide com o conjunto do consequente. Os valores 5 e 25 são os centroides dos triângulos de saída, não os seus picos; por isso solo úmido não resulta em tempo zero neste modelo.

### 6.3 Inferência completa com sobreposição

- **Entrada:** U = 35%, T = 30 °C, base padrão, Δz = 0,1.
- **Fuzzificação:** seco = 0,5; intermediário = 0,5; úmido = 0; baixa = 0; média = 0,5; alta = 0,5.
- **Regras ativadas:** R2 → longo, h = 0,5; R3 → longo, h = 0,5; R5 → médio, h = 0,5; R6 → longo, h = 0,5. As demais têm ativação zero.
- **Agregação:** μ(0) = 0; μ(3) = 0,2; μ(7,5) = 0,5; μ(15) = 0,5; μ(30) = 0,5. Em 3001 pontos, a saída agregada é z/15 entre 0 e 7,5 e 0,5 entre 7,5 e 30. A altura máxima é 0,5: as três regras que concluem "longo" não se somam.
- **Defuzzificação:** Σ z·μ = 2.203,120833; Σ μ = 131,25; N = 300; z* = 16,785683 min; a tela exibe **16,79 min**.

**Conclusão:** todos os valores coincidem com a referência (16,785683 pelo método numérico; 16,785714 pelo centroide contínuo).

### 6.4 Simetria, alteração de regras e precisão

- **Simetria (U = 35%, T = 20 °C):** R1 → médio, R2 → longo, R4 → curto e R5 → médio, todas com h = 0,5. A agregação é constante em 0,5 de 0 a 30 e o tempo é 15,00 min.
- **Todas as nove regras com consequente curto (U = 50%, T = 25 °C):** 5,00 min (5,000111). Como só existe o conjunto curto na saída, o resultado é o centroide desse triângulo, qualquer que seja a regra ativada. Isso mostra que o tempo depende diretamente dos consequentes escolhidos.
- **Restaurar padrão:** as entradas voltam a 35% e 30 °C, as regras voltam à base padrão, o passo volta a 0,1 e os resultados são limpos. Calculando de novo, o resultado é 16,79 min. Conferido na interface.
- **Efeito do passo (teste 6.3 repetido):**

| Δz | N | z* obtido (min) | Referência | Diferença para o centroide contínuo (16,785714) | Exibido |
| --- | --- | --- | --- | --- | --- |
| 0,1 | 300 | 16,785683 | 16,785683 | 0,0000317 | 16,79 |
| 0,05 | 600 | 16,785706 | 16,785706 | 0,0000079 | 16,79 |
| 0,01 | 3000 | 16,785714 | 16,785714 | 0,0000003 | 16,79 |

**Interpretação.** O centroide numérico substitui a integral por uma soma em pontos médios, e o erro dessa aproximação diminui com o quadrado do passo: reduzir Δz pela metade (0,1 para 0,05) dividiu a diferença por cerca de 4, e reduzir dez vezes (0,1 para 0,01) dividiu por cerca de 100. O custo é o número de pontos avaliados, que cresce de 300 para 3000. Nesta configuração o erro já é da ordem de 0,00003 minuto com o passo mais grosso, muito abaixo das duas casas decimais exibidas, por isso a tela mostra 16,79 min nas três opções.

**Conclusão:** valores iguais à referência.

### 6.5 Validação da interface e determinismo

| Entrada | Resultado |
| --- | --- |
| U = −1% | bloqueado: "Umidade do solo: -1 % está fora do intervalo. Informe um valor entre 0 e 100 %." |
| U = 101% | bloqueado: "Umidade do solo: 101 % está fora do intervalo. Informe um valor entre 0 e 100 %." |
| T = 9 °C | bloqueado: "Temperatura: 9 °C está fora do intervalo. Informe um valor entre 10 e 40 °C." |
| T = 41 °C | bloqueado: "Temperatura: 41 °C está fora do intervalo. Informe um valor entre 10 e 40 °C." |
| campo vazio | bloqueado: "Umidade do solo: o campo está vazio. Informe um valor entre 0 e 100 %." |
| "abc" | bloqueado: "Temperatura: "abc" não é um número válido. Informe um valor entre 10 e 40 °C." |

Em todos os casos o cálculo não é executado, o resultado permanece vazio e o valor digitado continua no campo, sem ajuste para o limite mais próximo. Conferido na interface e na função de validação.

- **Determinismo:** repetir a mesma configuração (U = 42,5%, T = 27,3 °C, Δz = 0,05) produz graus, ativações e tempo idênticos.
- **Calcular e Avançar etapa:** o cálculo direto e o percurso etapa por etapa dão 15,443545 min nessa configuração, e 16,79 min na configuração padrão. O botão Calcular percorre as mesmas cinco etapas do botão Avançar etapa.
- **Apresentação:** o tema e os gráficos apenas leem os resultados; não participam dos cálculos.
- **Denominador zero:** forçando graus nulos diretamente na função, a defuzzificação sinaliza "sem saída agregada válida" em vez de devolver zero ou um número indefinido.

**Conclusão:** a interface bloqueia as entradas inválidas e o sistema é determinístico.

### Como reproduzir

- Na página: botão **Executar testes**.
- No terminal: `node rodar-testes.js` (requer Node.js; termina com código 0 se todos os testes passarem).
