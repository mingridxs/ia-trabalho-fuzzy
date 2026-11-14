/* Interface do simulador fuzzy: campos, validação, controles, gráficos e log.
   Toda a inferência está em fuzzy.js; aqui nada é recalculado por conta própria. */
(function () {
  'use strict';

  const F = Fuzzy;
  const { fmt, fmtTempo, fmt6, VARIAVEIS, REGRAS } = F;
  const $ = (id) => document.getElementById(id);
  const NOMES_ETAPAS = ['Fuzzificação', 'Avaliação das regras', 'Implicação', 'Agregação', 'Defuzzificação'];
  const CORES = ['--c1', '--c2', '--c3'];

  let etapa = 0; // 0 = nada calculado; 1..5 = etapas concluídas
  let r = null; // resultados parciais da inferência em andamento
  let regraSel = 0;
  let houveAlteracao = false;

  /* ================= Leitura e validação ================= */
  function lerConfig() {
    const erros = [];
    const U = F.lerNumero($('umidade').value, 'umidade');
    const T = F.lerNumero($('temperatura').value, 'temperatura');
    $('umidade').classList.toggle('invalido', !U.ok);
    $('temperatura').classList.toggle('invalido', !T.ok);
    if (!U.ok) erros.push(U.erro);
    if (!T.ok) erros.push(T.erro);

    const consequentes = [];
    document.querySelectorAll('#tabRegras tbody select').forEach((sel, i) => {
      const c = Number(sel.value);
      if (sel.value === '' || ![0, 1, 2].includes(c)) erros.push(`${REGRAS[i].id}: escolha o consequente (curto, médio ou longo).`);
      consequentes.push(c);
    });

    const dz = Number($('passo').value);
    if (!F.PASSOS.includes(dz)) erros.push('Passo de defuzzificação: escolha 0,1; 0,05 ou 0,01 minuto.');

    return { erros, U: U.valor, T: T.valor, consequentes, dz };
  }

  function mostrarErros(erros) {
    const ul = $('erros');
    ul.innerHTML = '';
    erros.forEach((e) => {
      const li = document.createElement('li');
      li.textContent = e;
      ul.appendChild(li);
    });
  }

  /* ================= Controles ================= */
  // Qualquer alteração limpa os resultados e reinicia a sequência de etapas.
  function invalidar() {
    houveAlteracao = etapa > 0 || houveAlteracao;
    etapa = 0;
    r = null;
    mostrarErros(lerConfig().erros);
    renderizar();
  }

  // Executa exatamente a próxima etapa. Devolve false se as entradas forem inválidas.
  function avancar() {
    if (etapa >= 5) return false;
    if (etapa === 0) {
      const cfg = lerConfig();
      mostrarErros(cfg.erros);
      if (cfg.erros.length) {
        renderizar();
        return false;
      }
      r = { U: cfg.U, T: cfg.T, consequentes: cfg.consequentes, dz: cfg.dz };
      houveAlteracao = false;
    }
    etapa += 1;
    if (etapa === 1) r.graus = F.fuzzificar(r.U, r.T);
    if (etapa === 2) {
      r.regras = F.avaliarRegras(r.graus, r.consequentes);
      if (r.regras[regraSel].h === 0) {
        const primeira = r.regras.findIndex((x) => x.h > 0);
        if (primeira >= 0) regraSel = primeira;
      }
    }
    // Etapas 3 e 4 usam F.recorte e F.agregada sobre r.regras (não guardam estado).
    if (etapa === 5) r.saida = F.defuzzificar(r.regras, r.dz);
    renderizar();
    return true;
  }

  // Calcular percorre as mesmas cinco etapas, em ordem, de uma vez.
  function calcular() {
    etapa = 0;
    r = null;
    while (etapa < 5) if (!avancar()) break;
  }

  function restaurar() {
    $('umidade').value = String(VARIAVEIS.umidade.inicial);
    $('temperatura').value = String(VARIAVEIS.temperatura.inicial);
    $('umidadeDesl').value = VARIAVEIS.umidade.inicial;
    $('temperaturaDesl').value = VARIAVEIS.temperatura.inicial;
    $('passo').value = String(F.PASSO_PADRAO);
    const padrao = F.consequentesPadrao();
    document.querySelectorAll('#tabRegras tbody select').forEach((sel, i) => (sel.value = String(padrao[i])));
    regraSel = 0;
    etapa = 0;
    r = null;
    houveAlteracao = false;
    mostrarErros(lerConfig().erros);
    renderizar();
    $('status').textContent = 'Padrão restaurado: entradas, regras e passo iniciais. Resultados limpos.';
  }

  /* ================= Gráficos (canvas) ================= */
  function cores() {
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    return { texto: v('--texto'), suave: v('--suave'), grade: v('--grade'), c: CORES.map(v), agg: v('--agg'), cen: v('--mut') };
  }

  /* cfg: { variavel, altura, termos:[{indice, tracejado, esmaecido}], areas:[{fn, cor, alfa, contorno}],
           niveis:[{y, cor, rotulo}], marcas:[{x, cor, rotulo}] } */
  function desenhar(canvas, cfg) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    const cor = cores();
    const v = VARIAVEIS[cfg.variavel];
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 520;
    const H = cfg.altura || 250;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const m = { e: 50, d: 14, t: 26, b: 44 };
    const X = (x) => m.e + ((x - v.min) / (v.max - v.min)) * (W - m.e - m.d);
    const Y = (mu) => H - m.b - mu * (H - m.t - m.b);

    // Grade e eixos
    ctx.font = '11px system-ui, sans-serif';
    ctx.lineWidth = 1;
    ctx.strokeStyle = cor.grade;
    ctx.fillStyle = cor.suave;
    ctx.textAlign = 'right';
    [0, 0.25, 0.5, 0.75, 1].forEach((mu) => {
      ctx.beginPath();
      ctx.moveTo(m.e, Y(mu));
      ctx.lineTo(W - m.d, Y(mu));
      ctx.stroke();
      ctx.fillText(fmt(mu, 2), m.e - 6, Y(mu) + 4);
    });
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const x = v.min + ((v.max - v.min) * i) / 6;
      ctx.fillText(fmt(x, 1), X(x), H - m.b + 15);
    }
    ctx.fillStyle = cor.texto;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${v.nome} (${v.unidade})`, (m.e + W - m.d) / 2, H - 8);
    ctx.save();
    ctx.translate(13, (m.t + H - m.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Grau de pertinência', 0, 0);
    ctx.restore();

    // Áreas preenchidas (recortes e região agregada), amostradas só para o desenho
    (cfg.areas || []).forEach((a) => {
      const n = 600;
      ctx.beginPath();
      ctx.moveTo(X(v.min), Y(0));
      for (let i = 0; i <= n; i++) {
        const x = v.min + ((v.max - v.min) * i) / n;
        ctx.lineTo(X(x), Y(a.fn(x)));
      }
      ctx.lineTo(X(v.max), Y(0));
      ctx.closePath();
      ctx.globalAlpha = a.alfa;
      ctx.fillStyle = a.cor;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (a.contorno) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const x = v.min + ((v.max - v.min) * i) / n;
          if (i) ctx.lineTo(X(x), Y(a.fn(x)));
          else ctx.moveTo(X(x), Y(a.fn(x)));
        }
        ctx.strokeStyle = a.cor;
        ctx.lineWidth = a.contorno;
        ctx.stroke();
      }
    });

    // Conjuntos (a, b, c, d)
    (cfg.termos || []).forEach((t) => {
      const termo = v.termos[t.indice];
      const p = termo.p;
      ctx.beginPath();
      ctx.moveTo(X(p[0]), Y(0));
      ctx.lineTo(X(p[1]), Y(1));
      ctx.lineTo(X(p[2]), Y(1));
      ctx.lineTo(X(p[3]), Y(0));
      ctx.strokeStyle = cor.c[t.indice];
      ctx.lineWidth = 2;
      ctx.globalAlpha = t.esmaecido ? 0.45 : 1;
      ctx.setLineDash(t.tracejado ? [6, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      const centro = (p[1] + p[2]) / 2;
      const margem = (v.max - v.min) * 0.08;
      ctx.textAlign = centro - v.min < margem ? 'left' : v.max - centro < margem ? 'right' : 'center';
      ctx.fillStyle = cor.c[t.indice];
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(termo.nome, X(centro), Y(1) - 8);
      ctx.globalAlpha = 1;
    });

    // Níveis horizontais (altura do recorte)
    (cfg.niveis || []).forEach((n) => {
      ctx.strokeStyle = n.cor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(m.e, Y(n.y));
      ctx.lineTo(W - m.d, Y(n.y));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = n.cor;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(n.rotulo, W - m.d - 4, Y(n.y) - 5);
    });

    // Marcas verticais (valor informado, centroide)
    (cfg.marcas || []).forEach((k) => {
      ctx.strokeStyle = k.cor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(k.x), Y(0));
      ctx.lineTo(X(k.x), Y(1.04));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 12px system-ui, sans-serif';
      const direita = X(k.x) > (m.e + W - m.d) / 2;
      ctx.textAlign = direita ? 'right' : 'left';
      const tx = X(k.x) + (direita ? -6 : 6);
      const largura = ctx.measureText(k.rotulo).width;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--cartao').trim();
      ctx.globalAlpha = 0.85;
      ctx.fillRect(direita ? tx - largura - 3 : tx - 3, Y(0) - 22, largura + 6, 17);
      ctx.globalAlpha = 1;
      ctx.fillStyle = k.cor;
      ctx.fillText(k.rotulo, tx, Y(0) - 9);
    });
  }

  function renderGraficos() {
    const cor = cores();
    const tres = [0, 1, 2].map((i) => ({ indice: i }));

    desenhar($('grafUmidade'), {
      variavel: 'umidade', termos: tres,
      marcas: etapa >= 1 ? [{ x: r.U, cor: cor.cen, rotulo: `U = ${fmt(r.U)} %` }] : [],
    });
    desenhar($('grafTemperatura'), {
      variavel: 'temperatura', termos: tres,
      marcas: etapa >= 1 ? [{ x: r.T, cor: cor.cen, rotulo: `T = ${fmt(r.T)} °C` }] : [],
    });

    // Regra selecionada: consequente original (tracejado) e recorte (preenchido)
    const cSel = etapa >= 2 ? r.regras[regraSel].c : consequenteDaTela(regraSel);
    const regra = etapa >= 3 ? r.regras[regraSel] : null;
    desenhar($('grafRegra'), {
      variavel: 'tempo',
      termos: [{ indice: cSel, tracejado: true }],
      areas: regra && regra.h > 0 ? [{ fn: (z) => F.recorte(regra, z), cor: cor.c[cSel], alfa: 0.4, contorno: 2.5 }] : [],
      niveis: regra ? [{ y: regra.h, cor: cor.texto, rotulo: `h = ${fmt(regra.h)}` }] : [],
    });

    // Saída: recortes (etapa 3), região agregada (etapa 4) e centroide (etapa 5)
    const areas = [];
    if (etapa >= 3) {
      r.regras.filter((x) => x.h > 0).forEach((x) => {
        areas.push({ fn: (z) => F.recorte(x, z), cor: cor.c[x.c], alfa: etapa >= 4 ? 0.1 : 0.25, contorno: etapa >= 4 ? 0 : 1.5 });
      });
    }
    if (etapa >= 4) areas.push({ fn: (z) => F.agregada(r.regras, z), cor: cor.agg, alfa: 0.4, contorno: 3 });
    desenhar($('grafSaida'), {
      variavel: 'tempo', altura: 280,
      termos: tres.map((t) => ({ indice: t.indice, esmaecido: etapa >= 4 })),
      areas,
      marcas: etapa >= 5 && r.saida.valido ? [{ x: r.saida.z, cor: cor.cen, rotulo: `centroide z* = ${fmtTempo(r.saida.z)} min` }] : [],
    });
  }

  /* ================= Tabelas, textos e log ================= */
  function consequenteDaTela(i) {
    const sel = document.querySelectorAll('#tabRegras tbody select')[i];
    return sel ? Number(sel.value) : REGRAS[i].c;
  }

  function montarTabelas() {
    // Graus de pertinência
    [['grausUmidade', 'umidade'], ['grausTemperatura', 'temperatura']].forEach(([id, variavel]) => {
      const tbody = $(id).querySelector('tbody');
      VARIAVEIS[variavel].termos.forEach((t, i) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        const cor = document.createElement('i');
        cor.className = `cor c${i + 1}`;
        td1.append(cor, document.createTextNode(t.nome + ` (${t.p.join('; ')})`));
        const td2 = document.createElement('td');
        td2.textContent = '—';
        tr.append(td1, td2);
        tbody.appendChild(tr);
      });
    });

    // Base de regras, com um seletor de consequente por regra
    const tbody = $('tabRegras').querySelector('tbody');
    const selRegra = $('regraSel');
    REGRAS.forEach((regra, i) => {
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      tdId.textContent = regra.id;
      tdId.style.fontWeight = '700';
      const tdSe = document.createElement('td');
      tdSe.textContent = `${VARIAVEIS.umidade.termos[regra.u].nome} E ${VARIAVEIS.temperatura.termos[regra.t].nome}`;
      const tdEntao = document.createElement('td');
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `Consequente da regra ${regra.id}`);
      VARIAVEIS.tempo.termos.forEach((t, c) => {
        const o = document.createElement('option');
        o.value = String(c);
        o.textContent = t.nome;
        sel.appendChild(o);
      });
      sel.value = String(regra.c);
      sel.addEventListener('change', invalidar);
      sel.addEventListener('click', (e) => e.stopPropagation());
      tdEntao.appendChild(sel);
      const tdH = document.createElement('td');
      tdH.className = 'h';
      tdH.textContent = '—';
      tr.append(tdId, tdSe, tdEntao, tdH);
      tr.addEventListener('click', () => {
        regraSel = i;
        renderizar();
      });
      tbody.appendChild(tr);

      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = regra.id;
      selRegra.appendChild(o);
    });
    selRegra.addEventListener('change', () => {
      regraSel = Number(selRegra.value);
      renderizar();
    });
  }

  function textoRegra(x) {
    const u = VARIAVEIS.umidade.termos[x.u].nome;
    const t = VARIAVEIS.temperatura.termos[x.t].nome;
    return `${x.id}: mín(μ${u} = ${fmt(x.muU)}; μ${t} = ${fmt(x.muT)}) = ${fmt(x.h)}`;
  }

  function montarLog() {
    const L = [];
    const nomeT = (c) => VARIAVEIS.tempo.termos[c].nome;
    if (etapa >= 1) {
      L.push('ETAPA 1 — Fuzzificação');
      L.push(`U = ${fmt(r.U)} %: ` + VARIAVEIS.umidade.termos.map((t, i) => `${t.nome} = ${fmt(r.graus.umidade[i])}`).join('; '));
      L.push(`T = ${fmt(r.T)} °C: ` + VARIAVEIS.temperatura.termos.map((t, i) => `${t.nome} = ${fmt(r.graus.temperatura[i])}`).join('; '));
    }
    if (etapa >= 2) {
      L.push('', 'ETAPA 2 — Avaliação das regras (E = mínimo)');
      r.regras.forEach((x) => L.push(`${textoRegra(x)}${x.h > 0 ? ' → ativada' : ' → não contribui'}`));
    }
    const ativas = etapa >= 2 ? r.regras.filter((x) => x.h > 0) : [];
    if (etapa >= 3) {
      L.push('', 'ETAPA 3 — Implicação (recorte do consequente em h)');
      if (!ativas.length) L.push('Nenhuma regra ativada.');
      ativas.forEach((x) => L.push(`${x.id}: consequente ${nomeT(x.c)} recortado em ${fmt(x.h)}: μ(z) = mín(${fmt(x.h)}; μ${nomeT(x.c)}(z))`));
    }
    if (etapa >= 4) {
      L.push('', 'ETAPA 4 — Agregação (máximo entre os recortes, sem somar)');
      const alturas = {};
      ativas.forEach((x) => (alturas[x.c] = Math.max(alturas[x.c] || 0, x.h)));
      L.push('Máximo entre: ' + (Object.keys(alturas).map((c) => `${nomeT(c)} recortado em ${fmt(alturas[c])}`).join('; ') || 'nenhum recorte'));
      L.push('Amostras: ' + [0, 3, 7.5, 15, 22.5, 30].map((z) => `μ(${fmt(z)}) = ${fmt(F.agregada(r.regras, z))}`).join('; '));
    }
    if (etapa >= 5) {
      const s = r.saida;
      L.push('', `ETAPA 5 — Defuzzificação (centroide por pontos médios, Δz = ${fmt(s.dz)}, N = ${s.N})`);
      L.push(`Σ z(k)·μ(z(k)) = ${fmt6(s.numerador)}; Σ μ(z(k)) = ${fmt6(s.denominador)}`);
      L.push(s.valido
        ? `z* = ${fmt6(s.z)} min → tempo recomendado: ${fmtTempo(s.z)} min`
        : 'Denominador igual a zero: não há saída agregada válida.');
    }
    return L.join('\n');
  }

  function renderizar() {
    // Etapas
    document.querySelectorAll('#etapas li').forEach((li, i) => {
      li.classList.toggle('feita', i < etapa);
      li.classList.toggle('atual', i === etapa - 1);
    });

    // Status e botões
    const st = $('status');
    st.className = 'status';
    const invalido = lerConfig().erros.length > 0;
    if (invalido) {
      st.textContent = 'Há entradas inválidas: o cálculo está bloqueado até que sejam corrigidas.';
      st.classList.add('aviso');
    } else if (etapa === 0) {
      st.textContent = houveAlteracao
        ? 'Configuração alterada: os resultados anteriores foram limpos. Clique em Calcular ou Avançar etapa.'
        : 'Clique em Calcular para toda a inferência ou em Avançar etapa para acompanhar passo a passo.';
      if (houveAlteracao) st.classList.add('aviso');
    } else if (etapa < 5) {
      st.textContent = `Etapa ${etapa} de 5 concluída: ${NOMES_ETAPAS[etapa - 1]}. Próxima: ${NOMES_ETAPAS[etapa]}.`;
    } else {
      st.textContent = 'Inferência completa: as cinco etapas foram executadas.';
      st.classList.add('fim');
    }
    $('btnAvancar').disabled = etapa >= 5;
    $('btnAvancar').textContent = etapa >= 5 ? 'Avançar etapa' : `Avançar etapa (${etapa + 1}. ${NOMES_ETAPAS[etapa]})`;

    // Graus de pertinência (todos, inclusive os iguais a zero)
    [['grausUmidade', 'umidade'], ['grausTemperatura', 'temperatura']].forEach(([id, variavel]) => {
      $(id).querySelectorAll('tbody tr').forEach((tr, i) => {
        tr.lastChild.textContent = etapa >= 1 ? fmt(r.graus[variavel][i]) : '—';
      });
    });

    // Regras
    $('regraSel').value = String(regraSel);
    $('tabRegras').querySelectorAll('tbody tr').forEach((tr, i) => {
      const x = etapa >= 2 ? r.regras[i] : null;
      tr.classList.toggle('ativa', !!x && x.h > 0);
      tr.classList.toggle('selecionada', i === regraSel);
      tr.lastChild.textContent = x ? `mín(${fmt(x.muU)}; ${fmt(x.muT)}) = ${fmt(x.h)}` : '—';
    });

    // Texto da regra selecionada
    const tr = $('txtRegra');
    const cTela = consequenteDaTela(regraSel);
    const nomeC = VARIAVEIS.tempo.termos[cTela].nome;
    if (etapa >= 3) {
      const x = r.regras[regraSel];
      tr.className = 'explica';
      tr.textContent = x.h > 0
        ? `${textoRegra(x)}. O conjunto ${nomeC} é recortado na altura ${fmt(x.h)}: μ${x.id}(z) = mín(${fmt(x.h)}; μ${nomeC}(z)).`
        : `${textoRegra(x)}. Ativação zero: esta regra não contribui para a saída.`;
    } else {
      tr.className = 'explica pendente';
      tr.textContent = `${REGRAS[regraSel].id} conclui "${nomeC}". O recorte aparece a partir da etapa 3 (Implicação).`;
    }

    // Texto e valor da saída
    const ts = $('txtSaida');
    const tempo = $('tempo');
    const det = $('tempoDetalhe');
    ts.className = 'explica' + (etapa >= 3 ? '' : ' pendente');
    if (etapa < 3) ts.textContent = 'Os recortes aparecem na etapa 3, a região agregada na etapa 4 e o centroide na etapa 5.';
    else if (etapa === 3) ts.textContent = 'Etapa 3: cada regra ativada recorta o seu consequente na altura h.';
    else if (etapa === 4) ts.textContent = 'Etapa 4: a região agregada é, em cada z, o máximo entre os recortes (as áreas sobrepostas não são somadas).';
    else if (r.saida.valido) ts.textContent = `Etapa 5: centroide da região agregada por pontos médios (Δz = ${fmt(r.saida.dz)}, N = ${r.saida.N}): z* = ${fmt6(r.saida.z)} min.`;
    else ts.textContent = 'Etapa 5: o denominador do centroide é zero. Não há saída agregada válida.';

    if (etapa >= 5 && r.saida.valido) {
      tempo.textContent = `${fmtTempo(r.saida.z)} min`;
      tempo.classList.remove('vazio');
      det.textContent = `Sem arredondar: ${fmt6(r.saida.z)} min · U = ${fmt(r.U)} % · T = ${fmt(r.T)} °C · Δz = ${fmt(r.saida.dz)}`;
    } else if (etapa >= 5) {
      tempo.textContent = 'sem saída válida';
      tempo.classList.add('vazio');
      det.textContent = 'Não há saída agregada válida para esta configuração.';
    } else {
      tempo.textContent = '—';
      tempo.classList.add('vazio');
      det.textContent = etapa === 0 ? 'Ainda não calculado.' : `Disponível ao concluir a etapa 5 (agora na etapa ${etapa}).`;
    }

    const log = montarLog();
    $('log').textContent = log;
    $('logVazio').style.display = log ? 'none' : '';
    renderGraficos();
  }

  /* ================= Tema claro/escuro (só aparência) ================= */
  function aplicarTema(tema, salvar) {
    document.documentElement.dataset.tema = tema;
    const escuro = tema === 'escuro';
    $('btnTema').textContent = escuro ? '☀️ Modo claro' : '🌙 Modo noturno';
    $('btnTema').setAttribute('aria-pressed', String(escuro));
    if (salvar) {
      try { localStorage.setItem('tema', tema); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
    }
    renderGraficos();
  }

  /* ================= Inicialização ================= */
  function ligarEntrada(idTexto, idDesl, variavel) {
    const texto = $(idTexto);
    const desl = $(idDesl);
    texto.addEventListener('input', () => {
      const v = F.lerNumero(texto.value, variavel);
      if (v.ok) desl.value = v.valor; // entrada inválida não é ajustada para o limite
      invalidar();
    });
    desl.addEventListener('input', () => {
      texto.value = String(desl.value).replace('.', ',');
      invalidar();
    });
  }

  function iniciar() {
    montarTabelas();
    ligarEntrada('umidade', 'umidadeDesl', 'umidade');
    ligarEntrada('temperatura', 'temperaturaDesl', 'temperatura');
    $('passo').addEventListener('change', invalidar);
    $('btnCalcular').addEventListener('click', calcular);
    $('btnAvancar').addEventListener('click', avancar);
    $('btnRestaurar').addEventListener('click', restaurar);
    $('btnTema').addEventListener('click', () => {
      aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro', true);
    });
    $('btnTestes').addEventListener('click', () => {
      const res = TestesFuzzy.executar(F);
      $('saidaTestes').textContent = `${res.filter((t) => t.ok).length} de ${res.length} grupos de teste aprovados\n\n` + TestesFuzzy.comoTexto(res);
    });
    window.addEventListener('resize', renderGraficos);
    aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro', false);
    renderizar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
