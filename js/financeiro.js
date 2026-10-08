/* Skin Expert Pro — Financeiro: moeda, comandas, controle financeiro (livro-caixa), contas a pagar/receber.
   Arquivo 10 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= FINANCEIRO MODULE ================= */
  // Abas do Financeiro (só as desta tela — antes o clique em abas de outras telas bagunçava estas)
  document.querySelectorAll('#view-financeiro .fin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-financeiro .fin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('#view-financeiro .fin-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('finpanel-' + tab.dataset.fintab);
      if(panel) panel.classList.add('active');
      renderFinanceiro();
    });
  });

  /* ---------- Moeda (a escolhida em Configurações › Preferências) ---------- */
  function simboloMoeda(moeda){ return { BRL: 'R$', USD: '$', EUR: '€' }[moeda || moedaPreferidaAtual()] || 'R$'; }
  function fmtMoeda(v){
    const n = Math.round((Number(v) || 0) * 100) / 100;
    const [inteiro, dec] = Math.abs(n).toFixed(2).split('.');
    return (n < 0 ? '– ' : '') + simboloMoeda() + ' ' + inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
  }
  // Lê "1.234,56", "1234,5", "12.50" ou "€ 30" como número.
  function lerValor(txt){
    let t = String(txt == null ? '' : txt).trim().replace(/[^\d,.\-]/g, '');
    if(t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t);
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  function valorParaCampo(v){ return (Math.round((Number(v) || 0) * 100) / 100).toFixed(2).replace('.', ','); }
  function arred(v){ return Math.round((Number(v) || 0) * 100) / 100; }
  function hojeISO(){ return dateKey(new Date()); }
  function isoParaBR(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; }
  function brParaISO(br){ const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; }
  function addMesISO(iso){
    const [a, m, d] = iso.split('-').map(Number);
    const ultimo = new Date(a, m + 1, 0).getDate();
    const alvo = new Date(a, m, Math.min(d, ultimo));
    return dateKey(alvo);
  }

  /* ---------- Camada de dados do Financeiro (banco na conta real, memória no modo demonstração) ---------- */
  function idLocal(){ return 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
  function ehIdDoBanco(id){ return typeof id === 'string' && id.includes('-') && !id.startsWith('demo-'); }
  let avisoFinSql = false;
  function avisarErroFin(acao, error){
    const msg = (error && error.message) || String(error || '');
    console.warn('Financeiro:', acao, msg);
    if(/column|relation|does not exist|schema cache|violates check/i.test(msg)){
      if(!avisoFinSql){ avisoFinSql = true; showToast('Falta atualizar o banco: rode no Supabase os arquivos SQL do Financeiro (financeiro.sql e descontos.sql). (' + msg.slice(0, 60) + ')'); }
    } else {
      showToast(acao + ': ' + msg.slice(0, 90));
    }
  }
  async function finInserir(tabela, registro){
    if(modoDemonstracao) return { ...registro, id: idLocal() };
    const user = await usuarioParaSalvar();
    if(!user) return null;
    const { data, error } = await supabaseClient.from(tabela).insert({ ...registro, profissional_id: user.id }).select().single();
    if(error){ avisarErroFin('Não foi possível salvar', error); return null; }
    return data;
  }
  async function finAtualizar(tabela, id, campos){
    if(modoDemonstracao || !ehIdDoBanco(id)) return true;
    const user = await usuarioParaSalvar();
    if(!user) return false;
    const { error } = await supabaseClient.from(tabela).update(campos).eq('id', id);
    if(error){ avisarErroFin('Não foi possível salvar', error); return false; }
    return true;
  }
  async function finApagar(tabela, id){
    if(modoDemonstracao || !ehIdDoBanco(id)) return true;
    const user = await usuarioParaSalvar();
    if(!user) return false;
    const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
    if(error){ avisarErroFin('Não foi possível apagar', error); return false; }
    return true;
  }

  /* ---------- Formas de pagamento (aba própria, salvas nas configurações) ---------- */
  const FORMAS_PADRAO = {
    BRL: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'],
    EUR: ['MB Way', 'Multibanco', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'],
    USD: ['Cash', 'Credit Card', 'Debit Card', 'Zelle', 'Bank Transfer'],
  };
  var formasPagamento = null; // null = padrão da moeda; senão [{ nome, ativa }]
  function listaFormas(){
    return formasPagamento || (FORMAS_PADRAO[moedaPreferidaAtual()] || FORMAS_PADRAO.BRL).map(nome => ({ nome, ativa: true }));
  }
  function formasAtivas(){ return listaFormas().filter(f => f.ativa).map(f => f.nome); }
  function preencherSelectFormas(sel, atual, textoVazio){
    const nomes = formasAtivas().slice();
    if(atual && atual !== '—' && !nomes.includes(atual)) nomes.push(atual);
    sel.innerHTML = (textoVazio ? `<option value="">${escHTML(textoVazio)}</option>` : '') +
      nomes.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('');
    if(atual && atual !== '—') sel.value = atual;
  }
  function renderFormas(){
    const el = document.getElementById('formasLista');
    if(!el) return;
    const lista = listaFormas();
    const padrao = FORMAS_PADRAO[moedaPreferidaAtual()] || [];
    el.innerHTML = lista.length ? '' : '<div class="comanda-vazio">Nenhuma forma cadastrada.</div>';
    lista.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'forma-item';
      row.innerHTML = `<label><input type="checkbox" ${f.ativa ? 'checked' : ''}> ${escHTML(f.nome)}</label>` +
        (padrao.includes(f.nome) ? '' : '<button type="button">Remover</button>');
      row.querySelector('input').addEventListener('change', (e) => {
        formasPagamento = listaFormas().map(x => ({ ...x }));
        formasPagamento[i].ativa = e.target.checked;
        salvarConfig('formas_pagamento', formasPagamento);
      });
      const rem = row.querySelector('button');
      if(rem) rem.addEventListener('click', () => {
        formasPagamento = listaFormas().filter((x, j) => j !== i);
        salvarConfig('formas_pagamento', formasPagamento);
        renderFormas();
      });
      el.appendChild(row);
    });
  }
  document.getElementById('btnAddForma').addEventListener('click', () => {
    const inp = document.getElementById('formaNovaNome');
    const nome = inp.value.trim();
    if(!nome) return;
    if(listaFormas().some(f => semAcento(f.nome) === semAcento(nome))){ showToast('Essa forma já existe.'); return; }
    formasPagamento = listaFormas().map(x => ({ ...x })).concat([{ nome, ativa: true }]);
    salvarConfig('formas_pagamento', formasPagamento);
    inp.value = '';
    renderFormas();
    showToast('Forma de pagamento adicionada!');
  });
  document.getElementById('formaNovaNome').addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('btnAddForma').click(); });
  document.getElementById('btnFormasPadrao').addEventListener('click', () => {
    if(!confirm('Voltar para as formas de pagamento padrão da sua moeda? As que você adicionou serão removidas.')) return;
    formasPagamento = null;
    salvarConfig('formas_pagamento', []);
    renderFormas();
  });

  /* ---------- Listas de sugestão (categorias, serviços, clientes) ---------- */
  const CATEGORIAS_PADRAO = ['Atendimento', 'Produtos', 'Estoque / Insumos', 'Aluguel', 'Contas de consumo', 'Marketing', 'Assinaturas', 'Impostos', 'Equipamentos', 'Cursos', 'Outros'];
  function atualizarSugestoesFin(){
    const cats = new Set(CATEGORIAS_PADRAO);
    try{ controleData.forEach(m => m.categoria && cats.add(m.categoria)); contasData.forEach(c => c.categoria && cats.add(c.categoria)); }catch(e){}
    document.getElementById('finCategoriasLista').innerHTML = [...cats].map(c => `<option value="${escHTML(c)}"></option>`).join('');
    let servs = [];
    try{ servs = servicosAtivos().map(s => s.nome); }catch(e){} // desativados não aparecem nas sugestões
    let pacs = [];
    try{ pacs = pacotesData.map(p => 'Pacote: ' + p.nome); }catch(e){}
    document.getElementById('finServicosLista').innerHTML = servs.concat(pacs).map(n => `<option value="${escHTML(n)}"></option>`).join('');
    let nomes = [];
    try{ nomes = patients.map(p => p.name).filter(Boolean); }catch(e){}
    document.getElementById('finPacientesLista').innerHTML = [...new Set(nomes)].map(n => `<option value="${escHTML(n)}"></option>`).join('');
  }
  function precoDoServico(nome){
    const pac = pacoteDoNomeItem(nome);
    if(pac) return pac.valor;
    try{ const s = servicosData.find(x => semAcento(x.nome) === semAcento(nome)); return s ? (Number(s.preco) || 0) : null; }catch(e){ return null; }
  }
  // "Pacote: Nome" na comanda → o pacote (preço já com o desconto do pacote)
  function pacoteDoNomeItem(nome){
    const m = String(nome || '').match(/^Pacote:\s*(.+)$/i);
    if(!m) return null;
    try{ return pacotesData.find(p => semAcento(p.nome) === semAcento(m[1].trim())) || null; }catch(e){ return null; }
  }

  /* ================= COMANDAS ================= */
  // Formato: { id, codigo, dataISO, data, cliente, itens:[{nome, preco, origem}], pagamentos:[{id, data, forma, valor, movimentoId}],
  //            valor, saldo, servicos, pagamento, status, agendamentoId, pacienteId, moeda }
  function comandaExemplo(codigo, dataISO, cliente, itens, pagamentos){
    const c = { id: idLocal(), codigo, dataISO, data: isoParaBR(dataISO), cliente, itens, pagamentos, status: 'Em Aberto', moeda: null };
    recalcularComanda(c);
    return c;
  }
  let comandasData = [
    comandaExemplo('#0001', '2026-08-13', 'Paciente Teste 1', [{ nome: 'Limpeza de Pele Profunda', preco: 150, origem: 'servico' }, { nome: 'Peeling de Diamante', preco: 130, origem: 'servico' }], [{ id: 'p1', data: '2026-08-13', forma: 'Cartão de Crédito', valor: 280 }]),
    comandaExemplo('#0002', '2026-08-13', 'Paciente Teste 4', [{ nome: 'Limpeza de Pele Profunda', preco: 150, origem: 'servico' }], []),
    comandaExemplo('#0003', '2026-08-12', 'Paciente Teste 3', [{ nome: 'Drenagem Linfática', preco: 120, origem: 'servico' }, { nome: 'Protetor solar', preco: 300, origem: 'extra' }], [{ id: 'p2', data: '2026-08-12', forma: 'Pix', valor: 420 }]),
    comandaExemplo('#0004', '2026-08-11', 'Paciente Teste 5', [{ nome: 'Massagem Relaxante', preco: 99.9, origem: 'servico' }], [{ id: 'p3', data: '2026-08-11', forma: 'Dinheiro', valor: 99.9 }]),
  ];

  // Desconto { tipo: 'percent' | 'valor', valor } sobre um subtotal. Nunca passa do subtotal.
  function calcularDesconto(subtotal, desconto){
    if(!desconto || !(Number(desconto.valor) > 0) || !(subtotal > 0)) return 0;
    const v = Number(desconto.valor);
    return arred(desconto.tipo === 'percent' ? subtotal * Math.min(v, 100) / 100 : Math.min(v, subtotal));
  }
  function textoDesconto(desconto){
    if(!desconto || !(Number(desconto.valor) > 0)) return '';
    return desconto.tipo === 'percent' ? `${String(desconto.valor).replace('.', ',')}%` : fmtMoeda(desconto.valor);
  }

  function recalcularComanda(c){
    c.itens = Array.isArray(c.itens) ? c.itens : [];
    c.pagamentos = Array.isArray(c.pagamentos) ? c.pagamentos : [];
    c.subtotal = arred(c.itens.reduce((s, i) => s + (Number(i.preco) || 0), 0));
    c.descontoAplicado = calcularDesconto(c.subtotal, c.desconto);
    c.valor = arred(c.subtotal - c.descontoAplicado); // total a pagar (já com desconto) — é o que entra no financeiro
    const pago = arred(c.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0));
    c.pago = pago;
    c.saldo = Math.max(0, arred(c.valor - pago));
    c.servicos = c.itens.map(i => i.nome).join(', ');
    c.pagamento = [...new Set(c.pagamentos.map(p => p.forma).filter(Boolean))].join(' + ') || '—';
    if(c.status !== 'Inativa') c.status = (c.valor > 0 && c.saldo <= 0) ? 'Fechada' : 'Em Aberto';
    c.data = isoParaBR(c.dataISO);
    return c;
  }
  function comandaParaBanco(c){
    return {
      codigo: c.codigo, data: c.dataISO || null, cliente: c.cliente, servicos: c.servicos || null,
      itens: c.itens, pagamentos: c.pagamentos, valor: c.valor, saldo: c.saldo,
      pagamento: c.pagamento === '—' ? null : c.pagamento, status: c.status,
      moeda: c.moeda || moedaPreferidaAtual(),
      agendamento_id: c.agendamentoId || null, paciente_id: c.pacienteId != null ? String(c.pacienteId) : null,
      ...(c.desconto !== undefined ? { desconto: c.desconto, subtotal: c.subtotal } : {}),
    };
  }
  function comandaDoBanco(r){
    let itens = Array.isArray(r.itens) ? r.itens.map(i => ({ nome: i.nome, preco: Number(i.preco) || 0, origem: i.origem || 'servico' })) : null;
    if(!itens){ // comandas antigas (sem itens): um item com o valor total
      itens = (r.servicos || Number(r.valor)) ? [{ nome: r.servicos || 'Atendimento', preco: Number(r.valor) || 0, origem: 'servico' }] : [];
    }
    let pagamentos = Array.isArray(r.pagamentos) ? r.pagamentos : null;
    if(!pagamentos){ // antigas: deduz o que já foi pago
      const pago = arred((Number(r.valor) || 0) - (Number(r.saldo) || 0));
      pagamentos = pago > 0 ? [{ id: idLocal(), data: r.data, forma: r.pagamento || '—', valor: pago }] : [];
    }
    const c = {
      id: r.id, codigo: r.codigo, dataISO: r.data ? String(r.data).slice(0, 10) : '', cliente: r.cliente || 'Sem nome',
      itens, pagamentos, status: r.status || 'Em Aberto', agendamentoId: r.agendamento_id || null,
      pacienteId: r.paciente_id || null, moeda: r.moeda || null,
    };
    if('desconto' in r) c.desconto = (r.desconto && Number(r.desconto.valor) > 0) ? { tipo: r.desconto.tipo === 'percent' ? 'percent' : 'valor', valor: Number(r.desconto.valor) } : null;
    return recalcularComanda(c);
  }

  function statusPillHTML(status){
    if(status === 'Fechada') return `<span class="status-active">Fechada</span>`;
    if(status === 'Inativa') return `<span class="pill pill-inativa" title="Atendimento cancelado">Inativa</span>`;
    return `<span class="pill pill-gray">Em Aberto</span>`;
  }

  function comandasFiltradas(){
    const busca = semAcento((document.getElementById('comandasBusca') || {}).value || '').trim();
    const de = (document.getElementById('comandasDateFrom') || {}).value || '';
    const ate = (document.getElementById('comandasDateTo') || {}).value || '';
    const status = (document.getElementById('comandasFiltroStatus') || {}).value || 'ativas';
    return comandasData.filter(c => {
      if(status === 'ativas' && c.status === 'Inativa') return false;
      if(status !== 'ativas' && status !== 'todas' && c.status !== status) return false;
      if(de && c.dataISO && c.dataISO < de) return false;
      if(ate && c.dataISO && c.dataISO > ate) return false;
      if(busca && !semAcento((c.cliente || '') + ' ' + (c.codigo || '') + ' ' + (c.servicos || '')).includes(busca)) return false;
      return true;
    }).sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || String(b.codigo || '').localeCompare(String(a.codigo || '')));
  }

  const ICONE_LIXEIRA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';

  function renderComandas(){
    const body = document.getElementById('comandasBody');
    if(!body) return;
    body.innerHTML = '';
    const lista = comandasFiltradas();

    // Resumo do período filtrado (inativas não contam)
    const validas = lista.filter(c => c.status !== 'Inativa');
    const abertas = validas.filter(c => c.saldo > 0);
    const total = validas.reduce((s, c) => s + c.valor, 0);
    const recebido = validas.reduce((s, c) => s + (c.pago || 0), 0);
    const setTxt = (id, t) => { const el = document.getElementById(id); if(el) el.textContent = t; };
    setTxt('sumComandasAberto', fmtMoeda(abertas.reduce((s, c) => s + c.saldo, 0)));
    setTxt('sumComandasAbertoN', `${abertas.length} comanda${abertas.length === 1 ? '' : 's'} com saldo`);
    setTxt('sumComandasRecebido', fmtMoeda(recebido));
    setTxt('sumComandasRecebidoN', 'pagamentos registrados');
    setTxt('sumComandasTotal', fmtMoeda(total));
    setTxt('sumComandasTotalN', `${validas.length} comanda${validas.length === 1 ? '' : 's'}`);
    setTxt('sumComandasDescontos', fmtMoeda(validas.reduce((s, c) => s + (c.descontoAplicado || 0), 0)));
    setTxt('sumComandasTicket', validas.length ? `ticket médio ${fmtMoeda(total / validas.length)}` : '');

    if(!lista.length){
      body.innerHTML = `<tr><td colspan="9" class="fin-vazio">${comandasData.length ? 'Nenhuma comanda com esses filtros.' : 'Nenhuma comanda ainda. Elas são criadas sozinhas quando você agenda um atendimento — ou use "Nova Comanda".'}</td></tr>`;
      return;
    }
    lista.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      tr.innerHTML = `
        <td>${escHTML(c.codigo)}</td>
        <td>${escHTML(c.data)}</td>
        <td>${escHTML(c.cliente)}</td>
        <td class="comanda-servicos">${escHTML(c.servicos || '—')}</td>
        <td class="num">${c.descontoAplicado > 0 ? `<span class="desconto-tag" title="Desconto de ${textoDesconto(c.desconto)} (${fmtMoeda(c.descontoAplicado)})">–${textoDesconto(c.desconto)}</span> ` : ''}${fmtMoeda(c.valor)}</td>
        <td class="num">${fmtMoeda(c.saldo)}</td>
        <td>${escHTML(c.pagamento || '—')}</td>
        <td>${statusPillHTML(c.status)}</td>
        <td style="text-align:right;"><button type="button" class="comanda-apagar" title="Apagar comanda" aria-label="Apagar comanda ${escHTML(c.codigo)}">${ICONE_LIXEIRA}</button></td>
      `;
      tr.addEventListener('click', () => abrirComanda(c));
      tr.querySelector('.comanda-apagar').addEventListener('click', (e) => { e.stopPropagation(); apagarComanda(c); });
      body.appendChild(tr);
    });
  }
  ['comandasBusca', 'comandasDateFrom', 'comandasDateTo', 'comandasFiltroStatus'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderComandas);
  });

  // Apaga a comanda e os lançamentos dos pagamentos dela.
  async function apagarComanda(c, semPerguntar){
    if(!semPerguntar){
      const extra = c.pagamentos.length ? `\n\nOs ${c.pagamentos.length} pagamento(s) dela também saem do Controle Financeiro.` : '';
      if(!confirm(`Apagar a comanda ${c.codigo} (${c.cliente})?${extra}\n\nIsso não pode ser desfeito.`)) return false;
    }
    for(const p of c.pagamentos){ if(p.movimentoId) await finApagar('movimentos_financeiros', p.movimentoId); }
    if(!await finApagar('comandas', c.id)) return false;
    const movIds = new Set(c.pagamentos.map(p => p.movimentoId).filter(Boolean));
    controleData = controleData.filter(m => !movIds.has(m.id) && !(m.comandaId && m.comandaId === c.id));
    comandasData = comandasData.filter(x => x !== c);
    renderFinanceiro();
    if(!semPerguntar) showToast(`Comanda ${c.codigo} apagada.`);
    return true;
  }

  /* ---------- Janela da comanda: itens, pagamentos, nova comanda ---------- */
  const modalComandaOverlay = document.getElementById('modalComandaOverlay');
  let comandaAtual = null;   // comanda aberta (já salva) ou rascunho (nova)
  let comandaNova = false;

  function abrirComanda(c){
    comandaAtual = c; comandaNova = false;
    montarJanelaComanda();
    modalComandaOverlay.classList.add('open');
  }
  function novaComanda(){
    comandaAtual = recalcularComanda({ id: null, codigo: proximoCodigoComanda(), dataISO: hojeISO(), cliente: '', itens: [], pagamentos: [], status: 'Em Aberto', moeda: moedaPreferidaAtual() });
    comandaNova = true;
    montarJanelaComanda();
    modalComandaOverlay.classList.add('open');
    setTimeout(() => { if(!modalComandaOverlay.contains(document.activeElement)) document.getElementById('comandaCliente').focus(); }, 50);
  }
  function fecharComanda(){ modalComandaOverlay.classList.remove('open'); comandaAtual = null; }
  document.getElementById('btnNovaComanda').addEventListener('click', novaComanda);
  document.getElementById('btnComandaFechar').addEventListener('click', fecharComanda);
  modalComandaOverlay.addEventListener('click', (e) => { if(e.target === modalComandaOverlay) fecharComanda(); });

  function montarJanelaComanda(){
    const c = comandaAtual;
    atualizarSugestoesFin();
    const inativa = c.status === 'Inativa';
    document.getElementById('comandaTitulo').textContent = comandaNova ? 'Nova Comanda' : `Comanda ${c.codigo}`;
    document.getElementById('comandaStatusPill').innerHTML = comandaNova ? '' : statusPillHTML(c.status);
    const aviso = document.getElementById('comandaAviso');
    let textoAviso = '';
    if(inativa) textoAviso = 'O atendimento desta comanda foi cancelado, por isso ela está inativa.';
    else if(c.agendamentoId){
      let ag = null, agKey = null;
      Object.keys(appointments).some(k => (appointments[k] || []).some(a => { if(String(a.id) === String(c.agendamentoId)){ ag = a; agKey = k; return true; } return false; }));
      textoAviso = ag ? `Gerada pelo atendimento de ${formatarDataBR(agKey)} às ${ag.time}. Serviços alterados no agendamento atualizam esta comanda enquanto ela estiver em aberto.` : 'Gerada por um atendimento da agenda.';
    }
    aviso.textContent = textoAviso;
    aviso.style.display = textoAviso ? 'block' : 'none';

    const cli = document.getElementById('comandaCliente'), dt = document.getElementById('comandaData');
    cli.value = c.cliente || ''; dt.value = c.dataISO || hojeISO();
    cli.disabled = dt.disabled = inativa;
    document.getElementById('comandaAddItem').style.display = inativa ? 'none' : 'flex';
    document.getElementById('comandaItemNome').value = '';
    document.getElementById('comandaItemValor').value = '';

    renderItensComanda();
    document.getElementById('comandaPagamentosWrap').style.display = comandaNova ? 'none' : 'block';
    document.getElementById('btnComandaSalvar').style.display = comandaNova ? '' : 'none';
    document.getElementById('btnComandaSalvar').textContent = 'Criar comanda';
    document.getElementById('btnComandaExcluir').style.display = comandaNova ? 'none' : '';
    document.getElementById('btnComandaFechar').textContent = comandaNova ? 'Cancelar' : 'Fechar';
  }

  function renderItensComanda(){
    const c = comandaAtual;
    recalcularComanda(c);
    const inativa = c.status === 'Inativa';
    const box = document.getElementById('comandaItens');
    box.innerHTML = c.itens.length ? '' : '<div class="comanda-vazio">Nenhum item. Adicione um serviço ou produto abaixo.</div>';
    c.itens.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'comanda-linha';
      row.innerHTML = `<div class="nome">${escHTML(it.nome)}${it.origem === 'servico' && c.agendamentoId ? '<small>agenda</small>' : ''}</div>
        <div class="val">${inativa ? fmtMoeda(it.preco) : `<input type="text" inputmode="decimal" value="${valorParaCampo(it.preco)}" aria-label="Valor de ${escHTML(it.nome)}">`}</div>
        ${inativa ? '' : `<button type="button" title="Remover item" aria-label="Remover ${escHTML(it.nome)}">&times;</button>`}`;
      if(!inativa){
        row.querySelector('input').addEventListener('change', async (e) => {
          it.preco = lerValor(e.target.value);
          await salvarComandaAtual();
        });
        row.querySelector('button').addEventListener('click', async () => {
          c.itens.splice(i, 1);
          await salvarComandaAtual();
        });
      }
      box.appendChild(row);
    });
    // Desconto
    const selDesc = document.getElementById('comandaDescontoTipo'), inpDesc = document.getElementById('comandaDescontoValor');
    document.getElementById('comandaDescontoRow').style.display = inativa ? 'none' : 'flex';
    if(document.activeElement !== inpDesc && document.activeElement !== selDesc){
      selDesc.value = c.desconto && c.desconto.valor > 0 ? c.desconto.tipo : '';
      inpDesc.value = c.desconto && c.desconto.valor > 0 ? String(c.desconto.valor).replace('.', ',') : '';
      inpDesc.disabled = !selDesc.value;
    }
    document.getElementById('comandaResumoDesconto').innerHTML = c.descontoAplicado > 0
      ? `Subtotal ${fmtMoeda(c.subtotal)} · Desconto <strong>– ${fmtMoeda(c.descontoAplicado)}</strong>${c.desconto.tipo === 'percent' ? ` (${textoDesconto(c.desconto)})` : ''}`
      : '';
    document.getElementById('comandaTotal').textContent = fmtMoeda(c.valor);
    document.getElementById('comandaPago').textContent = fmtMoeda(c.pago || 0);
    document.getElementById('comandaSaldo').textContent = fmtMoeda(c.saldo);
    document.getElementById('comandaStatusPill').innerHTML = comandaNova ? '' : statusPillHTML(c.status);

    // Pagamentos
    const pags = document.getElementById('comandaPagamentos');
    pags.innerHTML = c.pagamentos.length ? '' : '<div class="comanda-vazio">Nenhum pagamento registrado.</div>';
    c.pagamentos.forEach(p => {
      const row = document.createElement('div');
      row.className = 'comanda-linha';
      row.innerHTML = `<div class="nome">${escHTML(isoParaBR(p.data))} · ${escHTML(p.forma || '—')}</div><div class="val">${fmtMoeda(p.valor)}</div>
        <button type="button" title="Desfazer este pagamento" aria-label="Desfazer pagamento">&times;</button>`;
      row.querySelector('button').addEventListener('click', () => desfazerPagamento(p));
      pags.appendChild(row);
    });
    const podePagar = !comandaNova && !inativa && c.saldo > 0;
    document.getElementById('comandaPagar').style.display = podePagar ? 'flex' : 'none';
    if(podePagar){
      preencherSelectFormas(document.getElementById('comandaPagForma'), document.getElementById('comandaPagForma').value || formasAtivas()[0]);
      document.getElementById('comandaPagValor').value = valorParaCampo(c.saldo);
      if(!document.getElementById('comandaPagData').value) document.getElementById('comandaPagData').value = hojeISO();
    }
  }

  // Persiste a comanda aberta (itens, cliente, data) e atualiza a lista.
  async function salvarComandaAtual(){
    const c = comandaAtual;
    if(!c) return false;
    recalcularComanda(c);
    if(!comandaNova){
      const ok = await finAtualizar('comandas', c.id, comandaParaBanco(c));
      if(!ok) return false;
    }
    renderItensComanda();
    renderComandas();
    return true;
  }

  document.getElementById('comandaDescontoTipo').addEventListener('change', (e) => {
    const inp = document.getElementById('comandaDescontoValor');
    inp.disabled = !e.target.value;
    if(!e.target.value){ aplicarDescontoComanda(); } else { inp.focus(); inp.select(); }
  });
  async function aplicarDescontoComanda(){
    const c = comandaAtual;
    if(!c) return;
    const tipo = document.getElementById('comandaDescontoTipo').value;
    const valor = lerValor(document.getElementById('comandaDescontoValor').value);
    const novo = tipo && valor > 0 ? { tipo, valor } : null;
    if(novo && tipo === 'percent' && valor > 100){ showToast('O desconto em porcentagem vai até 100%.'); return; }
    if(novo && tipo === 'valor' && valor > c.subtotal){ showToast(`O desconto passa do subtotal (${fmtMoeda(c.subtotal)}).`); return; }
    const novoTotal = arred(c.subtotal - calcularDesconto(c.subtotal, novo));
    if(novoTotal < (c.pago || 0) - 0.001){
      showToast(`Com esse desconto o total (${fmtMoeda(novoTotal)}) fica menor que o que já foi pago (${fmtMoeda(c.pago)}). Desfaça um pagamento antes.`);
      return;
    }
    const anterior = c.desconto;
    c.desconto = novo;
    document.getElementById('comandaDescontoValor').blur();
    if(!await salvarComandaAtual()){ c.desconto = anterior; recalcularComanda(c); renderItensComanda(); return; }
    renderFinanceiro();
    if(!comandaNova) showToast(novo ? `Desconto de ${textoDesconto(novo)} aplicado. Total: ${fmtMoeda(c.valor)}.` : 'Desconto removido.');
  }
  document.getElementById('btnComandaAplicarDesconto').addEventListener('click', aplicarDescontoComanda);
  document.getElementById('comandaDescontoValor').addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); aplicarDescontoComanda(); } });

  document.getElementById('comandaCliente').addEventListener('change', async (e) => {
    if(!comandaAtual) return;
    comandaAtual.cliente = e.target.value.trim() || comandaAtual.cliente;
    const p = (patients || []).find(x => semAcento(x.name) === semAcento(comandaAtual.cliente));
    if(p) comandaAtual.pacienteId = p.id;
    await salvarComandaAtual();
  });
  document.getElementById('comandaData').addEventListener('change', async (e) => {
    if(!comandaAtual || !e.target.value) return;
    comandaAtual.dataISO = e.target.value;
    await salvarComandaAtual();
  });
  document.getElementById('comandaItemNome').addEventListener('input', (e) => {
    const preco = precoDoServico(e.target.value);
    if(preco != null) document.getElementById('comandaItemValor').value = valorParaCampo(preco);
  });
  async function adicionarItemComanda(){
    const nomeEl = document.getElementById('comandaItemNome'), valEl = document.getElementById('comandaItemValor');
    const nome = nomeEl.value.trim();
    if(!nome){ nomeEl.focus(); return; }
    const preco = valEl.value.trim() ? lerValor(valEl.value) : (precoDoServico(nome) || 0);
    const ehServico = !pacoteDoNomeItem(nome) && precoDoServico(nome) != null; // pacote entra como item extra
    comandaAtual.itens.push({ nome, preco, origem: ehServico ? 'servico' : 'extra' });
    nomeEl.value = ''; valEl.value = '';
    await salvarComandaAtual();
    nomeEl.focus();
  }
  document.getElementById('btnComandaAddItem').addEventListener('click', adicionarItemComanda);
  ['comandaItemNome', 'comandaItemValor'].forEach(id => document.getElementById(id).addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); adicionarItemComanda(); }
  }));

  // Nova comanda: cria no banco e passa para o modo "ver/pagar".
  document.getElementById('btnComandaSalvar').addEventListener('click', async () => {
    const c = comandaAtual;
    if(!c || !comandaNova) return;
    c.cliente = document.getElementById('comandaCliente').value.trim();
    c.dataISO = document.getElementById('comandaData').value || hojeISO();
    if(!c.cliente){ showToast('Informe a cliente.'); document.getElementById('comandaCliente').focus(); return; }
    if(!c.itens.length){ showToast('Adicione pelo menos um item.'); document.getElementById('comandaItemNome').focus(); return; }
    const p = (patients || []).find(x => semAcento(x.name) === semAcento(c.cliente));
    if(p) c.pacienteId = p.id;
    c.codigo = proximoCodigoComanda();
    recalcularComanda(c);
    const btn = document.getElementById('btnComandaSalvar');
    btn.disabled = true;
    const salvo = await finInserir('comandas', comandaParaBanco(c));
    btn.disabled = false;
    if(!salvo) return;
    c.id = salvo.id;
    comandasData.unshift(c);
    comandaNova = false;
    montarJanelaComanda();
    renderComandas();
    showToast(`Comanda ${c.codigo} criada. Registre o pagamento quando receber.`);
  });

  // Registrar pagamento: vira uma receita no Controle Financeiro.
  document.getElementById('btnComandaPagar').addEventListener('click', async () => {
    const c = comandaAtual;
    if(!c) return;
    const valor = lerValor(document.getElementById('comandaPagValor').value);
    const forma = document.getElementById('comandaPagForma').value;
    const data = document.getElementById('comandaPagData').value || hojeISO();
    if(valor <= 0){ showToast('Informe o valor recebido.'); return; }
    if(valor > c.saldo + 0.001){ showToast(`O valor passa do saldo da comanda (${fmtMoeda(c.saldo)}).`); return; }
    if(!forma){ showToast('Escolha a forma de pagamento (cadastre em Formas de Pagamento).'); return; }
    const btn = document.getElementById('btnComandaPagar');
    btn.disabled = true;
    try{
      const mov = await finInserir('movimentos_financeiros', {
        data, descricao: `Comanda ${c.codigo} — ${c.cliente}`, categoria: 'Atendimento', valor, tipo: 'receita',
        pago: true, forma, comanda_id: ehIdDoBanco(c.id) ? c.id : null, moeda: moedaPreferidaAtual(),
      });
      if(!mov) return;
      const pag = { id: idLocal(), data, forma, valor, movimentoId: mov.id };
      c.pagamentos.push(pag);
      recalcularComanda(c);
      const ok = await finAtualizar('comandas', c.id, comandaParaBanco(c));
      if(!ok){ // desfaz para não ficar receita sem comanda
        c.pagamentos.pop(); recalcularComanda(c);
        await finApagar('movimentos_financeiros', mov.id);
        return;
      }
      controleData.unshift(movimentoDoBanco(mov));
      document.getElementById('comandaPagData').value = '';
      renderItensComanda();
      renderFinanceiro();
      showToast(c.status === 'Fechada' ? `Pagamento registrado — comanda ${c.codigo} fechada!` : `Pagamento registrado. Falta ${fmtMoeda(c.saldo)}.`);
    } finally { btn.disabled = false; }
  });

  async function desfazerPagamento(p){
    const c = comandaAtual;
    if(!c) return;
    if(!confirm(`Desfazer o pagamento de ${fmtMoeda(p.valor)} (${p.forma}, ${isoParaBR(p.data)})?\n\nEle também sai do Controle Financeiro.`)) return;
    if(p.movimentoId && !await finApagar('movimentos_financeiros', p.movimentoId)) return;
    c.pagamentos = c.pagamentos.filter(x => x !== p);
    recalcularComanda(c);
    await finAtualizar('comandas', c.id, comandaParaBanco(c));
    controleData = controleData.filter(m => m.id !== p.movimentoId);
    renderItensComanda();
    renderFinanceiro();
    showToast('Pagamento desfeito.');
  }

  document.getElementById('btnComandaExcluir').addEventListener('click', async () => {
    if(!comandaAtual || comandaNova) return;
    if(await apagarComanda(comandaAtual)) fecharComanda();
  });

  /* ---------- Comandas geradas automaticamente pela agenda ----------
     Agendou → cria comanda "Em Aberto" · editou → atualiza os serviços (se ainda em aberto)
     cancelou → comanda "Inativa" · excluiu/desmarcou → comanda apagada. */
  let avisoComandaSemTabela = false;
  function avisarComandaNaoSalva(error){
    console.warn('Comanda não salva:', error && error.message);
    if(avisoComandaSemTabela) return;
    avisoComandaSemTabela = true;
    showToast('Atendimento salvo, mas a comanda não foi criada (' + String(error && error.message || '').slice(0, 70) + '). Rode os arquivos SQL do Financeiro no Supabase.');
  }
  function itensDaComanda(servicoNome){
    return String(servicoNome || '').split(',').map(t => t.trim()).filter(Boolean).map(nome => ({ nome, preco: precoDoServico(nome) || 0, origem: 'servico' }));
  }
  function moedaDaComanda(){ return moedaPreferidaAtual(); }
  function proximoCodigoComanda(){
    const max = comandasData.reduce((m, c) => Math.max(m, parseInt(String(c.codigo || '').replace(/\D/g, ''), 10) || 0), 0);
    return '#' + String(max + 1).padStart(4, '0');
  }
  function comandaDoAgendamento(agendamentoId){
    return comandasData.find(c => c.agendamentoId != null && String(c.agendamentoId) === String(agendamentoId));
  }

  async function criarComandaDoAgendamento({ agendamentoId, key, pacienteId, cliente, servicoNome }){
    const nova = recalcularComanda({
      id: null, codigo: proximoCodigoComanda(), dataISO: key, cliente: cliente || 'Paciente sem nome',
      itens: itensDaComanda(servicoNome), pagamentos: [], status: 'Em Aberto',
      agendamentoId, pacienteId, moeda: moedaPreferidaAtual(),
    });
    if(!modoDemonstracao && isAgendamentoReal({ id: agendamentoId })){
      const user = await getUsuarioLogado().catch(() => null);
      if(!user) return null;
      const { data, error } = await supabaseClient.from('comandas').insert({ ...comandaParaBanco(nova), profissional_id: user.id }).select().single();
      if(error){ avisarComandaNaoSalva(error); return null; }
      nova.id = data.id;
    } else {
      nova.id = idLocal();
    }
    comandasData.unshift(nova);
    renderComandas();
    return nova;
  }

  // Cria as comandas que faltam para os atendimentos que já estão na agenda
  // (marcados antes das comandas existirem, ou pelo link de agendamento).
  var comandasCarregadasOk = false, agendaCarregadaOk = false, garantindoComandas = null;
  function garantirComandasDaAgenda(){
    if(garantindoComandas) return garantindoComandas;
    garantindoComandas = (async () => {
      if(modoDemonstracao || !comandasCarregadasOk || !agendaCarregadaOk) return 0;
      const user = await getUsuarioLogado().catch(() => null);
      if(!user) return 0;
      const faltando = [];
      Object.keys(appointments).forEach(k => (appointments[k] || []).forEach(a => {
        if(a.type === 'appt' && isAgendamentoReal(a) && !comandaDoAgendamento(a.id)) faltando.push({ key: k, a });
      }));
      if(!faltando.length) return 0;
      faltando.sort((x, y) => (x.key + x.a.time).localeCompare(y.key + y.a.time));
      let proximo = parseInt(proximoCodigoComanda().replace(/\D/g, ''), 10);
      const novas = faltando.map(({ key, a }) => recalcularComanda({
        id: null, codigo: '#' + String(proximo++).padStart(4, '0'), dataISO: key, cliente: a.label || 'Paciente sem nome',
        itens: itensDaComanda(a.servico), pagamentos: [], status: 'Em Aberto', agendamentoId: a.id,
        pacienteId: a.pacienteId, moeda: moedaPreferidaAtual(),
      }));
      const { data, error } = await supabaseClient.from('comandas').insert(novas.map(c => ({ ...comandaParaBanco(c), profissional_id: user.id }))).select();
      if(error){
        console.warn('Comandas da agenda não criadas:', error.message);
        if(/duplicate|unique/i.test(error.message || '')) await loadComandasFromSupabase(); // outra aba já criou
        else avisarComandaNaoSalva(error);
        return 0;
      }
      (data || []).forEach(r => comandasData.push(comandaDoBanco(r)));
      renderComandas();
      showToast(`${novas.length} comanda${novas.length > 1 ? 's criadas' : ' criada'} para atendimentos que já estavam na agenda.`);
      return novas.length;
    })().catch(e => { console.warn('Comandas da agenda:', e); return 0; })
       .finally(() => { garantindoComandas = null; });
    return garantindoComandas;
  }

  // Atendimento editado: troca os serviços (mantém produtos/itens extras e pagamentos).
  async function atualizarComandaDoAgendamento(agendamentoId, { key, pacienteId, cliente, servicoNome }){
    const c = comandaDoAgendamento(agendamentoId);
    if(!c || c.status === 'Inativa') return;
    if(c.status === 'Fechada' && c.saldo <= 0){
      // comanda já paga: só acompanha data e cliente
      Object.assign(c, { dataISO: key, cliente, pacienteId });
    } else {
      const extras = c.itens.filter(i => i.origem === 'extra');
      Object.assign(c, { dataISO: key, cliente, pacienteId, itens: itensDaComanda(servicoNome).concat(extras) });
    }
    recalcularComanda(c);
    if(!modoDemonstracao && ehIdDoBanco(c.id)){
      const { error } = await supabaseClient.from('comandas').update(comandaParaBanco(c)).eq('id', c.id);
      if(error){ console.warn('Comanda não atualizada:', error.message); return; }
    }
    renderComandas();
  }

  async function inativarComandaDoAgendamento(agendamentoId){
    const c = comandaDoAgendamento(agendamentoId);
    if(!modoDemonstracao && isAgendamentoReal({ id: agendamentoId })){
      const { error } = await supabaseClient.from('comandas').update({ status: 'Inativa' }).eq('agendamento_id', agendamentoId);
      if(error) console.warn('Comanda não inativada:', error.message);
    }
    if(c){ c.status = 'Inativa'; renderComandas(); }
  }

  async function apagarComandaDoAgendamento(agendamentoId){
    const c = comandaDoAgendamento(agendamentoId);
    if(c) return apagarComanda(c, true);
    if(!modoDemonstracao && isAgendamentoReal({ id: agendamentoId })){
      const { error } = await supabaseClient.from('comandas').delete().eq('agendamento_id', agendamentoId);
      if(error) console.warn('Comanda não apagada:', error.message);
    }
  }

  /* ---------- Helpers de data (Supabase 'YYYY-MM-DD' <-> exibição 'DD/MM/YYYY') ---------- */
  function dataDbParaExibicao(iso){
    if(!iso) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  async function getUsuarioLogado(){
    const { data: userData } = await supabaseClient.auth.getUser();
    return (userData && userData.user) ? userData.user : null;
  }

  /* ---------- Modo demonstração x conta real ----------
     Antes, se a checagem de login falhasse (sessão expirada ou internet oscilando), o app
     achava que estava no modo demonstração e salvava só na memória da tela — e o dado sumia
     ao recarregar. Agora o modo demonstração só existe quando a pessoa escolhe entrar nele. */
  var modoDemonstracao = false;

  // Devolve o usuário logado; se a sessão caiu numa conta real, avisa e devolve null.
  async function usuarioParaSalvar(){
    if(modoDemonstracao) return null;
    let user = null;
    try{ user = await getUsuarioLogado(); }catch(e){}
    if(!user){
      // sem resposta do servidor: tenta a sessão guardada no navegador
      try{
        const { data } = await supabaseClient.auth.getSession();
        if(data && data.session && data.session.user) user = data.session.user;
      }catch(e){}
    }
    if(!user) avisarSessaoExpirada();
    return user;
  }

  function avisarSessaoExpirada(){
    showToast('Sua sessão expirou e NADA foi salvo. Entre de novo na sua conta e repita a ação.');
    setTimeout(() => {
      if(confirm('Sua sessão expirou. Para não perder nada, é preciso entrar de novo. Ir para a tela de login agora?')){
        supabaseClient.auth.signOut().finally(() => {
          document.getElementById('appRoot').style.display = 'none';
          document.getElementById('authScreen').style.display = 'flex';
        });
      }
    }, 300);
  }

  /* ---------- Configurações que precisam sobreviver a recarregar a página ----------
     Expedientes, profissionais, categorias, pacotes e anotações/favoritos de ativos
     antes ficavam só na memória do navegador e sumiam ao recarregar ou trocar de versão.
     Agora são salvos na tabela "configuracoes_profissional" do Supabase (uma linha por
     tipo de configuração), com uma cópia de segurança no próprio navegador. */
  var avisoConfigSemTabela = false;
  function chaveLocalConfig(userId, chave){ return 'skinExpertCfg:' + userId + ':' + chave; }

  async function salvarConfig(chave, valor){
    if(modoDemonstracao) return true; // modo demonstração: não salva nada
    const user = await usuarioParaSalvar();
    if(!user) return false;
    try{ localStorage.setItem(chaveLocalConfig(user.id, chave), JSON.stringify(valor)); }catch(e){}
    const { error } = await supabaseClient.from('configuracoes_profissional').upsert({
      profissional_id: user.id, chave, valor, updated_at: new Date().toISOString(),
    }, { onConflict: 'profissional_id,chave' });
    if(error){
      console.warn('Não foi possível salvar "' + chave + '" no Supabase:', error.message);
      if(!avisoConfigSemTabela){
        avisoConfigSemTabela = true;
        showToast('Salvo só neste navegador. Crie a tabela configuracoes_profissional no Supabase para salvar na nuvem.');
      }
      return false;
    }
    return true;
  }

  async function lerConfig(chave){
    const user = await getUsuarioLogado();
    if(!user) return null;
    try{
      const { data, error } = await supabaseClient.from('configuracoes_profissional')
        .select('valor').eq('profissional_id', user.id).eq('chave', chave).maybeSingle();
      if(!error && data && data.valor != null) return data.valor;
    }catch(e){}
    try{
      const local = localStorage.getItem(chaveLocalConfig(user.id, chave));
      if(local) return JSON.parse(local);
    }catch(e){}
    return null;
  }

  function substituirConteudo(lista, novos){
    if(Array.isArray(novos)) lista.splice(0, lista.length, ...novos);
  }

  function anotacoesAtivosParaSalvar(){
    const mapa = {};
    ativosData.forEach(a => {
      if(a.favorito || (a.anotacao && a.anotacao.trim())) mapa[a.id] = { favorito: !!a.favorito, anotacao: a.anotacao || '' };
    });
    return mapa;
  }

  async function carregarConfiguracoesSalvas(){
    const user = await getUsuarioLogado();
    if(!user) return;
    const [exp, profs, cats, pacs, ativosNotas, lembs] = await Promise.all([
      lerConfig('expedientes'), lerConfig('profissionais'), lerConfig('categorias'),
      lerConfig('pacotes'), lerConfig('ativos_anotacoes'), lerConfig('lembretes'),
    ]);
    const tema = await lerConfig('tema');
    if(typeof tema === 'string' && tema) aplicarTema(tema);
    try{ await carregarAreasAtuacao(); }catch(e){ console.warn('Áreas de atuação:', e); }
    const [moedaSalva, formasSalvas, modelosSalvos, historicoSalvo] = await Promise.all([lerConfig('moeda'), lerConfig('formas_pagamento'), lerConfig('mensagens_modelos'), lerConfig('mensagens_historico')]);
    if(modelosSalvos && typeof modelosSalvos === 'object'){
      mensagensModelos = { textos: modelosSalvos.textos || {}, titulos: modelosSalvos.titulos || {}, extras: Array.isArray(modelosSalvos.extras) ? modelosSalvos.extras : [] };
    }
    if(Array.isArray(historicoSalvo)) mensagensHistorico = historicoSalvo;
    try{ renderCentroMensagens(); renderLembretes(); renderAniversariantes(); }catch(e){}
    if(typeof moedaSalva === 'string'){
      try{ localStorage.setItem('skinExpertMoeda', moedaSalva); }catch(e){}
      const selM = document.getElementById('cfgMoeda'); if(selM) selM.value = moedaSalva;
    }
    if(Array.isArray(formasSalvas) && formasSalvas.length) formasPagamento = formasSalvas.filter(f => f && f.nome).map(f => ({ nome: String(f.nome), ativa: f.ativa !== false }));
    const pais = await lerConfig('pais_atuacao');
    if(typeof pais === 'string' && pais){
      try{ localStorage.setItem('skinExpertPaisAtuacao', pais); }catch(e){}
      const sel = document.getElementById('cfgPaisAtuacao');
      if(sel) sel.value = pais;
      try{ renderCatalogo(); }catch(e){}
    }
    if(lembs && typeof lembs === 'object'){
      lembretesEstado.manuais = Array.isArray(lembs.manuais) ? lembs.manuais : [];
      lembretesEstado.dispensados = (lembs.dispensados && typeof lembs.dispensados === 'object') ? lembs.dispensados : {};
      try{ renderLembretes(); }catch(e){}
    }
    if(exp && exp.length){ substituirConteudo(expedientesData, exp); renderExpedientes(); }
    if(profs && profs.length){ substituirConteudo(profissionaisData, profs); atualizarProfissionalPrincipal(); renderProfissionais(); }
    if(cats && cats.length){ substituirConteudo(categoriasData, cats); renderCategorias(); renderServicos(); }
    if(pacs){ substituirConteudo(pacotesData, pacs); renderPacotes(); }
    if(ativosNotas && typeof ativosNotas === 'object'){
      ativosData.forEach(a => {
        const n = ativosNotas[a.id];
        if(n){ a.favorito = !!n.favorito; a.anotacao = n.anotacao || ''; }
      });
      try{ renderAll(); }catch(e){}
    }
    aplicarMoedaNoApp();
  }

  // Redesenha o que mostra dinheiro depois que a moeda muda (Financeiro, pacotes).
  function aplicarMoedaNoApp(){
    try{ renderFinanceiro(); }catch(e){ console.warn(e); }
    try{ renderPacotes(); }catch(e){}
  }

  /* ---------- Carrega Comandas do Supabase ---------- */
  async function loadComandasFromSupabase(){
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const { data, error } = await supabaseClient.from('comandas').select('*').eq('profissional_id', user.id).order('data', { ascending:false });
      // Conta real: nunca mostrar as comandas de exemplo ("Paciente Teste"), mesmo sem nenhuma comanda ainda.
      if(error){ console.warn('Comandas:', error.message); comandasData = []; renderComandas(); return; }
      comandasData = (data || []).map(comandaDoBanco);
      comandasCarregadasOk = true;
      renderComandas();
    } catch(e){ console.warn('Comandas:', e); }
  }

  /* ================= CONTROLE FINANCEIRO (livro-caixa) ================= */
  // Formato: { id, dataISO, descricao, categoria, valor (sempre positivo), tipo:'receita'|'despesa', pago, forma, comandaId, contaId }
  function movimentoDoBanco(m){
    return {
      id: m.id, dataISO: m.data ? String(m.data).slice(0, 10) : '', descricao: m.descricao || '—',
      categoria: m.categoria || 'Outros', valor: Math.abs(parseFloat(m.valor) || 0),
      tipo: m.tipo === 'despesa' ? 'despesa' : 'receita', pago: !!m.pago, forma: m.forma || '',
      comandaId: m.comanda_id || null, contaId: m.conta_id || null,
    };
  }
  function movimentoParaBanco(m){
    return { data: m.dataISO, descricao: m.descricao, categoria: m.categoria, valor: m.valor, tipo: m.tipo,
             pago: m.pago, forma: m.forma || null, moeda: moedaPreferidaAtual() };
  }
  let controleData = [
    { id: idLocal(), dataISO: '2026-08-13', descricao: 'Comanda #0001 — Paciente Teste 1', categoria: 'Atendimento', valor: 280, tipo: 'receita', pago: true, forma: 'Cartão de Crédito' },
    { id: idLocal(), dataISO: '2026-08-12', descricao: 'Comanda #0003 — Paciente Teste 3', categoria: 'Atendimento', valor: 420, tipo: 'receita', pago: true, forma: 'Pix' },
    { id: idLocal(), dataISO: '2026-08-11', descricao: 'Comanda #0004 — Paciente Teste 5', categoria: 'Atendimento', valor: 99.9, tipo: 'receita', pago: true, forma: 'Dinheiro' },
    { id: idLocal(), dataISO: '2026-08-10', descricao: 'Compra de insumos', categoria: 'Estoque / Insumos', valor: 320, tipo: 'despesa', pago: true, forma: 'Pix' },
    { id: idLocal(), dataISO: '2026-08-08', descricao: 'Assinatura Skin Expert Pro', categoria: 'Assinaturas', valor: 97, tipo: 'despesa', pago: true, forma: 'Cartão de Crédito' },
  ];

  function controleFiltrado(){
    const de = document.getElementById('controleDateFrom').value;
    const ate = document.getElementById('controleDateTo').value;
    const tipo = document.getElementById('controleFiltroTipo').value;
    const cat = document.getElementById('controleFiltroCategoria').value;
    const st = document.getElementById('controleFiltroStatus').value;
    return controleData.filter(m => {
      if(de && m.dataISO < de) return false;
      if(ate && m.dataISO > ate) return false;
      if(tipo && m.tipo !== tipo) return false;
      if(cat && m.categoria !== cat) return false;
      if(st === 'pago' && !m.pago) return false;
      if(st === 'pendente' && m.pago) return false;
      return true;
    }).sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
  }

  function renderControleFinanceiro(){
    const body = document.getElementById('controleBody');
    if(!body) return;
    // categorias do filtro (mantém a escolhida)
    const selCat = document.getElementById('controleFiltroCategoria');
    const escolhida = selCat.value;
    const cats = [...new Set(controleData.map(m => m.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    selCat.innerHTML = '<option value="">Categoria: Todas</option>' + cats.map(c => `<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    selCat.value = cats.includes(escolhida) ? escolhida : '';

    const lista = controleFiltrado();
    let receitas = 0, despesas = 0, pendentes = 0;
    lista.forEach(m => {
      if(!m.pago){ pendentes++; return; }
      if(m.tipo === 'receita') receitas += m.valor; else despesas += m.valor;
    });
    document.getElementById('sumReceitas').textContent = fmtMoeda(receitas);
    document.getElementById('sumDespesas').textContent = fmtMoeda(despesas);
    document.getElementById('sumSaldo').textContent = fmtMoeda(receitas - despesas);
    document.getElementById('sumPendentes').textContent = String(pendentes);
    document.getElementById('sumTransacoes').textContent = `de ${lista.length} lançamento${lista.length === 1 ? '' : 's'} no período`;

    body.innerHTML = '';
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="7" class="fin-vazio">${controleData.length ? 'Nenhum lançamento com esses filtros.' : 'Nenhum lançamento ainda. Pagamentos de comandas e contas pagas aparecem aqui — ou use "Novo Lançamento".'}</td></tr>`;
      return;
    }
    lista.forEach(m => {
      const tr = document.createElement('tr');
      const deComanda = !!m.comandaId, deConta = !!m.contaId;
      if(!deComanda && !deConta) tr.className = 'clicavel';
      tr.innerHTML = `
        <td>${isoParaBR(m.dataISO)}</td>
        <td>${escHTML(m.descricao)}${deComanda ? '<span class="fin-origem">comanda</span>' : deConta ? '<span class="fin-origem">conta</span>' : ''}</td>
        <td><span class="category-chip">${escHTML(m.categoria)}</span></td>
        <td>${escHTML(m.forma || '—')}</td>
        <td class="num"><span class="${m.tipo === 'receita' ? 'fin-valor-in' : 'fin-valor-out'}">${m.tipo === 'receita' ? '+ ' : '– '}${fmtMoeda(m.valor)}</span></td>
        <td>${m.pago ? '<span class="status-active">Pago</span>' : '<span class="pill pill-gray">Pendente</span>'}</td>
        <td><div class="fin-acoes"></div></td>`;
      const acoes = tr.querySelector('.fin-acoes');
      if(deComanda){
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fin-btn-mini'; b.textContent = 'Abrir comanda';
        b.addEventListener('click', (e) => { e.stopPropagation(); const c = comandasData.find(x => x.id === m.comandaId); if(c) abrirComanda(c); else showToast('Comanda não encontrada (pode ter sido apagada).'); });
        acoes.appendChild(b);
      } else if(deConta){
        acoes.innerHTML = '<span class="fin-dica" title="Altere na aba Contas a Pagar/Receber">pela aba Contas</span>';
      } else {
        const bPago = document.createElement('button'); bPago.type = 'button'; bPago.className = 'fin-btn-mini' + (m.pago ? '' : ' ok');
        bPago.textContent = m.pago ? 'Marcar pendente' : 'Marcar pago';
        bPago.addEventListener('click', async (e) => {
          e.stopPropagation();
          if(await finAtualizar('movimentos_financeiros', m.id, { pago: !m.pago })){ m.pago = !m.pago; renderControleFinanceiro(); }
        });
        const bDel = document.createElement('button'); bDel.type = 'button'; bDel.className = 'comanda-apagar'; bDel.title = 'Apagar lançamento';
        bDel.setAttribute('aria-label', 'Apagar lançamento'); bDel.innerHTML = ICONE_LIXEIRA;
        bDel.addEventListener('click', async (e) => {
          e.stopPropagation();
          if(!confirm(`Apagar o lançamento "${m.descricao}" (${fmtMoeda(m.valor)})?`)) return;
          if(await finApagar('movimentos_financeiros', m.id)){ controleData = controleData.filter(x => x !== m); renderControleFinanceiro(); showToast('Lançamento apagado.'); }
        });
        acoes.append(bPago, bDel);
        tr.addEventListener('click', () => abrirLancamento(m));
      }
      body.appendChild(tr);
    });
  }
  ['controleDateFrom', 'controleDateTo', 'controleFiltroTipo', 'controleFiltroCategoria', 'controleFiltroStatus'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderControleFinanceiro);
  });

  /* ---------- Carrega Controle Financeiro do Supabase ---------- */
  async function loadMovimentosFromSupabase(){
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const { data, error } = await supabaseClient.from('movimentos_financeiros').select('*').eq('profissional_id', user.id).order('data', { ascending:false });
      // Conta real: nunca mostrar os lançamentos de exemplo.
      if(error){ console.warn('Controle financeiro:', error.message); controleData = []; renderControleFinanceiro(); return; }
      controleData = (data || []).map(movimentoDoBanco);
      renderControleFinanceiro();
    } catch(e){ console.warn('Controle financeiro:', e); }
  }

  document.getElementById('btnSalvarCsv').addEventListener('click', () => {
    const lista = controleFiltrado();
    if(!lista.length){ showToast('Nada para exportar com esses filtros.'); return; }
    const header = ['Data', 'Descrição', 'Categoria', 'Forma de pagamento', 'Tipo', `Valor (${simboloMoeda()})`, 'Situação'];
    const rows = lista.map(t => [
      isoParaBR(t.dataISO), t.descricao, t.categoria, t.forma || '', t.tipo === 'receita' ? 'Receita' : 'Despesa',
      (t.tipo === 'receita' ? '' : '-') + t.valor.toFixed(2).replace('.', ','), t.pago ? 'Pago' : 'Pendente',
    ]);
    const csvContent = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'extrato-financeiro.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Extrato exportado em CSV!');
  });

  /* ---------- Novo lançamento / editar lançamento ---------- */
  const modalLancOverlay = document.getElementById('modalLancOverlay');
  let lancTipo = 'receita', lancEditando = null;
  function definirTipoLanc(tipo){
    lancTipo = tipo;
    document.querySelectorAll('#modalLancOverlay .fin-tipo-btn').forEach(b => {
      b.classList.toggle('ativo', b.dataset.tipo === tipo);
      b.setAttribute('aria-checked', b.dataset.tipo === tipo ? 'true' : 'false');
    });
  }
  document.querySelectorAll('#modalLancOverlay .fin-tipo-btn').forEach(b => b.addEventListener('click', () => definirTipoLanc(b.dataset.tipo)));
  function abrirLancamento(m){
    lancEditando = m || null;
    atualizarSugestoesFin();
    document.getElementById('modalLancTitle').textContent = m ? 'Editar Lançamento' : 'Novo Lançamento';
    definirTipoLanc(m ? m.tipo : 'receita');
    document.getElementById('lancDescricao').value = m ? m.descricao : '';
    document.getElementById('lancData').value = m ? m.dataISO : hojeISO();
    document.getElementById('lancValor').value = m ? valorParaCampo(m.valor) : '';
    document.getElementById('lancCategoria').value = m ? m.categoria : '';
    preencherSelectFormas(document.getElementById('lancForma'), m ? m.forma : '', 'Selecione');
    document.getElementById('lancPago').checked = m ? m.pago : true;
    modalLancOverlay.classList.add('open');
    setTimeout(() => { if(!modalLancOverlay.contains(document.activeElement)) document.getElementById('lancDescricao').focus(); }, 50);
  }
  function fecharLancamento(){ modalLancOverlay.classList.remove('open'); lancEditando = null; }
  document.getElementById('btnNovoLancamento').addEventListener('click', () => abrirLancamento(null));
  document.getElementById('modalLancCancel').addEventListener('click', fecharLancamento);
  modalLancOverlay.addEventListener('click', (e) => { if(e.target === modalLancOverlay) fecharLancamento(); });
  document.getElementById('modalLancConfirm').addEventListener('click', async () => {
    const m = {
      dataISO: document.getElementById('lancData').value || hojeISO(),
      descricao: document.getElementById('lancDescricao').value.trim(),
      categoria: document.getElementById('lancCategoria').value.trim() || 'Outros',
      valor: lerValor(document.getElementById('lancValor').value),
      tipo: lancTipo, pago: document.getElementById('lancPago').checked,
      forma: document.getElementById('lancForma').value,
    };
    if(!m.descricao){ showToast('Escreva uma descrição.'); document.getElementById('lancDescricao').focus(); return; }
    if(m.valor <= 0){ showToast('Informe o valor.'); document.getElementById('lancValor').focus(); return; }
    const btn = document.getElementById('modalLancConfirm');
    btn.disabled = true;
    try{
      if(lancEditando){
        if(!await finAtualizar('movimentos_financeiros', lancEditando.id, movimentoParaBanco(m))) return;
        Object.assign(lancEditando, m);
      } else {
        const salvo = await finInserir('movimentos_financeiros', movimentoParaBanco(m));
        if(!salvo) return;
        controleData.unshift(movimentoDoBanco({ ...salvo, data: m.dataISO }));
      }
    } finally { btn.disabled = false; }
    const editou = !!lancEditando;
    fecharLancamento();
    renderControleFinanceiro();
    showToast(editou ? 'Lançamento atualizado!' : (m.tipo === 'receita' ? 'Receita lançada!' : 'Despesa lançada!'));
  });

  /* ================= CONTAS A PAGAR / RECEBER ================= */
  // Formato: { id, vencISO, categoria, descricao, valor, tipo:'pagar'|'receber', forma, recorrencia:'Não'|'Mensal', pago, pagoEm }
  function contaDoBanco(c){
    return {
      id: c.id, vencISO: c.vencimento ? String(c.vencimento).slice(0, 10) : '', categoria: c.categoria || 'Outros',
      descricao: c.descricao || '—', valor: Math.abs(parseFloat(c.valor) || 0), tipo: c.tipo === 'receber' ? 'receber' : 'pagar',
      forma: c.forma && c.forma !== '—' ? c.forma : '', recorrencia: c.recorrencia === 'Mensal' ? 'Mensal' : 'Não',
      pago: !!c.pago, pagoEm: c.pago_em || null,
    };
  }
  function contaParaBanco(c){
    return { vencimento: c.vencISO, categoria: c.categoria, descricao: c.descricao, valor: c.valor, tipo: c.tipo,
             forma: c.forma || null, recorrencia: c.recorrencia, pago: c.pago, pago_em: c.pagoEm || null, moeda: moedaPreferidaAtual() };
  }
  let contasData = [
    { id: idLocal(), vencISO: '2026-08-15', categoria: 'Aluguel', descricao: 'Aluguel da sala', valor: 1200, tipo: 'pagar', forma: '', recorrencia: 'Mensal', pago: false },
    { id: idLocal(), vencISO: '2026-08-10', categoria: 'Estoque / Insumos', descricao: 'Compra de insumos', valor: 680, tipo: 'pagar', forma: 'Pix', recorrencia: 'Não', pago: true, pagoEm: '2026-08-10' },
    { id: idLocal(), vencISO: '2026-08-20', categoria: 'Atendimento', descricao: 'Pacote de 5 sessões — Paciente Teste 2 (2ª parcela)', valor: 250, tipo: 'receber', forma: 'Pix', recorrencia: 'Não', pago: false },
  ];

  function contasFiltradas(){
    const de = document.getElementById('contasDateFrom').value;
    const ate = document.getElementById('contasDateTo').value;
    const tipo = document.getElementById('contasFiltroTipo').value;
    const st = document.getElementById('contasFiltroStatus').value;
    return contasData.filter(c => {
      if(de && c.vencISO < de) return false;
      if(ate && c.vencISO > ate) return false;
      if(tipo && c.tipo !== tipo) return false;
      if(st === 'pago' && !c.pago) return false;
      if(st === 'pendente' && c.pago) return false;
      return true;
    }).sort((a, b) => {
      if(a.pago !== b.pago) return a.pago ? 1 : -1;                    // pendentes primeiro
      return a.pago ? (b.vencISO || '').localeCompare(a.vencISO || '')   // pagas: mais recentes
                    : (a.vencISO || '').localeCompare(b.vencISO || ''); // pendentes: vencimento mais próximo
    });
  }

  function renderContas(){
    const body = document.getElementById('contasBody');
    if(!body) return;
    const lista = contasFiltradas();
    let aPagar = 0, pagas = 0, aReceber = 0, recebidas = 0;
    lista.forEach(c => {
      if(c.tipo === 'pagar'){ if(c.pago) pagas += c.valor; else aPagar += c.valor; }
      else { if(c.pago) recebidas += c.valor; else aReceber += c.valor; }
    });
    document.getElementById('sumContasPagar').textContent = fmtMoeda(aPagar);
    document.getElementById('sumContasPagas').textContent = fmtMoeda(pagas);
    document.getElementById('sumContasReceber').textContent = fmtMoeda(aReceber);
    document.getElementById('sumContasRecebidas').textContent = fmtMoeda(recebidas);

    body.innerHTML = '';
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="9" class="fin-vazio">${contasData.length ? 'Nenhuma conta com esses filtros.' : 'Nenhuma conta ainda. Use os botões acima para adicionar contas a pagar ou a receber.'}</td></tr>`;
      return;
    }
    const hoje = hojeISO();
    lista.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      const vencida = !c.pago && c.vencISO && c.vencISO < hoje;
      const situacao = c.pago
        ? `<span class="status-active">${c.tipo === 'pagar' ? 'Paga' : 'Recebida'}</span>`
        : vencida ? '<span class="pill" style="background:#fbe9e4;color:var(--block-red);">Vencida</span>' : '<span class="pill pill-gray">Pendente</span>';
      tr.innerHTML = `
        <td>${isoParaBR(c.vencISO)}</td>
        <td>${c.tipo === 'pagar' ? 'A pagar' : 'A receber'}</td>
        <td><span class="category-chip">${escHTML(c.categoria)}</span></td>
        <td>${escHTML(c.descricao)}</td>
        <td class="num"><span class="${c.tipo === 'receber' ? 'fin-valor-in' : 'fin-valor-out'}">${c.tipo === 'receber' ? '+ ' : '– '}${fmtMoeda(c.valor)}</span></td>
        <td>${escHTML(c.forma || '—')}</td>
        <td>${c.recorrencia === 'Mensal' ? 'Mensal' : 'Não'}</td>
        <td>${situacao}</td>
        <td><div class="fin-acoes"></div></td>`;
      const acoes = tr.querySelector('.fin-acoes');
      const bPago = document.createElement('button'); bPago.type = 'button'; bPago.className = 'fin-btn-mini' + (c.pago ? '' : ' ok');
      bPago.textContent = c.pago ? 'Desfazer' : (c.tipo === 'pagar' ? 'Marcar paga' : 'Marcar recebida');
      bPago.addEventListener('click', (e) => { e.stopPropagation(); c.pago ? desmarcarContaPaga(c) : marcarContaPaga(c); });
      const bDel = document.createElement('button'); bDel.type = 'button'; bDel.className = 'comanda-apagar'; bDel.title = 'Apagar conta';
      bDel.setAttribute('aria-label', 'Apagar conta'); bDel.innerHTML = ICONE_LIXEIRA;
      bDel.addEventListener('click', (e) => { e.stopPropagation(); apagarConta(c); });
      acoes.append(bPago, bDel);
      tr.addEventListener('click', () => openContaModal(c.tipo, c));
      body.appendChild(tr);
    });
  }
  ['contasDateFrom', 'contasDateTo', 'contasFiltroTipo', 'contasFiltroStatus'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderContas);
  });

  /* ---------- Carrega Contas a Pagar/Receber do Supabase ---------- */
  async function loadContasFromSupabase(){
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const { data, error } = await supabaseClient.from('contas_financeiras').select('*').eq('profissional_id', user.id).order('vencimento', { ascending:false });
      // Conta real: nunca mostrar as contas de exemplo.
      if(error){ console.warn('Contas:', error.message); contasData = []; renderContas(); return; }
      contasData = (data || []).map(contaDoBanco);
      renderContas();
    } catch(e){ console.warn('Contas:', e); }
  }

  // Conta paga/recebida: vira lançamento no Controle Financeiro; se for mensal, cria a do mês seguinte.
  async function marcarContaPaga(c, jaSalva){
    const forma = c.forma || formasAtivas()[0] || '';
    const hoje = hojeISO();
    const mov = await finInserir('movimentos_financeiros', {
      data: hoje, descricao: c.descricao, categoria: c.categoria, valor: c.valor,
      tipo: c.tipo === 'receber' ? 'receita' : 'despesa', pago: true, forma: forma || null,
      conta_id: ehIdDoBanco(c.id) ? c.id : null, moeda: moedaPreferidaAtual(),
    });
    if(!mov) return false;
    const antes = { pago: c.pago, pagoEm: c.pagoEm, forma: c.forma };
    Object.assign(c, { pago: true, pagoEm: hoje, forma });
    if(!await finAtualizar('contas_financeiras', c.id, { pago: true, pago_em: hoje, forma: forma || null })){
      Object.assign(c, antes);
      await finApagar('movimentos_financeiros', mov.id);
      return false;
    }
    controleData.unshift(movimentoDoBanco({ ...mov, conta_id: mov.conta_id || c.id }));
    let proxima = null;
    if(c.recorrencia === 'Mensal' && c.vencISO){
      const venc = addMesISO(c.vencISO);
      const existe = contasData.some(x => x !== c && x.descricao === c.descricao && x.tipo === c.tipo && x.vencISO === venc);
      if(!existe){
        const nova = { ...c, id: null, vencISO: venc, pago: false, pagoEm: null };
        const salvo = await finInserir('contas_financeiras', contaParaBanco(nova));
        if(salvo){ nova.id = salvo.id; contasData.push(nova); proxima = nova; }
      }
    }
    renderFinanceiro();
    if(!jaSalva) showToast((c.tipo === 'pagar' ? 'Conta paga' : 'Conta recebida') + ' e lançada no Controle Financeiro.' + (proxima ? ` Próxima: ${isoParaBR(proxima.vencISO)}.` : ''));
    return true;
  }
  async function desmarcarContaPaga(c){
    const movs = controleData.filter(m => m.contaId && m.contaId === c.id);
    for(const m of movs){ if(!await finApagar('movimentos_financeiros', m.id)) return; }
    if(!await finAtualizar('contas_financeiras', c.id, { pago: false, pago_em: null })) return;
    c.pago = false; c.pagoEm = null;
    controleData = controleData.filter(m => !movs.includes(m));
    renderFinanceiro();
    showToast('Conta voltou para pendente (saiu do Controle Financeiro).');
  }
  async function apagarConta(c){
    if(!confirm(`Apagar a conta "${c.descricao}" (${fmtMoeda(c.valor)}, vence ${isoParaBR(c.vencISO)})?` + (c.pago ? '\n\nO lançamento dela no Controle Financeiro também será apagado.' : ''))) return;
    const movs = controleData.filter(m => m.contaId && m.contaId === c.id);
    for(const m of movs){ if(!await finApagar('movimentos_financeiros', m.id)) return; }
    if(!await finApagar('contas_financeiras', c.id)) return;
    contasData = contasData.filter(x => x !== c);
    controleData = controleData.filter(m => !movs.includes(m));
    renderFinanceiro();
    showToast('Conta apagada.');
  }

  const modalContaOverlay = document.getElementById('modalContaOverlay');
  const modalContaTitle = document.getElementById('modalContaTitle');
  let contaTipoAtual = 'receber', contaEditando = null;

  function openContaModal(tipo, conta){
    contaTipoAtual = tipo; contaEditando = conta || null;
    atualizarSugestoesFin();
    modalContaTitle.textContent = conta ? (tipo === 'receber' ? 'Editar Conta a Receber' : 'Editar Conta a Pagar')
                                        : (tipo === 'receber' ? 'Adicionar Conta a Receber' : 'Adicionar Conta a Pagar');
    document.getElementById('contaData').value = conta ? conta.vencISO : hojeISO();
    document.getElementById('contaDescricao').value = conta ? conta.descricao : '';
    preencherSelectFormas(document.getElementById('contaFormaPagamento'), conta ? conta.forma : '', 'Selecione');
    document.getElementById('contaCategoria').value = conta ? conta.categoria : '';
    document.getElementById('contaValor').value = conta ? valorParaCampo(conta.valor) : '';
    document.getElementById('contaRecorrencia').value = conta ? conta.recorrencia : 'Não';
    const jaPago = document.getElementById('contaJaPago');
    jaPago.checked = conta ? conta.pago : false;
    jaPago.disabled = !!conta; // em contas já salvas, use "Marcar paga"/"Desfazer" na lista
    document.getElementById('contaJaPagoLabel').textContent = tipo === 'receber' ? 'Já foi recebida' : 'Já está paga';
    modalContaOverlay.classList.add('open');
    setTimeout(() => { if(!modalContaOverlay.contains(document.activeElement)) document.getElementById('contaDescricao').focus(); }, 50);
  }
  function closeContaModal(){ modalContaOverlay.classList.remove('open'); contaEditando = null; }

  document.getElementById('btnAddContaReceber').addEventListener('click', () => openContaModal('receber'));
  document.getElementById('btnAddContaPagar').addEventListener('click', () => openContaModal('pagar'));
  ['btnAddContaReceber', 'btnAddContaPagar'].forEach(id => document.getElementById(id).addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.currentTarget.click(); }
  }));
  document.getElementById('modalContaCancel').addEventListener('click', closeContaModal);
  modalContaOverlay.addEventListener('click', (e) => { if(e.target === modalContaOverlay) closeContaModal(); });

  document.getElementById('modalContaConfirm').addEventListener('click', async () => {
    const dados = {
      vencISO: document.getElementById('contaData').value,
      descricao: document.getElementById('contaDescricao').value.trim(),
      valor: lerValor(document.getElementById('contaValor').value),
      categoria: document.getElementById('contaCategoria').value.trim() || 'Outros',
      forma: document.getElementById('contaFormaPagamento').value,
      recorrencia: document.getElementById('contaRecorrencia').value,
      tipo: contaTipoAtual,
    };
    const jaPago = document.getElementById('contaJaPago').checked;
    if(!dados.descricao){ showToast('Escreva uma descrição.'); document.getElementById('contaDescricao').focus(); return; }
    if(!dados.vencISO){ showToast('Informe o vencimento.'); return; }
    if(dados.valor <= 0){ showToast('Informe o valor.'); document.getElementById('contaValor').focus(); return; }
    const btn = document.getElementById('modalContaConfirm');
    btn.disabled = true;
    try{
      if(contaEditando){
        const c = contaEditando;
        const novo = { ...c, ...dados };
        if(!await finAtualizar('contas_financeiras', c.id, contaParaBanco(novo))) return;
        Object.assign(c, dados);
        // conta já paga: o lançamento acompanha a edição
        for(const m of controleData.filter(x => x.contaId && x.contaId === c.id)){
          const alt = { descricao: c.descricao, categoria: c.categoria, valor: c.valor, forma: c.forma || null, tipo: c.tipo === 'receber' ? 'receita' : 'despesa' };
          if(await finAtualizar('movimentos_financeiros', m.id, alt)) Object.assign(m, alt, { forma: c.forma || '' });
        }
        closeContaModal();
        renderFinanceiro();
        showToast('Conta atualizada!');
        return;
      }
      const nova = { ...dados, id: null, pago: false, pagoEm: null };
      const salvo = await finInserir('contas_financeiras', contaParaBanco(nova));
      if(!salvo) return;
      nova.id = salvo.id;
      contasData.push(nova);
      closeContaModal();
      if(jaPago) await marcarContaPaga(nova, true);
      renderFinanceiro();
      showToast((contaTipoAtual === 'receber' ? 'Conta a receber adicionada' : 'Conta a pagar adicionada') + (jaPago ? ' e lançada no Controle Financeiro.' : '!'));
    } finally { btn.disabled = false; }
  });

  /* ---------- Redesenha tudo do Financeiro (ex.: quando a moeda muda) ---------- */
  function renderFinanceiro(){
    document.querySelectorAll('.fin-moeda-simbolo').forEach(el => { el.textContent = simboloMoeda(); });
    renderComandas();
    renderControleFinanceiro();
    renderContas();
    renderFormas();
  }
  renderFinanceiro();

  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(modalComandaOverlay.classList.contains('open')) fecharComanda();
    else if(modalLancOverlay.classList.contains('open')) fecharLancamento();
    else if(modalContaOverlay.classList.contains('open')) closeContaModal();
  });
