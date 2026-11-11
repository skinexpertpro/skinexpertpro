/* Skin Expert Pro — Pacotes da paciente: saldo de sessões.
   Venda:   comanda com o item "Pacote: Nome" → libera as sessões na hora (mesmo pago em parte;
            o que falta pagar fica em aberto na comanda / Financeiro).
   Agenda:  ao agendar um serviço que a paciente tem no pacote, a sessão fica RESERVADA e a comanda
            do atendimento sai com valor zero para esse serviço.
   Baixa:   ao dar baixa na comanda (atendimento confirmado), a sessão passa a USADA.
   Cancelou / excluiu o atendimento, ou tirou o item da comanda → a sessão volta para o saldo.
   Precisa das tabelas pacotes_paciente e pacote_sessoes no Supabase.
   Carregado depois de financeiro.js e meu-negocio.js. */

  // { id, pacienteId, cliente, nome, servicos:[{nome, qtd}], valor, moeda, comandaId, dataVenda, validade (ISO|null),
  //   sessoes:[{ id, servicoNome, agendamentoId, comandaId, data, status:'reservada'|'usada' }] }
  let pacotesPacienteData = [];

  /* ---------- Banco (conta real) ou memória (demonstração) ---------- */
  function ppParaBanco(pp){
    return {
      paciente_id: pp.pacienteId != null ? String(pp.pacienteId) : null, cliente: pp.cliente || null, nome: pp.nome,
      servicos: pp.servicos, valor: pp.valor, moeda: pp.moeda || null,
      comanda_id: ehIdDoBanco(pp.comandaId) ? pp.comandaId : null,
      data_venda: pp.dataVenda, validade: pp.validade || null,
    };
  }
  function ppDoBanco(r){
    return {
      id: r.id, pacienteId: r.paciente_id, cliente: r.cliente || '', nome: r.nome,
      servicos: Array.isArray(r.servicos) ? r.servicos.map(s => ({ nome: s.nome, qtd: parseInt(s.qtd, 10) || 1 })) : [],
      valor: Number(r.valor) || 0, moeda: r.moeda || null, comandaId: r.comanda_id || null,
      dataVenda: r.data_venda ? String(r.data_venda).slice(0, 10) : '', validade: r.validade ? String(r.validade).slice(0, 10) : null,
      sessoes: [],
    };
  }
  function sessaoDoBanco(r){
    return {
      id: r.id, pacoteId: r.pacote_paciente_id, servicoNome: r.servico_nome, agendamentoId: r.agendamento_id || null,
      comandaId: r.comanda_id || null, data: r.data ? String(r.data).slice(0, 10) : '', status: r.status === 'usada' ? 'usada' : 'reservada',
      criadoEm: r.criado_em || '',
    };
  }
  let avisoPacotesSemTabela = false;
  function avisarErroPacotes(error){
    const msg = (error && error.message) || String(error || '');
    console.warn('Pacotes da paciente:', msg);
    if(/relation|does not exist|schema cache/i.test(msg)){
      if(!avisoPacotesSemTabela){ avisoPacotesSemTabela = true; showToast('Falta criar no Supabase as tabelas de saldo de pacotes (pacotes_paciente e pacote_sessoes).'); }
    } else showToast('Pacote: ' + msg.slice(0, 90));
  }

  async function carregarPacotesPaciente(){
    if(modoDemonstracao) return;
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const [{ data: pacs, error: e1 }, { data: sess, error: e2 }] = await Promise.all([
        supabaseClient.from('pacotes_paciente').select('*').eq('profissional_id', user.id).order('data_venda', { ascending: true }),
        supabaseClient.from('pacote_sessoes').select('*').eq('profissional_id', user.id).order('criado_em', { ascending: true }),
      ]);
      if(e1 || e2){ console.warn('Pacotes da paciente:', (e1 || e2).message); return; }
      pacotesPacienteData = (pacs || []).map(ppDoBanco);
      (sess || []).map(sessaoDoBanco).forEach(s => { const pp = pacotePorId(s.pacoteId); if(pp) pp.sessoes.push(s); });
      try{ if(document.getElementById('panel-pacotes')?.classList.contains('active')) renderPacotesDaPaciente(); }catch(e){}
    }catch(e){ console.warn('Pacotes da paciente:', e); }
  }

  /* ---------- Contas do saldo ---------- */
  function pacotePorId(id){ return pacotesPacienteData.find(p => String(p.id) === String(id)) || null; }
  function mesmoServico(a, b){ return semAcento(String(a || '').trim()) === semAcento(String(b || '').trim()); }
  function qtdDoServicoNoPacote(pp, servico){ const s = pp.servicos.find(x => mesmoServico(x.nome, servico)); return s ? s.qtd : 0; }
  function sessoesDoServico(pp, servico){ return pp.sessoes.filter(s => mesmoServico(s.servicoNome, servico)); }
  function restantesDoServico(pp, servico){ return Math.max(0, qtdDoServicoNoPacote(pp, servico) - sessoesDoServico(pp, servico).length); }
  function pacoteVencidoEm(pp, dataISO){ return !!(pp.validade && dataISO && dataISO > pp.validade); }
  function totalSessoesPacote(pp){ return pp.servicos.reduce((t, s) => t + s.qtd, 0); }
  function pacotesDaPacienteId(pacienteId){
    if(pacienteId == null) return [];
    return pacotesPacienteData.filter(p => String(p.pacienteId) === String(pacienteId));
  }
  // Pacote com saldo para esse serviço na data (o que vence primeiro / o mais antigo é usado antes)
  function pacoteComSaldo(pacienteId, servico, dataISO){
    return pacotesDaPacienteId(pacienteId)
      .filter(pp => restantesDoServico(pp, servico) > 0 && !pacoteVencidoEm(pp, dataISO || hojeISO()))
      .sort((a, b) => (a.validade || '9999').localeCompare(b.validade || '9999') || (a.dataVenda || '').localeCompare(b.dataVenda || ''))[0] || null;
  }
  // "sessão 2 de 5" — posição da sessão entre as do mesmo serviço
  function numeroDaSessao(pp, sessaoId){
    const s = pp.sessoes.find(x => String(x.id) === String(sessaoId));
    if(!s) return '';
    const lista = sessoesDoServico(pp, s.servicoNome);
    return `${lista.indexOf(s) + 1}/${qtdDoServicoNoPacote(pp, s.servicoNome)}`;
  }
  function validadeISO(dataVendaISO, validade){
    if(!validade || !(parseInt(validade.qtd, 10) > 0)) return null;
    const [a, m, d] = dataVendaISO.split('-').map(Number);
    const n = parseInt(validade.qtd, 10);
    const dt = validade.unidade === 'dias' ? new Date(a, m - 1, d + n) : new Date(a, m - 1 + n, Math.min(d, new Date(a, m - 1 + n + 1, 0).getDate()));
    return dateKey(dt);
  }

  /* ---------- Venda do pacote ---------- */
  async function venderPacote({ modelo, comanda }){
    const dataVenda = comanda.dataISO || hojeISO();
    const pp = {
      id: null, pacienteId: comanda.pacienteId, cliente: comanda.cliente, nome: modelo.nome,
      servicos: (modelo.servicos || []).map(s => ({ nome: s.nome, qtd: parseInt(s.qtd, 10) || 1 })),
      valor: Number(modelo.valor) || 0, moeda: comanda.moeda || moedaPreferidaAtual(), comandaId: comanda.id,
      dataVenda, validade: validadeISO(dataVenda, modelo.validade), sessoes: [],
    };
    if(modoDemonstracao || !ehIdDoBanco(comanda.id)){ pp.id = idLocal(); }
    else {
      const { data, error } = await supabaseClient.from('pacotes_paciente').insert(ppParaBanco(pp)).select().single();
      if(error){ avisarErroPacotes(error); return null; }
      pp.id = data.id;
    }
    pacotesPacienteData.push(pp);
    return pp;
  }
  async function desfazerVendaPacote(pp){
    if(pp.sessoes.length){
      showToast(`O pacote "${pp.nome}" já tem ${pp.sessoes.length} sessão(ões) reservada(s) ou usada(s). Cancele esses atendimentos antes.`);
      return false;
    }
    if(ehIdDoBanco(pp.id) && !modoDemonstracao){
      const { error } = await supabaseClient.from('pacotes_paciente').delete().eq('id', pp.id);
      if(error){ avisarErroPacotes(error); return false; }
    }
    pacotesPacienteData = pacotesPacienteData.filter(x => x !== pp);
    return true;
  }

  /* ---------- Sessões: reservar, liberar, dar baixa ---------- */
  async function reservarSessao(pp, servicoNome, { agendamentoId, data }){
    const s = { id: null, pacoteId: pp.id, servicoNome, agendamentoId: agendamentoId || null, comandaId: null, data: data || hojeISO(), status: 'reservada', criadoEm: new Date().toISOString() };
    if(modoDemonstracao || !ehIdDoBanco(pp.id)){ s.id = idLocal(); }
    else {
      const { data: r, error } = await supabaseClient.from('pacote_sessoes').insert({
        pacote_paciente_id: pp.id, servico_nome: servicoNome, data: s.data, status: 'reservada',
        agendamento_id: ehIdDoBanco(String(agendamentoId || '')) ? agendamentoId : null,
      }).select().single();
      if(error){ avisarErroPacotes(error); return null; }
      s.id = r.id;
    }
    pp.sessoes.push(s);
    return s;
  }
  function sessaoPorId(id){
    for(const pp of pacotesPacienteData){ const s = pp.sessoes.find(x => String(x.id) === String(id)); if(s) return { pp, s }; }
    return null;
  }
  async function liberarSessao(sessaoId){
    const achou = sessaoPorId(sessaoId);
    if(ehIdDoBanco(String(sessaoId)) && !modoDemonstracao){
      const { error } = await supabaseClient.from('pacote_sessoes').delete().eq('id', sessaoId);
      if(error){ avisarErroPacotes(error); return false; }
    }
    if(achou) achou.pp.sessoes = achou.pp.sessoes.filter(x => x !== achou.s);
    return true;
  }
  async function marcarSessao(sessaoId, status, comanda){
    const achou = sessaoPorId(sessaoId);
    const campos = { status, comanda_id: ehIdDoBanco(comanda.id) ? comanda.id : null, data: comanda.dataISO || hojeISO() };
    if(ehIdDoBanco(String(sessaoId)) && !modoDemonstracao){
      const { error } = await supabaseClient.from('pacote_sessoes').update(campos).eq('id', sessaoId);
      if(error){ avisarErroPacotes(error); return false; }
    }
    if(achou) Object.assign(achou.s, { status, comandaId: comanda.id, data: campos.data });
    return true;
  }

  // Item de comanda para uma sessão do pacote (valor zero)
  function itemSessaoPacote(pp, sessao){
    return { nome: sessao.servicoNome, preco: 0, origem: 'pacote', pacotePacienteId: pp.id, sessaoId: sessao.id, baixa: false };
  }

  /* Monta os itens de serviço de um atendimento, usando o pacote quando a paciente tem saldo.
     "atuais" = itens de serviço/pacote que a comanda já tem (na edição do atendimento): sessões que
     continuam valendo são mantidas; as que saíram voltam para o saldo. Devolve { itens, usados:[{pp, servico}] } */
  async function itensDoAtendimento({ servicoNome, pacienteId, dataISO, agendamentoId, atuais }){
    const nomes = String(servicoNome || '').split(',').map(t => t.trim()).filter(Boolean);
    const sobrando = (atuais || []).filter(i => i.origem === 'pacote' && i.sessaoId && !i.baixa && !i.liberada);
    const jaComBaixa = (atuais || []).filter(i => i.origem === 'pacote' && i.baixa && !i.liberada); // continuam na comanda
    const itens = [], usados = [];
    for(const nome of nomes){
      const b = jaComBaixa.findIndex(i => mesmoServico(i.nome, nome));
      if(b >= 0){ jaComBaixa.splice(b, 1); continue; }
      const idx = sobrando.findIndex(i => mesmoServico(i.nome, nome) && (pacotePorId(i.pacotePacienteId) || {}).pacienteId == String(pacienteId));
      if(idx >= 0){ itens.push(sobrando.splice(idx, 1)[0]); continue; }
      const pp = pacienteId != null ? pacoteComSaldo(pacienteId, nome, dataISO) : null;
      const sessao = pp ? await reservarSessao(pp, nome, { agendamentoId, data: dataISO }) : null;
      if(sessao){ itens.push(itemSessaoPacote(pp, sessao)); usados.push({ pp, servico: nome }); }
      else itens.push({ nome, preco: precoDoServico(nome) || 0, origem: 'servico' });
    }
    for(const i of sobrando) await liberarSessao(i.sessaoId); // serviço tirado do atendimento
    return { itens, usados };
  }
  function avisoSessoesReservadas(usados){
    if(!usados || !usados.length) return;
    const txt = usados.map(u => `${u.servico} (restam ${restantesDoServico(u.pp, u.servico)})`).join(', ');
    showToast(`Sessão reservada do pacote: ${txt}.`);
  }

  // Sessões da comanda que ainda estão só reservadas (falta dar baixa)
  function sessoesPendentesDaComanda(c){ return (c.itens || []).filter(i => i.origem === 'pacote' && i.sessaoId && !i.baixa && !i.liberada); }
  function sessoesComBaixaDaComanda(c){ return (c.itens || []).filter(i => i.origem === 'pacote' && i.sessaoId && i.baixa && !i.liberada); }

  // Comanda cancelada/apagada: as sessões voltam para o saldo
  async function devolverSessoesDaComanda(c){
    let devolveu = 0;
    for(const i of (c.itens || [])){
      if(i.origem === 'pacote' && i.sessaoId && !i.liberada){
        if(await liberarSessao(i.sessaoId)){ i.liberada = true; i.baixa = false; devolveu++; }
      }
    }
    return devolveu;
  }
  // Pacotes vendidos nesta comanda que já têm sessões (impedem apagar a comanda)
  function pacotesVendidosComUso(c){
    return (c.itens || []).map(i => i.pacotePacienteId && i.origem !== 'pacote' ? pacotePorId(i.pacotePacienteId) : null).filter(pp => pp && pp.sessoes.length);
  }
  async function desfazerVendasDaComanda(c){
    for(const i of (c.itens || [])){
      if(i.origem === 'pacote' || !i.pacotePacienteId) continue;
      const pp = pacotePorId(i.pacotePacienteId);
      if(pp && !await desfazerVendaPacote(pp)) return false;
    }
    return true;
  }

  /* ---------- Aba "Pacotes" no Registro da Paciente ---------- */
  function renderPacotesDaPaciente(){
    const box = document.getElementById('pacotesPacienteLista');
    if(!box || !currentPatient) return;
    const lista = pacotesDaPacienteId(currentPatient.id).slice().sort((a, b) => (b.dataVenda || '').localeCompare(a.dataVenda || ''));
    if(!lista.length){
      box.innerHTML = '<div class="empty-state">Nenhum pacote vendido para esta paciente ainda.<br>Para vender, abra uma comanda e adicione o item "Pacote: …".</div>';
      return;
    }
    const hoje = hojeISO();
    box.innerHTML = lista.map(pp => {
      const vencido = pacoteVencidoEm(pp, hoje);
      const restam = pp.servicos.reduce((t, s) => t + restantesDoServico(pp, s.nome), 0);
      const comanda = (comandasData || []).find(c => String(c.id) === String(pp.comandaId));
      const falta = comanda ? comanda.saldo : 0;
      const pago = comanda ? (comanda.pago || 0) : 0;
      let situacao = '<span class="status-active">Ativo</span>';
      if(restam === 0) situacao = '<span class="pill pill-gray">Concluído</span>';
      else if(vencido) situacao = '<span class="pill pill-inativa">Vencido</span>';
      const servs = pp.servicos.map(s => {
        const ses = sessoesDoServico(pp, s.nome);
        const usadas = ses.filter(x => x.status === 'usada').length, reservadas = ses.length - usadas;
        return `<tr><td>${escHTML(s.nome)}</td><td class="num">${s.qtd}</td><td class="num">${usadas}</td><td class="num">${reservadas}</td><td class="num"><strong>${restantesDoServico(pp, s.nome)}</strong></td></tr>`;
      }).join('');
      const hist = pp.sessoes.slice().sort((a, b) => (a.data || '').localeCompare(b.data || '')).map(s =>
        `<li>${escHTML(isoParaBR(s.data))} · ${escHTML(s.servicoNome)} · sessão ${numeroDaSessao(pp, s.id)} · ${s.status === 'usada' ? 'realizada' : 'agendada (reservada)'}</li>`).join('');
      return `<div class="registro-card pacote-paciente-card">
        <div class="pacote-paciente-topo">
          <div><strong>${escHTML(pp.nome)}</strong> ${situacao}
            <div class="pacote-paciente-meta">Vendido em ${escHTML(isoParaBR(pp.dataVenda))} · ${pp.validade ? `Válido até ${escHTML(isoParaBR(pp.validade))}` : 'Sem validade'}${comanda ? ` · Comanda ${escHTML(comanda.codigo)}` : ''}</div>
          </div>
          <div class="pacote-paciente-saldo"><span>${restam}</span> de ${totalSessoesPacote(pp)} sessões restantes</div>
        </div>
        <table class="fin-table pacote-paciente-tabela"><thead><tr><th>Serviço</th><th class="num">Contratadas</th><th class="num">Realizadas</th><th class="num">Agendadas</th><th class="num">Restantes</th></tr></thead><tbody>${servs}</tbody></table>
        <div class="pacote-paciente-pag">Valor ${fmtMoeda(comanda ? comanda.valor : pp.valor)} · Pago ${fmtMoeda(pago)}${falta > 0 ? ` · <strong class="falta">Falta receber ${fmtMoeda(falta)}</strong>` : comanda ? ' · Quitado' : ''}
          ${comanda ? `<button type="button" class="btn-outline btn-sm" data-comanda="${escHTML(String(comanda.id))}">Abrir comanda</button>` : ''}</div>
        ${hist ? `<details class="pacote-paciente-hist"><summary>Sessões (${pp.sessoes.length})</summary><ul>${hist}</ul></details>` : ''}
      </div>`;
    }).join('');
    box.querySelectorAll('button[data-comanda]').forEach(b => b.addEventListener('click', () => {
      const c = comandasData.find(x => String(x.id) === b.dataset.comanda);
      if(c) abrirComanda(c);
    }));
  }
  document.getElementById('btnVenderPacotePaciente')?.addEventListener('click', () => {
    if(!currentPatient) return;
    novaComanda();
    comandaAtual.cliente = currentPatient.name;
    comandaAtual.pacienteId = currentPatient.id;
    document.getElementById('comandaCliente').value = currentPatient.name;
    setTimeout(() => document.getElementById('comandaItemNome').focus(), 60);
  });
  document.querySelector('.registro-tab[data-tab="pacotes"]')?.addEventListener('click', () => renderPacotesDaPaciente());

  /* ---------- Aviso no agendamento ---------- */
  function atualizarAvisoPacoteAgenda(){
    const aviso = document.getElementById('apptPacoteAviso');
    if(!aviso) return;
    const pacId = (document.getElementById('apptPatientSelect') || {}).value;
    let servs = [];
    try{ servs = getServicosSelecionados(); }catch(e){}
    const data = (document.getElementById('apptDate') || {}).value || hojeISO();
    const linhas = [];
    if(pacId){
      servs.forEach(sv => {
        const pp = pacoteComSaldo(pacId, sv, data);
        if(pp) linhas.push(`${sv}: desconta do pacote "${pp.nome}" (restam ${restantesDoServico(pp, sv)})`);
      });
      if(!linhas.length && pacotesDaPacienteId(pacId).some(pp => pp.servicos.some(s => restantesDoServico(pp, s.nome) > 0) && !pacoteVencidoEm(pp, data))){
        const disp = [];
        pacotesDaPacienteId(pacId).forEach(pp => { if(!pacoteVencidoEm(pp, data)) pp.servicos.forEach(s => { const r = restantesDoServico(pp, s.nome); if(r > 0) disp.push(`${s.nome} (${r})`); }); });
        linhas.push(`Esta paciente tem pacote com saldo: ${disp.join(', ')}.`);
      }
    }
    // Na edição, sessões já reservadas por este atendimento não aparecem como "nova reserva"
    aviso.innerHTML = linhas.map(l => escHTML(l)).join('<br>');
    aviso.style.display = linhas.length ? 'block' : 'none';
  }
  ['apptServicosContainer', 'apptDate'].forEach(id => document.getElementById(id)?.addEventListener('change', atualizarAvisoPacoteAgenda));
  // a paciente é escolhida trocando as opções do select escondido
  try{ new MutationObserver(atualizarAvisoPacoteAgenda).observe(document.getElementById('apptPatientSelect'), { childList: true }); }catch(e){}
