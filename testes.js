/*
 * Testes de validação da seção 6 do enunciado.
 * Usados pela página (botão "Executar testes") e pelo Node (node rodar-testes.js).
 * Tolerâncias: 0,000001 para pertinências e ativações; 0,01 min para tempos.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TestesFuzzy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function executar(F) {
    const { fmt, fmtTempo, fmt6 } = F;
    const TOL_MU = 1e-6;
    const TOL_T = 0.01;
    const perto = (a, b, tol) => Math.abs(a - b) <= tol;
    const vetorPerto = (v, e) => v.length === e.length && v.every((x, i) => perto(x, e[i], TOL_MU));
    const tupla = (v) => '(' + v.map((x) => fmt(x)).join('; ') + ')';
    const nomeTempo = (c) => F.VARIAVEIS.tempo.termos[c].nome;
    const resultados = [];

    function teste(titulo, corpo) {
      const linhas = [];
      let ok = true;
      const conferir = (cond, texto) => {
        if (!cond) ok = false;
        linhas.push(`${cond ? '[ok]' : '[FALHOU]'} ${texto}`);
      };
      const nota = (texto) => linhas.push(texto);
      corpo(conferir, nota);
      resultados.push({ titulo, ok, linhas });
    }

    const ativas = (r) => r.regras.filter((x) => x.h > 0);
    const descrAtivas = (r) =>
      ativas(r).map((x) => `${x.id} → ${nomeTempo(x.c)}, h = ${fmt(x.h)}`).join('; ') || 'nenhuma';

    /* 6.1 */
    teste('6.1 Pertinências e extremos', (conferir, nota) => {
      const g = F.fuzzificar(35, 30);
      nota(`U = 35%: (seco; intermediário; úmido) = ${tupla(g.umidade)}`);
      nota(`T = 30 °C: (baixa; média; alta) = ${tupla(g.temperatura)}`);
      conferir(vetorPerto(g.umidade, [0.5, 0.5, 0]), 'U = 35%: seco = 0,5; intermediário = 0,5; úmido = 0');
      conferir(vetorPerto(g.temperatura, [0, 0.5, 0.5]), 'T = 30 °C: baixa = 0; média = 0,5; alta = 0,5');
      const casos = [
        ['U = 0%', F.fuzzificar(0, 25).umidade, [1, 0, 0]],
        ['U = 100%', F.fuzzificar(100, 25).umidade, [0, 0, 1]],
        ['T = 10 °C', F.fuzzificar(50, 10).temperatura, [1, 0, 0]],
        ['T = 40 °C', F.fuzzificar(50, 40).temperatura, [0, 0, 1]],
      ];
      casos.forEach(([rot, v, e]) => {
        nota(`${rot}: ${tupla(v)}`);
        conferir(vetorPerto(v, e), `${rot} gera ${tupla(e)}`);
      });
      const t = F.VARIAVEIS.tempo.termos;
      conferir(F.pertinencia(0, t[0].p) === 1 && F.pertinencia(30, t[2].p) === 1, 'μcurto(0) = 1 e μlongo(30) = 1');
      let finitos = true;
      Object.values(F.VARIAVEIS).forEach((v) => {
        for (let i = 0; i <= 1000; i++) {
          const x = v.min + ((v.max - v.min) * i) / 1000;
          v.termos.forEach((termo) => {
            const mu = F.pertinencia(x, termo.p);
            if (!Number.isFinite(mu) || mu < 0 || mu > 1) finitos = false;
          });
        }
      });
      conferir(finitos, 'nenhuma divisão por zero: todos os graus são finitos e ficam entre 0 e 1 (9 conjuntos, 1001 pontos cada)');
    });

    /* 6.2 */
    teste('6.2 Ativação de uma única regra', (conferir, nota) => {
      [
        [20, 35, 'R3', 2, 25],
        [50, 25, 'R5', 1, 15],
        [80, 25, 'R8', 0, 5],
      ].forEach(([U, T, id, c, esperado]) => {
        const r = F.inferir(U, T);
        const a = ativas(r);
        nota(`U = ${U}%, T = ${T} °C → regras ativadas: ${descrAtivas(r)}; tempo = ${fmtTempo(r.saida.z)} min (${fmt6(r.saida.z)})`);
        conferir(a.length === 1 && a[0].id === id && perto(a[0].h, 1, TOL_MU), `somente ${id} tem ativação 1`);
        let igual = true;
        for (let i = 0; i <= 300; i++) {
          const z = i / 10;
          if (!perto(F.agregada(r.regras, z), F.pertinencia(z, F.VARIAVEIS.tempo.termos[c].p), TOL_MU)) igual = false;
        }
        conferir(igual, `a saída agregada é o conjunto ${nomeTempo(c)} completo`);
        conferir(perto(r.saida.z, esperado, TOL_T), `tempo ≈ ${fmtTempo(esperado)} min`);
      });
    });

    /* 6.3 */
    teste('6.3 Inferência completa com sobreposição', (conferir, nota) => {
      const r = F.inferir(35, 30, F.consequentesPadrao(), 0.1);
      nota(`Entrada: U = 35%, T = 30 °C, base padrão, Δz = 0,1`);
      nota(`Fuzzificação: umidade ${tupla(r.graus.umidade)}; temperatura ${tupla(r.graus.temperatura)}`);
      nota(`Regras ativadas: ${descrAtivas(r)}`);
      const esperadas = { R2: 2, R3: 2, R5: 1, R6: 2 };
      conferir(
        r.regras.every((x) => (esperadas[x.id] !== undefined ? perto(x.h, 0.5, TOL_MU) && x.c === esperadas[x.id] : x.h === 0)),
        'R2, R3 e R6 → longo e R5 → médio, todas com h = 0,5; as demais com ativação zero'
      );
      const pontos = [[0, 0], [3, 0.2], [7.5, 0.5], [15, 0.5], [30, 0.5]];
      nota('Agregada: ' + pontos.map(([z]) => `μ(${fmt(z)}) = ${fmt(F.agregada(r.regras, z))}`).join('; '));
      conferir(pontos.every(([z, e]) => perto(F.agregada(r.regras, z), e, TOL_MU)), 'μ(0) = 0; μ(3) = 0,2; μ(7,5) = 0,5; μ(15) = 0,5; μ(30) = 0,5');
      let forma = true;
      let maximo = 0;
      for (let i = 0; i <= 3000; i++) {
        const z = i / 100;
        const mu = F.agregada(r.regras, z);
        if (mu > maximo) maximo = mu;
        if (!perto(mu, z <= 7.5 ? z / 15 : 0.5, TOL_MU)) forma = false;
      }
      conferir(forma, 'μagregada(z) = z/15 entre 0 e 7,5 e 0,5 entre 7,5 e 30');
      conferir(perto(maximo, 0.5, TOL_MU), 'três regras concluindo longo não elevam a altura acima de 0,5 (máximo, e não soma)');
      nota(`Centroide numérico: Σ z·μ = ${fmt6(r.saida.numerador)}; Σ μ = ${fmt6(r.saida.denominador)}; N = ${r.saida.N}; z* = ${fmt6(r.saida.z)} min → exibido como ${fmtTempo(r.saida.z)} min`);
      conferir(perto(r.saida.z, 16.785683, 1e-6), 'z* ≈ 16,785683 min com Δz = 0,1');
      conferir(fmtTempo(r.saida.z) === '16,79', 'a tela exibe 16,79 min');
    });

    /* 6.4 */
    teste('6.4 Simetria, alteração de regras e precisão', (conferir, nota) => {
      const s = F.inferir(35, 20);
      nota(`U = 35%, T = 20 °C → regras ativadas: ${descrAtivas(s)}; tempo = ${fmtTempo(s.saida.z)} min (${fmt6(s.saida.z)})`);
      conferir(
        s.regras.every((x) => (['R1', 'R2', 'R4', 'R5'].includes(x.id) ? perto(x.h, 0.5, TOL_MU) : x.h === 0)),
        'R1, R2, R4 e R5 com ativação 0,5; as demais com zero'
      );
      let constante = true;
      for (let i = 0; i <= 300; i++) if (!perto(F.agregada(s.regras, i / 10), 0.5, TOL_MU)) constante = false;
      conferir(constante, 'agregação constante em 0,5 de 0 a 30');
      conferir(perto(s.saida.z, 15, TOL_T), 'tempo = 15,00 min');

      const todasCurto = F.inferir(50, 25, F.REGRAS.map(() => 0), 0.1);
      nota(`Todas as nove regras → curto; U = 50%, T = 25 °C → tempo = ${fmtTempo(todasCurto.saida.z)} min (${fmt6(todasCurto.saida.z)})`);
      conferir(perto(todasCurto.saida.z, 5, TOL_T), 'tempo ≈ 5,00 min');
      const padrao = F.inferir(F.VARIAVEIS.umidade.inicial, F.VARIAVEIS.temperatura.inicial, F.consequentesPadrao(), F.PASSO_PADRAO);
      nota(`Base, entradas e passo padrão restaurados (U = 35%, T = 30 °C, Δz = 0,1) → ${fmtTempo(padrao.saida.z)} min`);
      conferir(fmtTempo(padrao.saida.z) === '16,79', 'após restaurar o padrão, o resultado volta a 16,79 min');

      const continuo = 235 / 14; // centroide contínuo exato = 16,785714...
      nota(`Centroide contínuo de referência: ${fmt6(continuo)} min`);
      const esperados = { 0.1: 16.785683, 0.05: 16.785706, 0.01: 16.785714 };
      F.PASSOS.forEach((dz) => {
        const r = F.inferir(35, 30, F.consequentesPadrao(), dz);
        nota(`Δz = ${fmt(dz)} (N = ${r.saida.N}): z* = ${fmt6(r.saida.z)} min; diferença para o contínuo = ${Math.abs(r.saida.z - continuo).toExponential(2)} min; exibido ${fmtTempo(r.saida.z)} min`);
        conferir(perto(r.saida.z, esperados[dz], 1e-6), `Δz = ${fmt(dz)} → ≈ ${fmt6(esperados[dz])} min`);
      });
    });

    /* 6.5 */
    teste('6.5 Validação e determinismo', (conferir, nota) => {
      const invalidos = [
        ['umidade', '-1'], ['umidade', '101'], ['temperatura', '9'], ['temperatura', '41'],
        ['umidade', ''], ['temperatura', '   '], ['umidade', 'abc'], ['temperatura', '3o'],
        ['umidade', 'NaN'], ['temperatura', 'Infinity'],
      ];
      invalidos.forEach(([v, texto]) => {
        const r = F.lerNumero(texto, v);
        nota(`${v} = "${texto}" → ${r.ok ? 'ACEITO' : 'bloqueado: ' + r.erro}`);
      });
      conferir(invalidos.every(([v, t]) => !F.lerNumero(t, v).ok),
        'U = −1, U = 101, T = 9, T = 41, campos vazios e valores não numéricos impedem o cálculo, sem ajuste para o limite');
      conferir(['0', '100', '35', '35,5'].every((t) => F.lerNumero(t, 'umidade').ok) && ['10', '40', '22.5'].every((t) => F.lerNumero(t, 'temperatura').ok),
        'valores nos limites e decimais válidos são aceitos');

      const a = F.inferir(42.5, 27.3, F.consequentesPadrao(), 0.05);
      const b = F.inferir(42.5, 27.3, F.consequentesPadrao(), 0.05);
      conferir(JSON.stringify(a) === JSON.stringify(b), 'repetir a mesma configuração reproduz graus, ativações e tempo final idênticos');
      // Percorrer as etapas uma a uma dá o mesmo resultado do cálculo direto.
      const graus = F.fuzzificar(42.5, 27.3);
      const regras = F.avaliarRegras(graus, F.consequentesPadrao());
      const saida = F.defuzzificar(regras, 0.05);
      nota(`U = 42,5%, T = 27,3 °C, Δz = 0,05: cálculo direto = ${fmt6(a.saida.z)} min; etapa por etapa = ${fmt6(saida.z)} min`);
      conferir(saida.z === a.saida.z && JSON.stringify(regras) === JSON.stringify(a.regras), 'calcular diretamente ou percorrer as etapas produz a mesma saída');
      const vazio = F.defuzzificar(F.avaliarRegras({ umidade: [0, 0, 0], temperatura: [0, 0, 0] }, F.consequentesPadrao()), 0.1);
      conferir(vazio.valido === false && vazio.z === null, 'denominador zero é sinalizado como "sem saída agregada válida" (não devolve zero nem NaN)');
    });

    return resultados;
  }

  function comoTexto(resultados) {
    return resultados
      .map((r) => `${r.titulo} — ${r.ok ? 'APROVADO' : 'REPROVADO'}\n${r.linhas.join('\n')}`)
      .join('\n\n');
  }

  return { executar, comoTexto };
});
