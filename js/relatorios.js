/* Skin Expert Pro — Financeiro › Relatórios.
   Lê os dados que já existem (comandas, controle financeiro e contas) e monta o resumo do período.
   Não salva nada: é só leitura. Precisa vir depois do financeiro.js no index.html. */
(function iniciarRelatorios(){
  const painel = document.getElementById('finpanel-relatorios');
  if(!painel) return;

  const COR_RECEITA = '#8a3a52', COR_DESPESA = '#c9a046';
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Datas ---------- */
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const deISO = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000) + 1;

  function periodoEscolhido(){
    const tipo = $('relPeriodo').value;
    const hoje = new Date(), a = hoje.getFullYear(), m = hoje.getMonth();
    let de, ate, ant;
    if(tipo === 'mespassado'){
      de = new Date(a, m - 1, 1); ate = new Date(a, m, 0);
      ant = [new Date(a, m - 2, 1), new Date(a, m - 1, 0)];
    } else if(tipo === '3meses'){
      de = new Date(a, m - 2, 1); ate = new Date(a, m + 1, 0);
      ant = [new Date(a, m - 5, 1), new Date(a, m - 2, 0)];
    } else if(tipo === 'ano'){
      de = new Date(a, 0, 1); ate = new Date(a, 11, 31);
      ant = [new Date(a - 1, 0, 1), new Date(a - 1, 11, 31)];
    } else if(tipo === 'personalizado'){
      const d1 = $('relDe').value, d2 = $('relAte').value;
      de = d1 ? deISO(d1) : new Date(a, m, 1);
      ate = d2 ? deISO(d2) : new Date(a, m + 1, 0);
      if(ate < de) [de, ate] = [ate, de];
      const n = diasEntre(iso(de), iso(ate));
      ant = [new Date(de.getFullYear(), de.getMonth(), de.getDate() - n), new Date(de.getFullYear(), de.getMonth(), de.getDate() - 1)];
    } else { // este mês
      de = new Date(a, m, 1); ate = new Date(a, m + 1, 0);
      ant = [new Date(a, m - 1, 1), new Date(a, m, 0)];
    }
    return { de: iso(de), ate: iso(ate), antDe: iso(ant[0]), antAte: iso(ant[1]) };
  }

  /* ---------- Contas ---------- */
  const noPeriodo = (d, de, ate) => !!d && d >= de && d <= ate;
  const soma = (lista, f) => lista.reduce((s, x) => s + (Number(f(x)) || 0), 0);

  function numeros(de, ate){
    const mov = (controleData || []).filter(x => x.pago && noPeriodo(x.dataISO, de, ate));
    const receitas = mov.filter(x => x.tipo === 'receita'), despesas = mov.filter(x => x.tipo === 'despesa');
    const comandas = (comandasData || []).filter(c => c.status !== 'Inativa' && noPeriodo(c.dataISO, de, ate));
    const fat = soma(receitas, x => x.valor), desp = soma(despesas, x => x.valor);
    const totalComandas = soma(comandas, c => c.valor);
    return {
      receitas, despesas, comandas, fat, desp, lucro: fat - desp,
      atend: comandas.length, ticket: comandas.length ? totalComandas / comandas.length : 0,
      descontos: soma(comandas, c => c.descontoAplicado),
      clientes: new Set(comandas.map(c => (c.cliente || '').trim().toLowerCase()).filter(Boolean)).size,
    };
  }

  function agrupar(lista, chave, valor){
    const mapa = new Map();
    lista.forEach(x => {
      const k = chave(x) || '—';
      const g = mapa.get(k) || { nome: k, valor: 0, qtd: 0 };
      g.valor += Number(valor(x)) || 0; g.qtd++;
      mapa.set(k, g);
    });
    return [...mapa.values()].sort((a, b) => b.valor - a.valor || b.qtd - a.qtd);
  }

  /* ---------- Desenho ---------- */
  function variacao(atual, anterior, inverter){
    if(!anterior){
      return atual ? '<span class="rel-var">sem dados do período anterior</span>' : '<span class="rel-var">&nbsp;</span>';
    }
    const pct = Math.round((atual - anterior) / Math.abs(anterior) * 100);
    if(pct === 0) return '<span class="rel-var">igual ao período anterior</span>';
    const bom = inverter ? pct < 0 : pct > 0;
    return `<span class="rel-var ${bom ? 'bom' : 'ruim'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs anterior</span>`;
  }

  function cartao(rotulo, valor, sub, classe){
    return `<div class="fin-summary-card ${classe || ''}"><div class="fin-summary-label">${rotulo}</div><div class="fin-summary-value">${valor}</div><div class="fin-summary-sub">${sub || '&nbsp;'}</div></div>`;
  }

  function listaComBarras(itens, cor, opts = {}){
    if(!itens.length) return `<div class="rel-vazio">${opts.vazio || 'Nada neste período.'}</div>`;
    const max = Math.max(...itens.map(i => i.valor), 0.01), total = soma(itens, i => i.valor);
    const mostrar = itens.slice(0, opts.limite || 8);
    const resto = itens.slice(opts.limite || 8);
    if(resto.length) mostrar.push({ nome: `Outros (${resto.length})`, valor: soma(resto, i => i.valor), qtd: soma(resto, i => i.qtd), outros: true });
    return '<div class="rel-barras">' + mostrar.map(i => {
      const pct = total ? Math.round(i.valor / total * 100) : 0;
      const detalhe = opts.detalhe ? opts.detalhe(i) : `${pct}%`;
      return `<div class="rel-barra-linha" title="${esc(i.nome)}: ${fmtMoeda(i.valor)} (${pct}%)">
        <div class="rel-barra-topo"><span class="rel-barra-nome">${esc(i.nome)}</span><span class="rel-barra-valor">${fmtMoeda(i.valor)}</span></div>
        <div class="rel-barra-trilho"><div class="rel-barra" style="width:${Math.max(2, i.valor / max * 100)}%;background:${i.outros ? 'var(--text-muted)' : cor};"></div></div>
        <div class="rel-barra-det">${detalhe}</div>
      </div>`;
    }).join('') + '</div>';
  }

  function graficoMensal(ateISO){
    const fim = deISO(ateISO);
    const meses = [];
    for(let k = 5; k >= 0; k--){
      const ini = new Date(fim.getFullYear(), fim.getMonth() - k, 1), ult = new Date(fim.getFullYear(), fim.getMonth() - k + 1, 0);
      const n = numeros(iso(ini), iso(ult));
      meses.push({ rotulo: MESES_CURTOS[ini.getMonth()] + (ini.getMonth() === 0 || k === 5 ? '/' + String(ini.getFullYear()).slice(2) : ''), nomeLongo: `${MESES_CURTOS[ini.getMonth()]} de ${ini.getFullYear()}`, rec: n.fat, desp: n.desp });
    }
    const max = Math.max(...meses.map(m => Math.max(m.rec, m.desp)), 0);
    if(!max) return '<div class="rel-vazio">Ainda não há receitas ou despesas pagas nos últimos 6 meses.</div>';
    const h = (v) => v > 0 ? Math.max(2, v / max * 100) : 0;
    const colunas = meses.map(m => `
      <div class="rel-mes" tabindex="0" data-rec="${m.rec}" data-desp="${m.desp}" data-nome="${esc(m.nomeLongo)}">
        <div class="rel-mes-barras">
          <div class="rel-col" style="height:${h(m.rec)}%;background:${COR_RECEITA};"></div>
          <div class="rel-col" style="height:${h(m.desp)}%;background:${COR_DESPESA};"></div>
        </div>
        <div class="rel-mes-rotulo">${m.rotulo}</div>
      </div>`).join('');
    const tabela = `<table class="rel-tabela-mensal"><thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Lucro</th></tr></thead><tbody>${
      meses.map(m => `<tr><td>${esc(m.nomeLongo)}</td><td class="num">${fmtMoeda(m.rec)}</td><td class="num">${fmtMoeda(m.desp)}</td><td class="num">${fmtMoeda(m.rec - m.desp)}</td></tr>`).join('')}</tbody></table>`;
    return `<div class="rel-legenda"><span><i style="background:${COR_RECEITA}"></i>Receitas</span><span><i style="background:${COR_DESPESA}"></i>Despesas</span></div>
      <div class="rel-grafico">${colunas}<div class="rel-tooltip" role="status"></div></div>
      <details class="rel-ver-tabela"><summary>Ver em tabela</summary>${tabela}</details>`;
  }

  function ligarTooltip(){
    const graf = painel.querySelector('.rel-grafico');
    if(!graf) return;
    const tip = graf.querySelector('.rel-tooltip');
    const mostrar = (col) => {
      const rec = Number(col.dataset.rec), desp = Number(col.dataset.desp);
      tip.innerHTML = `<strong>${col.dataset.nome}</strong>
        <div><i style="background:${COR_RECEITA}"></i>Receitas <b>${fmtMoeda(rec)}</b></div>
        <div><i style="background:${COR_DESPESA}"></i>Despesas <b>${fmtMoeda(desp)}</b></div>
        <div class="lucro">Lucro <b>${fmtMoeda(rec - desp)}</b></div>`;
      const g = graf.getBoundingClientRect(), c = col.getBoundingClientRect();
      tip.classList.add('on');
      let x = c.left - g.left + c.width / 2 - tip.offsetWidth / 2;
      x = Math.max(0, Math.min(x, g.width - tip.offsetWidth));
      tip.style.left = x + 'px';
      graf.querySelectorAll('.rel-mes').forEach(m => m.classList.toggle('foco', m === col));
    };
    const esconder = () => { tip.classList.remove('on'); graf.querySelectorAll('.rel-mes').forEach(m => m.classList.remove('foco')); };
    graf.querySelectorAll('.rel-mes').forEach(col => {
      col.addEventListener('mouseenter', () => mostrar(col));
      col.addEventListener('focus', () => mostrar(col));
      col.addEventListener('click', () => mostrar(col));
      col.addEventListener('blur', esconder);
    });
    graf.addEventListener('mouseleave', esconder);
  }

  function renderRelatorio(){
    if(!painel.classList.contains('active')) return; // só desenha quando a aba está aberta
    const p = periodoEscolhido();
    const n = numeros(p.de, p.ate), a = numeros(p.antDe, p.antAte);
    $('relPeriodoTexto').textContent = `${isoParaBR(p.de)} a ${isoParaBR(p.ate)}`;

    // Pendências (de qualquer data)
    const hoje = iso(new Date());
    const comandasAbertas = (comandasData || []).filter(c => c.status !== 'Inativa' && c.saldo > 0);
    const contasReceber = (contasData || []).filter(c => c.tipo === 'receber' && !c.pago);
    const contasPagar = (contasData || []).filter(c => c.tipo === 'pagar' && !c.pago);
    const movPend = (controleData || []).filter(x => !x.pago);
    const aReceber = soma(comandasAbertas, c => c.saldo) + soma(contasReceber, c => c.valor) + soma(movPend.filter(x => x.tipo === 'receita'), x => x.valor);
    const aPagar = soma(contasPagar, c => c.valor) + soma(movPend.filter(x => x.tipo === 'despesa'), x => x.valor);
    const vencidas = contasPagar.filter(c => c.vencISO && c.vencISO < hoje);
    const margem = n.fat ? Math.round(n.lucro / n.fat * 100) : null;

    $('relResumo').innerHTML =
      cartao('Faturamento', fmtMoeda(n.fat), variacao(n.fat, a.fat), 'in') +
      cartao('Despesas', fmtMoeda(n.desp), variacao(n.desp, a.desp, true), 'out') +
      cartao('Lucro', fmtMoeda(n.lucro), margem === null ? variacao(n.lucro, a.lucro) : `Margem de ${margem}% · ` + variacao(n.lucro, a.lucro), n.lucro < 0 ? 'out' : '') +
      cartao('Ticket médio', fmtMoeda(n.ticket), `${n.atend} ${n.atend === 1 ? 'atendimento' : 'atendimentos'}`);
    $('relResumo2').innerHTML =
      cartao('A receber', fmtMoeda(aReceber), `${comandasAbertas.length} ${comandasAbertas.length === 1 ? 'comanda aberta' : 'comandas abertas'} · ${contasReceber.length} ${contasReceber.length === 1 ? 'conta' : 'contas'}`, 'pending') +
      cartao('A pagar', fmtMoeda(aPagar), vencidas.length ? `<span class="rel-var ruim">${vencidas.length} ${vencidas.length === 1 ? 'conta vencida' : 'contas vencidas'}</span>` : `${contasPagar.length} ${contasPagar.length === 1 ? 'conta pendente' : 'contas pendentes'}`, 'pending') +
      cartao('Clientes atendidas', String(n.clientes), variacao(n.clientes, a.clientes)) +
      cartao('Descontos concedidos', fmtMoeda(n.descontos), n.atend ? `em ${n.comandas.filter(c => c.descontoAplicado > 0).length} de ${n.atend} comandas` : '');

    $('relMensal').innerHTML = graficoMensal(p.ate);
    ligarTooltip();

    // Serviços e produtos vendidos (o desconto da comanda é dividido entre os itens)
    const itens = [];
    n.comandas.forEach(c => {
      const fator = c.subtotal > 0 ? c.valor / c.subtotal : 1;
      (c.itens || []).forEach(i => itens.push({ nome: i.nome, valor: (Number(i.preco) || 0) * fator }));
    });
    $('relServicos').innerHTML = listaComBarras(agrupar(itens, i => i.nome, i => i.valor), COR_RECEITA, {
      vazio: 'Nenhuma comanda neste período.',
      detalhe: (i) => `${i.qtd} ${i.qtd === 1 ? 'vez' : 'vezes'}`,
    });
    $('relFormas').innerHTML = listaComBarras(agrupar(n.receitas, x => x.forma || 'Não informada', x => x.valor), COR_RECEITA, { vazio: 'Nenhuma receita paga neste período.' });
    $('relDespesas').innerHTML = listaComBarras(agrupar(n.despesas, x => x.categoria || 'Outros', x => x.valor), COR_DESPESA, { vazio: 'Nenhuma despesa paga neste período.' });
    $('relClientes').innerHTML = listaComBarras(agrupar(n.comandas, c => c.cliente || 'Sem nome', c => c.valor), COR_RECEITA, {
      vazio: 'Nenhuma comanda neste período.', limite: 5,
      detalhe: (i) => `${i.qtd} ${i.qtd === 1 ? 'comanda' : 'comandas'}`,
    });
  }

  /* ---------- Ligações ---------- */
  function trocarPeriodo(){
    const pers = $('relPeriodo').value === 'personalizado';
    painel.querySelectorAll('.rel-datas').forEach(el => { el.style.display = pers ? '' : 'none'; });
    if(pers && !$('relDe').value){
      const h = new Date();
      $('relDe').value = iso(new Date(h.getFullYear(), h.getMonth(), 1));
      $('relAte').value = iso(h);
    }
    renderRelatorio();
  }
  $('relPeriodo').addEventListener('change', trocarPeriodo);
  $('relDe').addEventListener('change', renderRelatorio);
  $('relAte').addEventListener('change', renderRelatorio);

  // Sempre que o Financeiro se redesenha (troca de aba, pagamento, nova conta...), o relatório acompanha
  const renderFinanceiroOriginal = renderFinanceiro;
  renderFinanceiro = function(){ renderFinanceiroOriginal.apply(this, arguments); renderRelatorio(); };

  trocarPeriodo();
})();
