/*
 * Sistema de inferência fuzzy Mamdani (sem dependências externas).
 * Funciona no navegador (window.Fuzzy) e no Node (require), para que os
 * testes exercitem exatamente as funções usadas pela interface.
 *
 * Etapas: fuzzificação -> avaliação das regras (mínimo) -> implicação
 * (recorte pelo mínimo) -> agregação (máximo) -> defuzzificação (centroide
 * numérico por pontos médios).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fuzzy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Conjuntos fixos: (a, b, c, d), lineares por partes ---------- */
  const VARIAVEIS = {
    umidade: {
      nome: 'Umidade do solo', simbolo: 'U', unidade: '%', min: 0, max: 100, inicial: 35,
      termos: [
        { nome: 'seco', p: [0, 0, 20, 50] },
        { nome: 'intermediário', p: [20, 50, 50, 80] },
        { nome: 'úmido', p: [50, 80, 100, 100] },
      ],
    },
    temperatura: {
      nome: 'Temperatura', simbolo: 'T', unidade: '°C', min: 10, max: 40, inicial: 30,
      termos: [
        { nome: 'baixa', p: [10, 10, 15, 25] },
        { nome: 'média', p: [15, 25, 25, 35] },
        { nome: 'alta', p: [25, 35, 40, 40] },
      ],
    },
    tempo: {
      nome: 'Tempo de irrigação', simbolo: 'z', unidade: 'min', min: 0, max: 30,
      termos: [
        { nome: 'curto', p: [0, 0, 0, 15] },
        { nome: 'médio', p: [0, 15, 15, 30] },
        { nome: 'longo', p: [15, 30, 30, 30] },
      ],
    },
  };

  /* ---------- Base de regras: SE umidade[u] E temperatura[t] ENTÃO tempo[c] ---------- */
  const REGRAS = [
    { id: 'R1', u: 0, t: 0, c: 1 },
    { id: 'R2', u: 0, t: 1, c: 2 },
    { id: 'R3', u: 0, t: 2, c: 2 },
    { id: 'R4', u: 1, t: 0, c: 0 },
    { id: 'R5', u: 1, t: 1, c: 1 },
    { id: 'R6', u: 1, t: 2, c: 2 },
    { id: 'R7', u: 2, t: 0, c: 0 },
    { id: 'R8', u: 2, t: 1, c: 0 },
    { id: 'R9', u: 2, t: 2, c: 0 },
  ];
  const consequentesPadrao = () => REGRAS.map((r) => r.c);
  const PASSOS = [0.1, 0.05, 0.01];
  const PASSO_PADRAO = 0.1;

  /* ---------- Função de pertinência ----------
   * O trecho de pertinência 1 é avaliado antes das rampas. Assim, quando
   * a = b ou c = d, a divisão da rampa vazia nunca é calculada.
   */
  function pertinencia(x, p) {
    const a = p[0], b = p[1], c = p[2], d = p[3];
    if (x >= b && x <= c) return 1;
    if (x <= a || x >= d) return 0;
    if (x < b) return (x - a) / (b - a); // subida: a < x < b
    return (d - x) / (d - c); // descida: c < x < d
  }

  /* ---------- 1. Fuzzificação ---------- */
  function fuzzificar(U, T) {
    return {
      umidade: VARIAVEIS.umidade.termos.map((t) => pertinencia(U, t.p)),
      temperatura: VARIAVEIS.temperatura.termos.map((t) => pertinencia(T, t.p)),
    };
  }

  /* ---------- 2. Avaliação das regras: E = mínimo ---------- */
  function avaliarRegras(graus, consequentes) {
    return REGRAS.map((r, i) => {
      const muU = graus.umidade[r.u];
      const muT = graus.temperatura[r.t];
      return { id: r.id, u: r.u, t: r.t, c: consequentes[i], muU, muT, h: Math.min(muU, muT) };
    });
  }

  /* ---------- 3. Implicação: recorte do consequente na altura h ---------- */
  function recorte(regra, z) {
    return Math.min(regra.h, pertinencia(z, VARIAVEIS.tempo.termos[regra.c].p));
  }

  /* ---------- 4. Agregação: máximo entre os recortes ---------- */
  function agregada(regras, z) {
    let m = 0;
    for (const r of regras) {
      if (r.h === 0) continue; // ativação zero não contribui
      const v = recorte(r, z);
      if (v > m) m = v;
    }
    return m;
  }

  /* ---------- 5. Defuzzificação: centroide por pontos médios ----------
   * N = 30/Δz; z(k) = (k + 0,5)·Δz; z* = Σ z(k)·μ(z(k)) / Σ μ(z(k)).
   * Se o denominador for zero, não há saída agregada válida.
   */
  function defuzzificar(regras, dz) {
    const N = Math.round((VARIAVEIS.tempo.max - VARIAVEIS.tempo.min) / dz);
    let numerador = 0;
    let denominador = 0;
    for (let k = 0; k < N; k++) {
      const z = (k + 0.5) * dz;
      const mu = agregada(regras, z);
      numerador += z * mu;
      denominador += mu;
    }
    if (denominador === 0) return { valido: false, z: null, numerador, denominador, N, dz };
    return { valido: true, z: numerador / denominador, numerador, denominador, N, dz };
  }

  /* ---------- Inferência completa ---------- */
  function inferir(U, T, consequentes, dz) {
    const graus = fuzzificar(U, T);
    const regras = avaliarRegras(graus, consequentes || consequentesPadrao());
    const saida = defuzzificar(regras, dz || PASSO_PADRAO);
    return { U, T, graus, regras, saida };
  }

  /* ---------- Validação de entrada ----------
   * Não corrige o valor para o limite mais próximo: fora do intervalo é erro.
   */
  function lerNumero(texto, variavel) {
    const v = VARIAVEIS[variavel];
    const s = String(texto == null ? '' : texto).trim();
    const faixa = `entre ${v.min} e ${v.max} ${v.unidade}`;
    if (s === '') return { ok: false, erro: `${v.nome}: o campo está vazio. Informe um valor ${faixa}.` };
    if (!/^[+-]?\d+([.,]\d+)?$/.test(s)) {
      return { ok: false, erro: `${v.nome}: "${s}" não é um número válido. Informe um valor ${faixa}.` };
    }
    const x = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(x)) return { ok: false, erro: `${v.nome}: o valor deve ser finito, ${faixa}.` };
    if (x < v.min || x > v.max) {
      return { ok: false, erro: `${v.nome}: ${s} ${v.unidade} está fora do intervalo. Informe um valor ${faixa}.` };
    }
    return { ok: true, valor: x };
  }

  /* ---------- Formatação (arredonda só na exibição) ---------- */
  const fmt = (x, casas) =>
    x.toLocaleString('pt-BR', { maximumFractionDigits: casas === undefined ? 6 : casas });
  const fmtTempo = (x) =>
    x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt6 = (x) =>
    x.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

  return {
    VARIAVEIS, REGRAS, PASSOS, PASSO_PADRAO, consequentesPadrao,
    pertinencia, fuzzificar, avaliarRegras, recorte, agregada, defuzzificar, inferir,
    lerNumero, fmt, fmtTempo, fmt6,
  };
});
