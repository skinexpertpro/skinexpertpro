/* Skin Expert Pro — Agenda: calendário, atendimentos, bloqueios e janela de agendamento.
   Arquivo 7 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= AGENDA MODULE ================= */
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const weekdayFull = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

  function pad(n){ return n.toString().padStart(2,'0'); }
  function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function sameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

  /* ---------- Helpers para interação estilo Google Agenda (clicar/arrastar) ---------- */
  const monthAbbrev = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
  function snapMinutes(mins, step){ return Math.round(mins/step)*step; }
  function minutesToTimeStr(mins){
    const total = Math.max(0, Math.min(23*60+45, mins));
    return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
  }
  function timeStrToMinutes(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }
  function formatarDataCurta(key){
    const [ano, mes, dia] = key.split('-').map(Number);
    return `${dia} de ${monthAbbrev[mes-1]}`;
  }
  function isAgendamentoReal(item){ return typeof item.id === 'string' && item.id.includes('-'); }

  /* ---------- Nada de dois agendamentos no mesmo horário ----------
     Vale para atendimentos e bloqueios. "ignorar" é o próprio item quando ele está sendo
     editado/arrastado (não conflita consigo mesmo). */
  function conflitoDeHorario(key, hora, duracao, ignorar){
    const ini = timeStrToMinutes(hora), fim = ini + (parseInt(duracao, 10) || 60);
    return (appointments[key] || []).find(a => {
      if(a === ignorar || (ignorar && a.id != null && a.id === ignorar.id)) return false;
      const aIni = timeStrToMinutes(a.time || '00:00'), aFim = aIni + (parseInt(a.duration, 10) || 60);
      return ini < aFim && aIni < fim;
    }) || null;
  }
  function mensagemConflito(key, a){
    const oque = a.type === 'block' ? `um bloqueio (${a.label || 'Horário bloqueado'})` : `o atendimento de ${a.label || 'outra paciente'}`;
    return `Horário ocupado: em ${formatarDataBR(key)} já existe ${oque} das ${a.time} às ${horaFim(a.time, parseInt(a.duration, 10) || 60)}. Escolha outro horário.`;
  }
  // Avisa se já existem horários com dois agendamentos (feitos antes desta regra), de hoje em diante.
  function avisarHorariosDuplicados(){
    const hojeKey = dateKey(today);
    const choques = [];
    Object.keys(appointments).filter(k => k >= hojeKey).sort().forEach(k => {
      const lista = (appointments[k] || []).slice().sort((x, y) => (x.time || '').localeCompare(y.time || ''));
      lista.forEach((a, i) => {
        const outro = conflitoDeHorario(k, a.time, a.duration, a);
        if(outro && lista.indexOf(outro) > i) choques.push(`${formatarDataBR(k)} ${a.time} (${a.label} × ${outro.label})`);
      });
    });
    if(!choques.length) return;
    console.warn('Horários com dois agendamentos:', choques);
    showToast(`Atenção: ${choques.length} horário${choques.length > 1 ? 's' : ''} com dois agendamentos — ${choques.slice(0, 3).join('; ')}${choques.length > 3 ? '…' : ''}. Remarque um deles.`);
  }

  // Traduz o erro do banco quando a regra de "horário ocupado" (SQL) barrar o salvamento.
  function mensagemErroAgenda(error, prefixo){
    const msg = (error && error.message) || '';
    if(/HORARIO_OCUPADO/i.test(msg)) return 'Horário ocupado: já existe outro agendamento nesse horário. Escolha outro horário.';
    return (prefixo || 'Erro: ') + msg;
  }

  // Move um atendimento/bloqueio para um novo horário, persiste (se for um registro real
  // do Supabase) e mostra um toast com opção de "Desfazer", no estilo do Google Agenda.
  async function reagendarItem(key, item, novaHora, rerenderFn){
    const horaAntiga = item.time;
    if(novaHora === horaAntiga) return;
    const conflito = conflitoDeHorario(key, novaHora, item.duration, item);
    if(conflito){ rerenderFn(); showToast(mensagemConflito(key, conflito)); return; }
    item.time = novaHora;
    rerenderFn();

    if(isAgendamentoReal(item)){
      const { error } = await supabaseClient.from('agendamentos').update({ hora: novaHora }).eq('id', item.id);
      if(error){
        item.time = horaAntiga;
        rerenderFn();
        showToast(mensagemErroAgenda(error, 'Erro ao remarcar: '));
        return;
      }
      sincronizarComGoogleAgenda(item.id);
    }

    showUndoToast(`Remarcado para ${formatarDataCurta(key)}, ${novaHora}`, async () => {
      if(conflitoDeHorario(key, horaAntiga, item.duration, item)){ showToast('Não dá para desfazer: o horário anterior foi ocupado.'); return; }
      item.time = horaAntiga;
      rerenderFn();
      if(isAgendamentoReal(item)){
        await supabaseClient.from('agendamentos').update({ hora: horaAntiga }).eq('id', item.id);
        sincronizarComGoogleAgenda(item.id);
      }
    });
  }

  // Cancela um atendimento/bloqueio: pede confirmação, remove da lista local, exclui do Supabase
  // (se for real) e apaga o evento correspondente na Google Agenda, se houver.
  // "Cancelar" = a paciente cancelou: o atendimento sai da agenda mas fica registrado,
  // e a comanda fica Inativa. (Bloqueios não têm comanda: cancelar um bloqueio = remover.)
  async function cancelarAtendimento(key, item, rerenderFn){
    if(item.type === 'block') return excluirAtendimento(key, item, rerenderFn);
    if(!confirm(`Cancelar o atendimento de ${item.label} (${formatarDataBR(key)}, ${item.time})?\n\nEle sai da agenda e a comanda fica inativa.`)) return;

    if(isAgendamentoReal(item)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
      const { error } = await supabaseClient.from('agendamentos').update({ status: 'cancelado' }).eq('id', item.id);
      if(error){
        showToast(/status/i.test(error.message || '')
          ? 'Para cancelar mantendo o registro, rode o arquivo comandas-agenda.sql no Supabase. (Você pode usar "Excluir".)'
          : 'Erro ao cancelar: ' + error.message);
        return;
      }
      if(item.googleEventId){
        supabaseClient.functions.invoke('cancelar-google-agenda', { body: { googleEventId: item.googleEventId } }).catch(()=>{});
      }
    }
    const lista = appointments[key] || [];
    const idx = lista.indexOf(item);
    if(idx !== -1) lista.splice(idx, 1);
    rerenderFn();
    inativarComandaDoAgendamento(item.id).catch(e => console.warn('Comanda:', e));
    showToast('Atendimento cancelado. A comanda ficou inativa.');
  }

  // "Excluir" = desmarcar/apagar: remove o atendimento de vez e apaga a comanda dele.
  async function excluirAtendimento(key, item, rerenderFn){
    const isBlock = item.type === 'block';
    const tipoLabel = isBlock ? 'bloqueio de horário' : 'atendimento';
    const confirmado = confirm(isBlock
      ? `Remover este bloqueio (${item.label}, ${item.time})?`
      : `Excluir o atendimento de ${item.label} (${formatarDataBR(key)}, ${item.time})?\n\nEle será apagado da agenda e a comanda também.`);
    if(!confirmado) return;
    if(isAgendamentoReal(item)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
    }

    const lista = appointments[key] || [];
    const idx = lista.findIndex(a => a.id === item.id);
    if(idx !== -1) lista.splice(idx, 1);
    rerenderFn();

    // A comanda vai antes (se o banco ligar comanda → atendimento, o atendimento não fica preso).
    if(!isBlock) await apagarComandaDoAgendamento(item.id).catch(e => console.warn('Comanda:', e));

    if(isAgendamentoReal(item)){
      const { error } = await supabaseClient.from('agendamentos').delete().eq('id', item.id);
      if(error){
        showToast('Erro ao excluir: ' + error.message);
        await loadAgendamentosFromSupabase();
        rerenderFn();
        return;
      }
      if(item.googleEventId){
        supabaseClient.functions.invoke('cancelar-google-agenda', { body: { googleEventId: item.googleEventId } }).catch(()=>{});
      }
    }
    showToast(isBlock ? 'Bloqueio removido.' : 'Atendimento excluído e comanda apagada.');
  }

  let suprimirCliqueAgenda = false;

  /* ---------- Painel de detalhes do atendimento ---------- */
  const modalApptDetOverlay = document.getElementById('modalApptDetOverlay');
  let apptDetAtual = null; // { key, item, rerenderFn }

  function keyParaData(key){ const [a,m,d] = key.split('-').map(Number); return new Date(a, m-1, d); }
  function formatarDataBR(key){ const [a,m,d] = key.split('-'); return `${d}/${m}/${a}`; }
  function diasEntre(keyA, keyB){ return Math.round((keyParaData(keyB) - keyParaData(keyA)) / 86400000); }
  function descreverIntervalo(dias){
    if(dias <= 0) return 'no mesmo dia';
    if(dias === 1) return 'há 1 dia';
    if(dias < 14) return `há ${dias} dias`;
    if(dias < 60){ const s = Math.round(dias/7); return `há ${s} semana${s>1?'s':''}`; }
    if(dias < 365){ const m = Math.round(dias/30); return `há ${m} ${m>1?'meses':'mês'}`; }
    const anos = Math.floor(dias/365); const resto = Math.round((dias%365)/30);
    return `há ${anos} ano${anos>1?'s':''}` + (resto ? ` e ${resto} ${resto>1?'meses':'mês'}` : '');
  }
  function descreverFrequencia(dias){
    if(dias < 1) return 'várias vezes no mesmo dia';
    if(dias <= 1) return 'a cada 1 dia';
    if(dias < 14) return `a cada ${dias} dias`;
    if(dias < 60){ const s = Math.round(dias/7); return `a cada ${s} semana${s>1?'s':''}`; }
    const m = Math.round(dias/30); return `a cada ${m} ${m>1?'meses':'mês'}`;
  }
  function horaFim(inicio, duracaoMin){ return minutesToTimeStr(timeStrToMinutes(inicio) + (duracaoMin || 0)); }

  function pacienteDoItem(item){
    if(item.pacienteId != null){
      const p = patients.find(x => String(x.id) === String(item.pacienteId));
      if(p) return p;
    }
    return patients.find(x => (x.name || '').trim().toLowerCase() === (item.label || '').trim().toLowerCase()) || null;
  }

  // Todos os atendimentos (não bloqueios) da mesma paciente, em ordem cronológica.
  function historicoDaPaciente(item){
    const mesmo = (a) => (item.pacienteId != null && a.pacienteId != null)
      ? String(a.pacienteId) === String(item.pacienteId)
      : (a.label || '').trim().toLowerCase() === (item.label || '').trim().toLowerCase();
    const lista = [];
    Object.keys(appointments).forEach(k => {
      (appointments[k] || []).forEach(a => { if(a.type === 'appt' && mesmo(a)) lista.push({ key:k, item:a }); });
    });
    lista.sort((x, y) => (x.key + x.item.time).localeCompare(y.key + y.item.time));
    return lista;
  }

  function preencherRecorrencia(key, item){
    const hist = historicoDaPaciente(item);
    const idx = hist.findIndex(h => h.item === item);
    const anteriores = idx > 0 ? hist.slice(0, idx) : [];
    const posteriores = idx >= 0 ? hist.slice(idx + 1) : [];
    const hojeKey = dateKey(today);
    const set = (id, txt) => { document.getElementById(id).textContent = txt; };

    // Última visita antes deste atendimento
    if(anteriores.length){
      const ult = anteriores[anteriores.length - 1];
      const dias = diasEntre(ult.key, key);
      set('apptDetUltima', descreverIntervalo(dias).replace(/^./, c => c.toUpperCase()));
      set('apptDetUltimaSub', `em ${formatarDataBR(ult.key)}${ult.item.servico ? ' · ' + ult.item.servico : ''}`);
    } else {
      set('apptDetUltima', 'Primeira visita');
      set('apptDetUltimaSub', 'Nenhum atendimento anterior na agenda');
    }

    // Frequência média entre visitas (até este atendimento)
    const ate = hist.slice(0, idx + 1);
    if(ate.length >= 2){
      const totalDias = diasEntre(ate[0].key, ate[ate.length - 1].key);
      const media = Math.round(totalDias / (ate.length - 1));
      set('apptDetFrequencia', descreverFrequencia(media).replace(/^./, c => c.toUpperCase()));
      set('apptDetFrequenciaSub', `média entre ${ate.length} visitas`);
    } else {
      set('apptDetFrequencia', '—');
      set('apptDetFrequenciaSub', 'Precisa de 2+ visitas para calcular');
    }

    // Quantos atendimentos no total e qual é este
    const realizados = hist.filter(h => h.key < hojeKey).length;
    set('apptDetTotal', `${idx + 1}º atendimento`);
    set('apptDetTotalSub', `${hist.length} no total · ${realizados} já realizado${realizados === 1 ? '' : 's'}`);

    // Próximo agendamento depois deste
    if(posteriores.length){
      const prox = posteriores[0];
      set('apptDetProximo', formatarDataBR(prox.key));
      set('apptDetProximoSub', `${prox.item.time}${prox.item.servico ? ' · ' + prox.item.servico : ''}`);
    } else {
      set('apptDetProximo', 'Nenhum');
      set('apptDetProximoSub', 'Sem retorno marcado');
    }
  }

  function abrirDetalhesAtendimento(key, item, rerenderFn){
    apptDetAtual = { key, item, rerenderFn };
    const isBlock = item.type === 'block';
    const data = keyParaData(key);

    const tag = document.getElementById('apptDetTag');
    tag.textContent = isBlock ? 'Horário bloqueado' : 'Atendimento';
    tag.classList.toggle('block', isBlock);
    document.getElementById('apptDetNome').textContent = isBlock ? (item.label || 'Horário bloqueado') : (item.label || 'Paciente sem nome');
    document.getElementById('apptDetServico').textContent = isBlock
      ? 'Horário indisponível para agendamentos'
      : (item.servico || 'Serviço não informado');
    document.getElementById('apptDetData').textContent =
      `${weekdayFull[data.getDay()]}, ${data.getDate()} de ${monthNames[data.getMonth()]} de ${data.getFullYear()}`;
    document.getElementById('apptDetHorario').textContent = `${item.time} – ${horaFim(item.time, item.duration)}`;
    const dur = item.duration || 0;
    document.getElementById('apptDetDuracao').textContent = dur >= 60
      ? `${Math.floor(dur/60)}h${dur%60 ? pad(dur%60) : ''} (${dur} min)`
      : `${dur} min`;

    document.getElementById('apptDetRecorrenciaWrap').style.display = isBlock ? 'none' : 'block';
    if(!isBlock) preencherRecorrencia(key, item);

    document.getElementById('apptDetObs').value = item.observacoes || '';
    document.getElementById('apptDetCancelar').textContent = isBlock ? 'Remover bloqueio' : 'Cancelar atendimento';
    document.getElementById('apptDetExcluir').style.display = isBlock ? 'none' : '';
    const paciente = isBlock ? null : pacienteDoItem(item);
    const btnFicha = document.getElementById('apptDetFicha');
    btnFicha.style.display = paciente ? '' : 'none';
    document.getElementById('apptDetWhatsapp').style.display = paciente && numeroWhatsappDaPaciente(paciente) ? '' : 'none';
    document.getElementById('apptDetComanda').style.display = isBlock ? 'none' : '';

    modalApptDetOverlay.classList.add('open');
  }

  function fecharDetalhesAtendimento(){
    modalApptDetOverlay.classList.remove('open');
    apptDetAtual = null;
  }

  document.getElementById('apptDetClose').addEventListener('click', fecharDetalhesAtendimento);
  modalApptDetOverlay.addEventListener('click', (e) => { if(e.target === modalApptDetOverlay) fecharDetalhesAtendimento(); });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modalApptDetOverlay.classList.contains('open')) fecharDetalhesAtendimento();
  });

  document.getElementById('apptDetWhatsapp').addEventListener('click', () => {
    if(!apptDetAtual) return;
    const { key, item } = apptDetAtual;
    const paciente = pacienteDoItem(item);
    if(!paciente || !numeroWhatsappDaPaciente(paciente)){ showToast('Esta paciente não tem telefone cadastrado para o WhatsApp.'); return; }
    const hojeK = dateKey(today), amanhaK = addDiasKey(hojeK, 1);
    const modelo = key < hojeK ? 'pos' : key === amanhaK ? 'lembrete' : 'confirmacao';
    fecharDetalhesAtendimento();
    abrirEnvioMensagem({ paciente, key, hora: item.time, servico: item.servico, modelo });
  });

  // Comanda do atendimento: abre (ou cria, se ainda não existir) para registrar o pagamento
  document.getElementById('apptDetComanda').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { key, item } = apptDetAtual;
    let c = comandaDoAgendamento(item.id);
    if(!c){
      const paciente = pacienteDoItem(item);
      c = await criarComandaDoAgendamento({ agendamentoId: item.id, key, pacienteId: paciente ? paciente.id : (item.pacienteId || null), cliente: item.label, servicoNome: item.servico });
      if(!c){ showToast('Não foi possível abrir a comanda deste atendimento.'); return; }
    }
    fecharDetalhesAtendimento();
    abrirComanda(c);
  });

  document.getElementById('apptDetFicha').addEventListener('click', () => {
    if(!apptDetAtual) return;
    const paciente = pacienteDoItem(apptDetAtual.item);
    fecharDetalhesAtendimento();
    if(paciente) openPatientRegistro(paciente.id, 'dados');
  });

  document.getElementById('apptDetCancelar').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { key, item, rerenderFn } = apptDetAtual;
    const antes = (appointments[key] || []).length;
    await cancelarAtendimento(key, item, () => { rerenderFn(); renderCalendar(); });
    if((appointments[key] || []).length < antes) fecharDetalhesAtendimento();
  });

  document.getElementById('apptDetExcluir').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { key, item, rerenderFn } = apptDetAtual;
    const antes = (appointments[key] || []).length;
    await excluirAtendimento(key, item, () => { rerenderFn(); renderCalendar(); });
    if((appointments[key] || []).length < antes) fecharDetalhesAtendimento();
  });

  document.getElementById('apptDetSalvar').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { item } = apptDetAtual;
    const novoTexto = document.getElementById('apptDetObs').value.trim();
    const anterior = item.observacoes || '';
    if(novoTexto === anterior){ fecharDetalhesAtendimento(); return; }

    if(isAgendamentoReal(item)){
      const { error } = await supabaseClient.from('agendamentos').update({ observacoes: novoTexto || null }).eq('id', item.id);
      if(error){
        showToast('Não foi possível salvar a observação: ' + error.message);
        return;
      }
    }
    item.observacoes = novoTexto;
    fecharDetalhesAtendimento();
    showToast('Observação salva!');
  });

  // Ativa "arrastar para remarcar" em um bloco (.schedule-block ou .week-block) já posicionado.
  // Clique com o botão direito (ou pressionar e segurar, no touch) abre a opção de cancelar.
  function attachDragToReschedule(block, item, key, rowH, rerenderFn){
    block.title = 'Clique para ver detalhes, editar ou cancelar · arraste para remarcar';
    // Clique simples (sem arrastar) abre o painel com os detalhes do atendimento.
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      if(suprimirCliqueAgenda) return;
      abrirDetalhesAtendimento(key, item, rerenderFn);
    });
    block.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrirDetalhesAtendimento(key, item, rerenderFn); // lá dá para escolher Cancelar ou Excluir
    });
    block.addEventListener('mousedown', (e) => {
      if(e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const originalTop = parseFloat(block.style.top);
      let moved = false;
      block.classList.add('dragging');

      function onMove(ev){
        const delta = ev.clientY - startY;
        if(Math.abs(delta) > 3) moved = true;
        block.style.top = (originalTop + delta) + 'px';
      }
      function onUp(ev){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        block.classList.remove('dragging');
        if(!moved){ block.style.top = originalTop + 'px'; return; }
        // Evita que o "click" disparado ao soltar o mouse abra detalhes ou um novo atendimento.
        suprimirCliqueAgenda = true;
        setTimeout(() => { suprimirCliqueAgenda = false; }, 0);
        const delta = ev.clientY - startY;
        const deltaMinutes = snapMinutes((delta/rowH)*30, 15);
        const novoTotal = Math.max(0, Math.min(23*60+45, timeStrToMinutes(item.time) + deltaMinutes));
        const novaHora = minutesToTimeStr(novoTotal);
        block.style.top = originalTop + 'px'; // rerenderFn() desenha na posição correta
        reagendarItem(key, item, novaHora, rerenderFn);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  const today = new Date(); today.setHours(0,0,0,0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = new Date(today);

  // sample demo data so the calendar isn't empty
  const appointments = {};
  const sampleAppt = new Date(viewYear, viewMonth, Math.min(15, new Date(viewYear, viewMonth+1,0).getDate()));
  const sampleBlock = new Date(viewYear, viewMonth, Math.min(29, new Date(viewYear, viewMonth+1,0).getDate()));
  appointments[dateKey(sampleAppt)] = [{ id:1, time:'09:00', duration:60, label:'Paciente Teste 1', servico:'Limpeza de Pele', type:'appt', observacoes:'Pele sensível na região das bochechas — evitar extração agressiva.' }];
  // Exemplos para os lembretes automáticos no modo demonstração: um atendimento há 2 dias
  // (gera "pós-atendimento") e uma paciente que não vem há 70 dias (gera "paciente sumida").
  [[2, 'Paciente Teste 3', 'Limpeza de Pele Profunda', 201], [70, 'Paciente Teste 5', 'Drenagem Linfática', 202]].forEach(([diasAtras, nome, serv, id]) => {
    const d = new Date(today); d.setDate(d.getDate() - diasAtras);
    (appointments[dateKey(d)] = appointments[dateKey(d)] || []).push({ id, time:'15:00', duration:60, label:nome, servico:serv, type:'appt', observacoes:'' });
  });
  // Visitas anteriores de exemplo, para o painel de detalhes mostrar a recorrência no modo demonstração.
  [56, 28].forEach((diasAntes, i) => {
    const d = new Date(sampleAppt); d.setDate(d.getDate() - diasAntes);
    (appointments[dateKey(d)] = appointments[dateKey(d)] || []).push({ id: 100 + i, time:'10:00', duration:60, label:'Paciente Teste 1', servico: i === 0 ? 'Drenagem Linfática' : 'Limpeza de Pele', type:'appt', observacoes:'' });
  });
  appointments[dateKey(sampleBlock)] = [{ id:2, time:'12:00', duration:120, label:'Almoço', type:'block' }];

  const calMonthLabel = document.getElementById('calMonthLabel');
  const calDays = document.getElementById('calDays');
  const scheduleDate = document.getElementById('scheduleDate');
  const scheduleCount = document.getElementById('scheduleCount');
  const scheduleRows = document.getElementById('scheduleRows');

  function renderCalendar(){
    calMonthLabel.textContent = `${monthNames[viewMonth]} de ${viewYear}`;
    calDays.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();

    for(let i=0;i<startWeekday;i++){
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calDays.appendChild(empty);
    }

    for(let day=1; day<=daysInMonth; day++){
      const cellDate = new Date(viewYear, viewMonth, day);
      const key = dateKey(cellDate);
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if(sameDate(cellDate, today)) cell.classList.add('today');
      if(sameDate(cellDate, selectedDate)) cell.classList.add('selected');

      cell.innerHTML = `<span>${day}</span>`;

      const dayItems = appointments[key] || [];
      const hasAppt = dayItems.some(a => a.type === 'appt');
      const hasBlock = dayItems.some(a => a.type === 'block');
      if(hasAppt || hasBlock){
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'day-dots';
        if(hasAppt){ const d = document.createElement('span'); d.className='day-dot'; d.style.background='var(--yellow)'; dotsWrap.appendChild(d); }
        if(hasBlock){ const d = document.createElement('span'); d.className='day-dot'; d.style.background='var(--block-red)'; dotsWrap.appendChild(d); }
        cell.appendChild(dotsWrap);
      }

      cell.addEventListener('click', () => {
        selectedDate = cellDate;
        renderCalendar();
        renderCurrentView();
      });
      calDays.appendChild(cell);
    }
  }

  const DAY_ROW_H = 44;
  function renderSchedule(){
    scheduleDate.textContent = `${weekdayFull[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`;
    const key = dateKey(selectedDate);
    const list = appointments[key] || [];
    const apptCount = list.filter(a => a.type === 'appt').length;
    scheduleCount.textContent = `${apptCount} atendimento(s)`;

    scheduleRows.innerHTML = '';
    const ROW_H = DAY_ROW_H;

    for(let h=0; h<24; h++){
      for(const half of [0,30]){
        const row = document.createElement('div');
        row.className = 'time-row' + (half===0 ? ' hour' : '');
        row.style.height = ROW_H + 'px';
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = half===0 ? `${pad(h)}:00` : ':30';
        const line = document.createElement('div');
        line.className = 'time-line';
        row.appendChild(label);
        row.appendChild(line);
        scheduleRows.appendChild(row);
      }
    }

    list.forEach(item => {
      const [h, m] = item.time.split(':').map(Number);
      const minutesFromMidnight = h*60 + m;
      const top = (minutesFromMidnight/30) * ROW_H;
      const height = Math.max((item.duration/30) * ROW_H - 4, 20);

      const block = document.createElement('div');
      block.className = 'schedule-block ' + (item.type === 'block' ? 'block' : 'appt');
      block.style.top = top + 'px';
      block.style.height = height + 'px';
      block.innerHTML = `<div class="sb-title">${item.type === 'block' ? '🚫 ' : ''}${item.label}</div><div class="sb-time">${item.servico ? item.servico + ' · ' : ''}${item.time} · ${item.duration} min</div>`;
      attachDragToReschedule(block, item, key, ROW_H, renderSchedule);
      scheduleRows.appendChild(block);
    });
  }

  // Clicar em um horário vazio da grade abre "Novo Atendimento" já com a hora preenchida,
  // do mesmo jeito que o Google Agenda faz.
  scheduleRows.addEventListener('click', (e) => {
    if(suprimirCliqueAgenda) return;
    if(e.target.closest('.schedule-block')) return;
    const rect = scheduleRows.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = snapMinutes((offsetY / DAY_ROW_H) * 30, 15);
    openModal('appt', minutesToTimeStr(minutes));
  });

  /* ---------- Semanal (week) view ---------- */
  const weekdayShort = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  let agendaViewMode = 'diario';
  const scheduleScrollDay = document.getElementById('scheduleScrollDay');
  const scheduleScrollWeek = document.getElementById('scheduleScrollWeek');
  const weekGrid = document.getElementById('weekGrid');

  function getWeekStart(d){
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0,0,0,0);
    return start;
  }

  const WEEK_ROW_H = 36;
  function renderWeekSchedule(){
    const ROW_H = WEEK_ROW_H;
    const weekStart = getWeekStart(selectedDate);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    scheduleDate.textContent = sameMonth
      ? `${weekStart.getDate()}–${weekEnd.getDate()} de ${monthNames[weekStart.getMonth()]}`
      : `${weekStart.getDate()} de ${monthNames[weekStart.getMonth()]} – ${weekEnd.getDate()} de ${monthNames[weekEnd.getMonth()]}`;

    let totalAppt = 0;
    for(let i=0;i<7;i++){
      const d = new Date(weekStart); d.setDate(d.getDate()+i);
      totalAppt += (appointments[dateKey(d)] || []).filter(a => a.type === 'appt').length;
    }
    scheduleCount.textContent = `${totalAppt} atendimento(s) na semana`;

    weekGrid.innerHTML = '';

    const gutter = document.createElement('div');
    gutter.className = 'week-time-gutter';
    const gutterHeader = document.createElement('div');
    gutterHeader.className = 'week-day-header';
    gutterHeader.innerHTML = '&nbsp;';
    gutter.appendChild(gutterHeader);
    for(let h=0; h<24; h++){
      for(const half of [0,30]){
        const row = document.createElement('div');
        row.className = 'time-row' + (half===0 ? ' hour' : '');
        row.style.height = ROW_H + 'px';
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = half===0 ? `${pad(h)}:00` : '';
        row.appendChild(label);
        gutter.appendChild(row);
      }
    }
    weekGrid.appendChild(gutter);

    for(let i=0;i<7;i++){
      const d = new Date(weekStart); d.setDate(d.getDate()+i);
      const key = dateKey(d);
      const col = document.createElement('div');
      col.className = 'week-day-col';

      const header = document.createElement('div');
      header.className = 'week-day-header' + (sameDate(d, today) ? ' is-today' : '');
      header.innerHTML = `${weekdayShort[d.getDay()]}<span class="wdh-date">${pad(d.getDate())}/${pad(d.getMonth()+1)}</span>`;
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        selectedDate = d;
        renderCalendar();
        renderWeekSchedule();
      });
      col.appendChild(header);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'week-day-rows';
      for(let h=0; h<24; h++){
        for(const half of [0,30]){
          const row = document.createElement('div');
          row.className = 'time-row';
          row.style.height = ROW_H + 'px';
          rowsWrap.appendChild(row);
        }
      }

      const dayItems = appointments[key] || [];
      dayItems.forEach(item => {
        const [h, m] = item.time.split(':').map(Number);
        const minutesFromMidnight = h*60 + m;
        const top = (minutesFromMidnight/30) * ROW_H;
        const height = Math.max((item.duration/30) * ROW_H - 3, 16);
        const block = document.createElement('div');
        block.className = 'week-block ' + (item.type === 'block' ? 'block' : 'appt');
        block.style.top = top + 'px';
        block.style.height = height + 'px';
        block.innerHTML = `<div class="wb-title">${item.type === 'block' ? '🚫 ' : ''}${item.label}</div><div>${item.time}</div>`;
        attachDragToReschedule(block, item, key, ROW_H, renderWeekSchedule);
        rowsWrap.appendChild(block);
      });

      // Clicar em um horário vazio dessa coluna abre "Novo Atendimento" nesse dia e hora.
      rowsWrap.addEventListener('click', (e) => {
        if(suprimirCliqueAgenda) return;
        if(e.target.closest('.week-block')) return;
        const rect = rowsWrap.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minutes = snapMinutes((offsetY / WEEK_ROW_H) * 30, 15);
        selectedDate = d;
        renderCalendar();
        renderWeekSchedule();
        openModal('appt', minutesToTimeStr(minutes));
      });

      col.appendChild(rowsWrap);
      weekGrid.appendChild(col);
    }
  }

  /* ---------- Abrir a grade no horário de trabalho (não em 00:00) ----------
     Rola só quando muda o dia, a semana ou a visão — redesenhos (arrastar, salvar) não pulam. */
  let ultimaRolagemAgenda = '';
  function horaInicialDaGrade(keys){
    // meia hora antes do primeiro atendimento/bloqueio; senão, o início do Horário de Atendimento
    let primeiro = null;
    keys.forEach(k => (appointments[k] || []).forEach(a => {
      const m = timeStrToMinutes(a.time || '00:00');
      if(primeiro == null || m < primeiro) primeiro = m;
    }));
    let inicio = 8 * 60;
    try{
      const exp = expedientesData && expedientesData[0];
      if(exp){
        const dia = keyParaData(keys[0]).getDay();
        const entradas = keys.length > 1 ? exp.entradas.filter((e, i) => !(exp.fechados || [])[i]) : [exp.entradas[dia]];
        const mins = entradas.filter(Boolean).map(timeStrToMinutes);
        if(mins.length) inicio = Math.min(...mins);
      }
    }catch(e){}
    const alvo = primeiro != null ? Math.min(primeiro, inicio) : inicio;
    return Math.max(0, alvo - 30);
  }
  function rolarAgendaParaHorarioDeTrabalho(){
    const semanal = agendaViewMode === 'semanal';
    const base = semanal ? getWeekStart(selectedDate) : selectedDate;
    const chave = (semanal ? 's' : 'd') + dateKey(base);
    if(chave === ultimaRolagemAgenda) return;
    const scroller = document.getElementById(semanal ? 'scheduleScrollWeek' : 'scheduleScrollDay');
    if(!scroller || scroller.offsetParent === null) return; // aba escondida: rola quando aparecer
    ultimaRolagemAgenda = chave;
    const keys = semanal ? Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return dateKey(d); }) : [dateKey(base)];
    const minutos = horaInicialDaGrade(keys);
    requestAnimationFrame(() => {
      if(semanal){
        const sc = document.getElementById('scheduleScrollWeek');
        const linhas = sc.querySelector('.week-day-rows');
        if(!linhas) return;
        const topoLinhas = linhas.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
        const cabecalho = sc.querySelector('.week-day-header');
        sc.scrollTop = topoLinhas + (minutos / 30) * WEEK_ROW_H - (cabecalho ? cabecalho.offsetHeight : 0);
      } else {
        document.getElementById('scheduleScrollDay').scrollTop = (minutos / 30) * DAY_ROW_H;
      }
    });
  }

  function renderCurrentView(){
    if(agendaViewMode === 'semanal') renderWeekSchedule();
    else renderSchedule();
    rolarAgendaParaHorarioDeTrabalho();
    try{ renderLembretes(); }catch(e){}
  }

  document.querySelectorAll('.view-mode-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-mode-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      agendaViewMode = btn.dataset.agendaView;
      if(agendaViewMode === 'semanal'){
        scheduleScrollDay.style.display = 'none';
        scheduleScrollWeek.style.display = 'block';
      } else {
        scheduleScrollDay.style.display = 'block';
        scheduleScrollWeek.style.display = 'none';
      }
      renderCurrentView();
    });
  });

  document.getElementById('scheduleNavPrev').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - (agendaViewMode === 'semanal' ? 7 : 1));
    selectedDate = new Date(selectedDate);
    viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
    renderCalendar();
    renderCurrentView();
  });
  document.getElementById('scheduleNavNext').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + (agendaViewMode === 'semanal' ? 7 : 1));
    selectedDate = new Date(selectedDate);
    viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
    renderCalendar();
    renderCurrentView();
  });
  document.getElementById('scheduleNavToday').addEventListener('click', () => {
    selectedDate = new Date(today);
    viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
    renderCalendar();
    renderCurrentView();
  });

  document.getElementById('calPrev').addEventListener('click', () => {
    viewMonth--;
    if(viewMonth < 0){ viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    viewMonth++;
    if(viewMonth > 11){ viewMonth = 0; viewYear++; }
    renderCalendar();
  });


  /* ---------- Seletor de duração (horas + minutos, sem opções fixas) ---------- */
  const DUR_MAX_HORAS = 12;
  function formatarDuracaoMin(min){
    min = Math.max(0, Math.round(min || 0));
    const h = Math.floor(min / 60), m = min % 60;
    if(!h) return `${m} min`;
    return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
  }
  // Monta os dois seletores (horas e minutos de 5 em 5) e mantém o campo escondido atualizado.
  // formato: 'min' guarda o número de minutos (atendimentos); 'texto' guarda "1h30", "45 min" (serviços).
  function criarSeletorDuracao(pickerId, hiddenId, formato){
    const wrap = document.getElementById(pickerId);
    const hidden = document.getElementById(hiddenId);
    const selH = wrap.querySelector('.dur-h'), selM = wrap.querySelector('.dur-m'), total = wrap.querySelector('.dur-total');
    for(let h = 0; h <= DUR_MAX_HORAS; h++) selH.add(new Option(h === 1 ? '1 hora' : `${h} horas`, String(h)));
    for(let m = 0; m < 60; m += 5) selM.add(new Option(`${String(m).padStart(2,'0')} min`, String(m)));
    function atualizar(){
      let min = parseInt(selH.value, 10) * 60 + parseInt(selM.value, 10);
      if(min === 0){ selM.value = '5'; min = 5; } // duração mínima de 5 minutos
      hidden.value = formato === 'texto' ? formatarDuracaoMin(min) : String(min);
      total.textContent = min >= 60 ? `= ${min} min` : '';
    }
    selH.addEventListener('change', atualizar);
    selM.addEventListener('change', atualizar);
    return {
      definir(min){
        min = Math.round((parseInt(min, 10) || 60) / 5) * 5;
        min = Math.min(Math.max(min, 5), DUR_MAX_HORAS * 60 + 55);
        selH.value = String(Math.floor(min / 60));
        selM.value = String(min % 60);
        atualizar();
      },
      minutos(){ return parseInt(selH.value, 10) * 60 + parseInt(selM.value, 10); },
    };
  }
  const seletorDuracaoAtendimento = criarSeletorDuracao('apptDurPicker', 'apptDuration', 'min');
  seletorDuracaoAtendimento.definir(60);

  /* ---------- Modal (Novo Atendimento / Bloquear Horários) ---------- */
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalPatientLabel = document.getElementById('modalPatientLabel');
  const apptPatient = document.getElementById('apptPatient');
  const apptPatientSelect = document.getElementById('apptPatientSelect');
  const apptPatientSearchWrap = document.getElementById('apptPatientSearchWrap');
  const apptPatientSearch = document.getElementById('apptPatientSearch');
  const apptPatientResults = document.getElementById('apptPatientResults');
  const modalServiceField = document.getElementById('modalServiceField');
  const apptServicosContainer = document.getElementById('apptServicosContainer');
  const apptTime = document.getElementById('apptTime');
  const apptDuration = document.getElementById('apptDuration');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalWhatsappField = document.getElementById('modalWhatsappField');
  const apptEnviarWhatsapp = document.getElementById('apptEnviarWhatsapp');
  let modalMode = 'appt';

  function selecionarPacienteNoModal(paciente){
    apptPatientSelect.innerHTML = `<option value="${paciente.id}" selected>${paciente.name}</option>`;
    apptPatientSearch.value = paciente.name;
    apptPatientResults.classList.remove('open');
  }

  function limparSelecaoPaciente(){
    apptPatientSelect.innerHTML = '';
  }

  // Cria uma paciente rapidamente a partir da busca, sem sair do modal de agendamento.
  // Funciona tanto para contas reais (salva no Supabase) quanto no modo demonstração (só em memória).
  async function criarPaciente({ nome, codigo, numero, pais, nascimento }){
    const duplicada = encontrarPacienteDuplicado(nome, numero);
    if(duplicada){
      showToast('Já existe uma paciente cadastrada com esse nome e telefone: ' + duplicada.name);
      return null;
    }
    const usuario = await usuarioParaSalvar();
    if(!usuario && !modoDemonstracao) return null; // sessão caiu: não cria só na tela
    if(usuario){
      const { data, error } = await supabaseClient.from('pacientes')
        .insert({ profissional_id: usuario.id, nome: nome.trim(), status: 'Ativo', telefone_codigo: codigo, telefone_numero: numero.trim(),
                  pais: pais || null, data_nascimento: nascimento || null })
        .select().single();
      if(error){ showToast('Erro ao criar paciente: ' + error.message); return null; }
      await loadPacientesFromSupabase();
      return patients.find(p => String(p.id) === String(data.id)) || null;
    }
    const pal = avatarPalette[patients.length % avatarPalette.length];
    const novo = {
      id: 'demo-p-' + Date.now(), initials: initialsFromName(nome), color: pal.color, bg: pal.bg,
      name: nome.trim(), age: calcularIdade(nascimento), gender: '', phone: [codigo, numero.trim()].join(' '), phoneCode: codigo,
      phoneNumber: numero.trim(), pais: pais || '', dataNascimento: nascimento || '', email: '',
      rotina: null, acomp: { type: 'dash' }, status: 'Ativo',
    };
    patients.push(novo);
    renderPacientesTable();
    return novo;
  }


  function renderizarResultadosBuscaPaciente(){
    const termoRaw = apptPatientSearch.value.trim();
    const termo = termoRaw.toLowerCase();
    if(!termo){ apptPatientResults.classList.remove('open'); return; }

    const filtrados = patients.filter(p => (p.name || '').toLowerCase().includes(termo)).slice(0, 8);
    const nomeExato = patients.some(p => (p.name || '').toLowerCase() === termo);

    let html = filtrados.length > 0
      ? filtrados.map(p => `<div class="appt-patient-result-item" data-id="${p.id}">${p.name}</div>`).join('')
      : `<div class="appt-patient-result-empty">Nenhuma paciente encontrada.</div>`;
    if(!nomeExato){
      html += `<div class="appt-patient-result-add" data-novo="1">+ Adicionar nova paciente "${termoRaw}"</div>`;
    }

    apptPatientResults.innerHTML = html;
    apptPatientResults.classList.add('open');
  }

  apptPatientSearch.addEventListener('input', () => {
    limparSelecaoPaciente();
    renderizarResultadosBuscaPaciente();
  });
  apptPatientSearch.addEventListener('focus', () => {
    if(apptPatientSearch.value.trim()) renderizarResultadosBuscaPaciente();
  });
  document.addEventListener('click', (e) => {
    if(!apptPatientSearchWrap.contains(e.target)) apptPatientResults.classList.remove('open');
  });
  apptPatientResults.addEventListener('click', async (e) => {
    const itemEl = e.target.closest('.appt-patient-result-item');
    const addEl = e.target.closest('.appt-patient-result-add');
    if(itemEl){
      const paciente = patients.find(p => String(p.id) === String(itemEl.dataset.id));
      if(paciente) selecionarPacienteNoModal(paciente);
    } else if(addEl){
      const nome = apptPatientSearch.value.trim();
      if(!nome) return;
      apptPatientResults.classList.remove('open');
      const criada = await abrirNovaPaciente(nome);
      if(criada){
        selecionarPacienteNoModal(criada);
        showToast('Paciente "' + criada.name + '" adicionada com sucesso!');
      }
    }
  });

  // Permite marcar mais de um serviço para o mesmo atendimento (ex: Limpeza de Pele + Drenagem).
  function popularServicosCheckboxes(){
    let lista = servicosData;
    try{ lista = servicosAtivos(); }catch(e){} // serviços desativados não aparecem para novos agendamentos
    apptServicosContainer.innerHTML = lista.length
      ? lista.map(s => `
          <label style="display:flex; align-items:center; gap:8px; font-size:13.5px; color:var(--text-dark); cursor:pointer; margin:0;">
            <input type="checkbox" class="appt-servico-check" value="${s.nome}" data-duracao="${s.duracao}" style="width:15px; height:15px; accent-color:var(--sidebar-bg); cursor:pointer; flex-shrink:0; margin:0;">
            ${s.nome} <span style="color:var(--text-muted); font-size:12px;">(${s.duracao})</span>
          </label>
        `).join('')
      : '<span style="font-size:13px; color:var(--text-muted);">Nenhum serviço cadastrado</span>';
  }

  /* ---------- Busca digitada de serviços (igual à busca de paciente) ---------- */
  const apptServicoSearch = document.getElementById('apptServicoSearch');
  const apptServicoResults = document.getElementById('apptServicoResults');
  const apptServicoSearchWrap = document.getElementById('apptServicoSearchWrap');
  const apptServicosChips = document.getElementById('apptServicosChips');
  let servicoResultadoAtivo = 0;

  function checkboxesServicos(){ return Array.from(apptServicosContainer.querySelectorAll('.appt-servico-check')); }
  function semAcento(t){ return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function escHTML(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function marcarServico(nome, marcado){
    const cb = checkboxesServicos().find(c => c.value === nome);
    if(!cb) return;
    cb.checked = marcado;
    apptServicosContainer.dispatchEvent(new Event('change', { bubbles:true })); // recalcula a duração
    renderChipsServicos();
  }

  function renderChipsServicos(){
    apptServicosChips.innerHTML = '';
    checkboxesServicos().filter(c => c.checked).forEach(cb => {
      const chip = document.createElement('span');
      chip.className = 'serv-chip';
      chip.innerHTML = `${escHTML(cb.value)} <small>${escHTML(cb.dataset.duracao || '')}</small><button type="button" aria-label="Remover ${escHTML(cb.value)}">&times;</button>`;
      chip.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); marcarServico(cb.value, false); });
      apptServicosChips.appendChild(chip);
    });
    apptServicoSearch.placeholder = getServicosSelecionados().length ? 'Adicionar outro serviço...' : 'Buscar serviço por nome...';
  }

  function servicosFiltrados(){
    const termo = semAcento(apptServicoSearch.value.trim());
    return checkboxesServicos().filter(cb => !cb.checked && (!termo || semAcento(cb.value).includes(termo)));
  }

  function renderResultadosServico(){
    const lista = servicosFiltrados();
    if(!checkboxesServicos().length){
      apptServicoResults.innerHTML = '<div class="appt-patient-result-empty">Nenhum serviço cadastrado. Cadastre em Meu Negócio › Serviços.</div>';
    } else if(!lista.length){
      apptServicoResults.innerHTML = '<div class="appt-patient-result-empty">Nenhum serviço encontrado.</div>';
    } else {
      servicoResultadoAtivo = Math.min(servicoResultadoAtivo, lista.length - 1);
      apptServicoResults.innerHTML = lista.map((cb, i) =>
        `<div class="appt-patient-result-item${i === servicoResultadoAtivo ? ' ativo' : ''}" data-nome="${escHTML(cb.value)}">${escHTML(cb.value)}<span class="serv-dur">${escHTML(cb.dataset.duracao || '')}</span></div>`
      ).join('');
    }
    apptServicoResults.classList.add('open');
  }

  function escolherServico(nome){
    marcarServico(nome, true);
    apptServicoSearch.value = '';
    servicoResultadoAtivo = 0;
    apptServicoResults.classList.remove('open');
    apptServicoSearch.focus();
  }

  apptServicoSearch.addEventListener('input', () => { servicoResultadoAtivo = 0; renderResultadosServico(); });
  apptServicoSearch.addEventListener('focus', renderResultadosServico);
  apptServicoSearch.addEventListener('keydown', (e) => {
    const lista = servicosFiltrados();
    if(e.key === 'ArrowDown'){ e.preventDefault(); servicoResultadoAtivo = Math.min(servicoResultadoAtivo + 1, Math.max(lista.length - 1, 0)); renderResultadosServico(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); servicoResultadoAtivo = Math.max(servicoResultadoAtivo - 1, 0); renderResultadosServico(); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(lista[servicoResultadoAtivo]) escolherServico(lista[servicoResultadoAtivo].value); }
    else if(e.key === 'Escape'){ apptServicoResults.classList.remove('open'); }
    else if(e.key === 'Backspace' && !apptServicoSearch.value){
      const marcados = getServicosSelecionados();
      if(marcados.length) marcarServico(marcados[marcados.length - 1], false);
    }
  });
  apptServicoResults.addEventListener('mousedown', (e) => e.preventDefault()); // não perde o foco ao clicar
  apptServicoResults.addEventListener('click', (e) => {
    const item = e.target.closest('.appt-patient-result-item');
    if(item) escolherServico(item.dataset.nome);
  });
  document.addEventListener('click', (e) => {
    if(!apptServicoSearchWrap.contains(e.target)) apptServicoResults.classList.remove('open');
  });

  function getServicosSelecionados(){
    return Array.from(apptServicosContainer.querySelectorAll('.appt-servico-check:checked')).map(cb => cb.value);
  }

  // Converte algo como "1h", "45 min" ou "1h30" em minutos, para sugerir a duração do atendimento.
  function duracaoServicoParaMinutos(str){
    if(!str) return null;
    const texto = String(str).toLowerCase();
    const hMatch = texto.match(/(\d+)\s*h(?:oras?)?\s*(\d+)?/);
    const mMatch = texto.match(/(\d+)\s*min/);
    let minutos = 0, encontrou = false;
    if(hMatch){
      minutos += parseInt(hMatch[1], 10) * 60; encontrou = true;
      if(hMatch[2]) minutos += parseInt(hMatch[2], 10); // "1h30"
    } else if(mMatch){ minutos += parseInt(mMatch[1], 10); encontrou = true; }
    if(!encontrou){
      const n = parseInt(texto, 10);
      if(!isNaN(n)){ minutos = n; encontrou = true; }
    }
    return encontrou ? minutos : null;
  }

  // Ao marcar/desmarcar serviços, soma a duração de todos os selecionados e sugere a mais próxima disponível.
  apptServicosContainer.addEventListener('change', () => {
    const selecionados = apptServicosContainer.querySelectorAll('.appt-servico-check:checked');
    if(selecionados.length === 0) return;
    let totalMinutos = 0;
    selecionados.forEach(cb => {
      const minutos = duracaoServicoParaMinutos(cb.dataset.duracao);
      if(minutos) totalMinutos += minutos;
    });
    if(totalMinutos) seletorDuracaoAtendimento.definir(totalMinutos);
  });

  const apptDate = document.getElementById('apptDate');
  let edicaoAtual = null; // { key, item } quando o modal está editando um atendimento existente

  function openModal(mode, prefillTime){
    modalMode = mode;
    edicaoAtual = null;
    apptDate.value = dateKey(selectedDate);
    apptPatient.value = '';
    apptPatientSearch.value = '';
    apptPatientResults.classList.remove('open');
    limparSelecaoPaciente();
    apptTime.value = prefillTime || '09:00';
    seletorDuracaoAtendimento.definir(60);
    document.getElementById('apptObs').value = '';
    document.getElementById('modalObsField').style.display = mode === 'appt' ? 'block' : 'none';
    if(mode === 'appt'){
      modalTitle.textContent = 'Novo Atendimento';
      modalPatientLabel.textContent = 'Paciente';
      apptPatient.style.display = 'none';
      apptPatientSearchWrap.style.display = 'block';
      modalServiceField.style.display = 'block';
      popularServicosCheckboxes();
      apptServicoSearch.value = '';
      apptServicoResults.classList.remove('open');
      renderChipsServicos();
      modalConfirm.textContent = 'Agendar';
      modalWhatsappField.style.display = 'block';
    } else {
      modalTitle.textContent = 'Bloquear Horário';
      modalPatientLabel.textContent = 'Motivo (opcional)';
      apptPatient.placeholder = 'Ex: Almoço, Reunião';
      apptPatient.style.display = 'block';
      apptPatientSearchWrap.style.display = 'none';
      modalServiceField.style.display = 'none';
      modalConfirm.textContent = 'Bloquear';
      modalWhatsappField.style.display = 'none';
    }
    modalOverlay.classList.add('open');
  }
  function closeModal(){ modalOverlay.classList.remove('open'); edicaoAtual = null; }

  // Abre o mesmo formulário do "Novo Atendimento", já preenchido, para editar.
  function abrirEdicaoAtendimento(key, item){
    const isBlock = item.type === 'block';
    openModal(isBlock ? 'block' : 'appt', item.time);
    edicaoAtual = { key, item };
    apptDate.value = key;
    if(isBlock){
      apptPatient.value = item.label && item.label !== 'Horário bloqueado' ? item.label : '';
      modalTitle.textContent = 'Editar Bloqueio';
    } else {
      const paciente = pacienteDoItem(item);
      if(paciente) selecionarPacienteNoModal(paciente);
      else apptPatientSearch.value = item.label || '';
      // Serviços: marca os que já estavam no atendimento (mesmo que tenham saído do cadastro)
      (item.servico || '').split(',').map(s => s.trim()).filter(Boolean).forEach(nome => {
        let cb = checkboxesServicos().find(c => c.value === nome);
        if(!cb){
          const lbl = document.createElement('label');
          cb = document.createElement('input');
          cb.type = 'checkbox'; cb.className = 'appt-servico-check'; cb.value = nome; cb.dataset.duracao = ((servicosData.find(x => x.nome === nome) || {}).duracao) || '';
          lbl.appendChild(cb);
          apptServicosContainer.appendChild(lbl);
        }
        cb.checked = true;
      });
      renderChipsServicos();
      document.getElementById('apptObs').value = item.observacoes || '';
      modalTitle.textContent = 'Editar Atendimento';
    }
    seletorDuracaoAtendimento.definir(parseInt(item.duration, 10) || 60);
    modalConfirm.textContent = 'Salvar alterações';
    modalWhatsappField.style.display = 'none'; // confirmação é só para agendamento novo
  }

  async function salvarEdicaoAtendimento(){
    const { key: keyAntiga, item } = edicaoAtual;
    const isBlock = item.type === 'block';
    const novaKey = apptDate.value || keyAntiga;
    const hora = apptTime.value || item.time;
    const duracao = parseInt(apptDuration.value, 10) || item.duration || 60;
    const conflito = conflitoDeHorario(novaKey, hora, duracao, item);
    if(conflito){ showToast(mensagemConflito(novaKey, conflito)); return; }

    let pacienteId = item.pacienteId, label = item.label, servicoNome = item.servico || null, observacoes = item.observacoes || '';
    if(isBlock){
      label = apptPatient.value.trim() || 'Horário bloqueado';
    } else {
      const sel = patients.find(p => String(p.id) === String(apptPatientSelect.value));
      if(sel){ pacienteId = sel.id; label = sel.name; }
      else if(apptPatientSearch.value.trim() !== (item.label || '')){ showToast('Selecione uma paciente da lista.'); return; }
      const servicos = getServicosSelecionados();
      servicoNome = servicos.length ? servicos.join(', ') : null;
      observacoes = document.getElementById('apptObs').value.trim();
    }

    if(isAgendamentoReal(item)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
      const alteracoes = { data: novaKey, hora, duracao_min: duracao, duracao_minutos: duracao };
      if(isBlock) alteracoes.motivo = label;
      else { alteracoes.paciente_id = pacienteId; alteracoes.servico_nome = servicoNome; alteracoes.observacoes = observacoes || null; }
      modalConfirm.disabled = true;
      let { error } = await supabaseClient.from('agendamentos').update(alteracoes).eq('id', item.id);
      if(error && 'observacoes' in alteracoes && /observacoes/i.test(error.message || '')){
        delete alteracoes.observacoes;
        ({ error } = await supabaseClient.from('agendamentos').update(alteracoes).eq('id', item.id));
      }
      modalConfirm.disabled = false;
      if(error){ showToast(mensagemErroAgenda(error, 'Não foi possível salvar as alterações: ')); return; }
    } else if(!modoDemonstracao){
      showToast('Este atendimento não está salvo no banco. Recarregue a página.'); return;
    }

    Object.assign(item, { time: hora, duration: duracao, label, servico: servicoNome, pacienteId, observacoes });
    if(novaKey !== keyAntiga){
      const antiga = appointments[keyAntiga] || [];
      const i = antiga.indexOf(item);
      if(i !== -1) antiga.splice(i, 1);
      (appointments[novaKey] = appointments[novaKey] || []).push(item);
    }
    closeModal();
    renderCalendar();
    renderCurrentView();
    if(isAgendamentoReal(item)) sincronizarComGoogleAgenda(item.id);
    if(!isBlock){
      atualizarComandaDoAgendamento(item.id, { key: novaKey, pacienteId, cliente: label, servicoNome })
        .catch(e => console.warn('Comanda:', e));
    }
    showToast(isBlock ? 'Bloqueio atualizado!' : 'Atendimento atualizado!');
  }

  document.getElementById('apptDetEditar').addEventListener('click', () => {
    if(!apptDetAtual) return;
    const { key, item } = apptDetAtual;
    fecharDetalhesAtendimento();
    abrirEdicaoAtendimento(key, item);
  });

  document.getElementById('btnNovoAtendimento').addEventListener('click', () => openModal('appt'));
  document.getElementById('btnBloquearHorarios').addEventListener('click', () => openModal('block'));
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });

  async function sincronizarComGoogleAgenda(agendamentoId){
    if(!googleAgendaConectado) return;
    try{
      await supabaseClient.functions.invoke('sincronizar-google-agenda', { body: { agendamentoId } });
    } catch(e){
      console.warn('Não foi possível sincronizar com a Google Agenda.', e);
    }
  }

  async function dispararConfirmacaoWhatsapp(agendamentoId){
    try{
      const { error } = await supabaseClient.functions.invoke('enviar-confirmacao-whatsapp', {
        body: { agendamentoId },
      });
      if(error){
        showToast('Atendimento salvo, mas houve um erro ao enviar o WhatsApp.');
      } else {
        showToast('Atendimento agendado e confirmação enviada por WhatsApp!');
      }
    } catch(e){
      showToast('Atendimento salvo, mas não foi possível enviar o WhatsApp agora.');
    }
  }

  /* ---------- Confirmação por WhatsApp ----------
     Sem configurar nada: abre o WhatsApp da paciente com a mensagem pronta (você só aperta enviar).
     Com a API da Meta conectada em Configurações: envia sozinho pela função do servidor. */
  function numeroWhatsappDaPaciente(p){
    if(!p) return '';
    let codigo = String(p.phoneCode || '').replace(/\D/g, '');
    let numero = String(p.phoneNumber || '').replace(/\D/g, '');
    if(!numero && p.phone) numero = String(p.phone).replace(/\D/g, '');
    if(!numero) return '';
    if(!codigo){
      const pais = semAcento(p.pais || '');
      codigo = pais.includes('portugal') ? '351' : (pais.includes('brasil') || pais.includes('brazil')) ? '55' : '';
    }
    numero = numero.replace(/^0+/, '');
    const completo = (codigo && numero.startsWith(codigo) && numero.length >= codigo.length + 8) ? numero : codigo + numero;
    return completo.length >= 10 ? completo : '';
  }
  function mensagemConfirmacaoWhatsapp(pacienteNome, key, hora, servicos){
    const d = keyParaData(key);
    const primeiro = primeiroNomeDe(pacienteNome) || 'tudo bem';
    const dia = `${weekdayFull[d.getDay()].toLowerCase()}, ${formatarDataBR(key).slice(0, 5)}`;
    const assinatura = perfilProfissional && perfilProfissional.nome ? `\n\n${perfilProfissional.nome}` : '';
    return `Olá, ${primeiro}! 😊\nSeu atendimento${servicos ? ' de ' + servicos : ''} está confirmado para ${dia}, às ${hora}.\nSe precisar remarcar, é só me avisar por aqui.${assinatura}`;
  }
  function linkWhatsapp(paciente, texto){
    const numero = numeroWhatsappDaPaciente(paciente);
    return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : '';
  }
  // lembra a escolha da caixinha
  try{ apptEnviarWhatsapp.checked = localStorage.getItem('skinExpertConfirmarWhats') !== 'nao'; }catch(e){}
  apptEnviarWhatsapp.addEventListener('change', () => { try{ localStorage.setItem('skinExpertConfirmarWhats', apptEnviarWhatsapp.checked ? 'sim' : 'nao'); }catch(e){} });

  modalConfirm.addEventListener('click', async () => {
    if(edicaoAtual) return salvarEdicaoAtendimento();
    const viaApi = !!(integracaoWhatsapp && integracaoWhatsapp.ativo);
    const querWhats = modalMode === 'appt' && apptEnviarWhatsapp.checked;
    // A janela do WhatsApp tem que abrir já no clique (senão o navegador bloqueia como pop-up).
    let janela = null;
    if(querWhats && !viaApi){
      const keyPrev = apptDate.value || dateKey(selectedDate);
      const pacPrev = patients.find(p => String(p.id) === String(apptPatientSelect.value));
      if(pacPrev && numeroWhatsappDaPaciente(pacPrev) && !conflitoDeHorario(keyPrev, apptTime.value || '09:00', parseInt(apptDuration.value, 10), null)){
        janela = window.open('', '_blank');
        if(janela){ try{ janela.opener = null; janela.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Abrindo o WhatsApp…</p>'); }catch(e){} }
      }
    }
    let r = null;
    try{ r = await criarAtendimentoDoModal(); }
    finally{ if(!r && janela){ try{ janela.close(); }catch(e){} } }
    if(!r || r.tipo !== 'appt') return;

    if(!querWhats){ showToast('Atendimento agendado!'); return; }
    if(viaApi && isAgendamentoReal({ id: r.id })){
      showToast('Atendimento agendado! Enviando confirmação por WhatsApp...');
      dispararConfirmacaoWhatsapp(r.id);
      return;
    }
    const textoConf = msgDoModelo('confirmacao', { paciente: r.paciente, key: r.key, hora: r.hora, servico: r.servicos }) || mensagemConfirmacaoWhatsapp(r.paciente.name, r.key, r.hora, r.servicos);
    const url = linkWhatsapp(r.paciente, textoConf);
    if(!url){ showToast('Atendimento agendado! Esta paciente não tem telefone cadastrado para o WhatsApp.'); return; }
    if(janela){ janela.location.href = url; try{ registrarEnvio(r.paciente, 'confirmacao', textoConf); }catch(e){} showToast('Atendimento agendado! Confira e envie a mensagem no WhatsApp.'); }
    else showToast('Atendimento agendado! Para enviar a confirmação, abra o atendimento e toque em "WhatsApp".');
  });

  async function criarAtendimentoDoModal(){
    const key = apptDate.value || dateKey(selectedDate);
    if(!appointments[key]) appointments[key] = [];
    const hora = apptTime.value || '09:00';
    const duracao = parseInt(apptDuration.value, 10);

    const conflito = conflitoDeHorario(key, hora, duracao, null);
    if(conflito){ showToast(mensagemConflito(key, conflito)); return; }

    const usuarioLogado = await usuarioParaSalvar();
    if(!usuarioLogado && !modoDemonstracao) return; // sessão caiu: não salva só na tela

    if(usuarioLogado && modalMode === 'appt'){
      const pacienteId = apptPatientSelect.value;
      const pacienteSelecionado = patients.find(p => String(p.id) === String(pacienteId));
      if(!pacienteSelecionado){ showToast('Selecione uma paciente.'); return; }
      const servicosSelecionados = getServicosSelecionados();
      const servicoNome = servicosSelecionados.length ? servicosSelecionados.join(', ') : null;
      const observacoes = document.getElementById('apptObs').value.trim() || null;

      const registro = {
        profissional_id: usuarioLogado.id,
        paciente_id: pacienteSelecionado.id,
        data: key,
        hora: hora,
        duracao_min: duracao,
        duracao_minutos: duracao,
        tipo: 'appt',
        servico_nome: servicoNome,
      };
      if(observacoes) registro.observacoes = observacoes;
      let { data: inserted, error } = await supabaseClient.from('agendamentos').insert(registro).select().single();
      let obsNaoSalva = false;
      // Se a coluna "observacoes" ainda não existir no banco, salva o atendimento mesmo assim.
      if(error && observacoes && /observacoes/i.test(error.message || '')){
        delete registro.observacoes;
        ({ data: inserted, error } = await supabaseClient.from('agendamentos').insert(registro).select().single());
        obsNaoSalva = true;
      }

      if(error){ showToast(mensagemErroAgenda(error, 'Erro ao salvar atendimento: ')); return; }

      appointments[key].push({
        id: inserted.id, time: hora, duration: duracao,
        label: pacienteSelecionado.name, servico: servicoNome, type: 'appt',
        pacienteId: pacienteSelecionado.id, observacoes: observacoes || '',
      });
      if(obsNaoSalva) console.warn('Coluna "observacoes" não existe na tabela agendamentos — observação mantida só nesta sessão.');
      closeModal();
      renderCalendar();
      renderCurrentView();

      criarComandaDoAgendamento({ agendamentoId: inserted.id, key, pacienteId: pacienteSelecionado.id, cliente: pacienteSelecionado.name, servicoNome })
        .catch(e => console.warn('Comanda:', e));

      sincronizarComGoogleAgenda(inserted.id);

      return { tipo: 'appt', id: inserted.id, paciente: pacienteSelecionado, key, hora, servicos: servicoNome };
    }

    if(usuarioLogado && modalMode === 'block'){
      const motivo = apptPatient.value.trim() || 'Horário bloqueado';
      const { data: inserted, error } = await supabaseClient.from('agendamentos').insert({
        profissional_id: usuarioLogado.id,
        data: key,
        hora: hora,
        duracao_min: duracao,
        duracao_minutos: duracao,
        tipo: 'block',
        motivo: motivo,
      }).select().single();

      if(error){ showToast(mensagemErroAgenda(error, 'Erro ao bloquear horário: ')); return; }

      appointments[key].push({ id: inserted.id, time: hora, duration: duracao, label: motivo, type: 'block' });
      closeModal();
      renderCalendar();
      renderCurrentView();
      sincronizarComGoogleAgenda(inserted.id);
      showToast('Horário bloqueado!');
      return { tipo: 'block' };
    }

    // Modo demonstração (sem sessão real): mantém o comportamento local, sem Supabase
    if(modalMode === 'appt' && !patients.find(p => String(p.id) === String(apptPatientSelect.value))){
      showToast('Selecione uma paciente.');
      return;
    }
    const pacienteDemoObj = modalMode === 'appt' ? patients.find(p => String(p.id) === String(apptPatientSelect.value)) : null;
    const pacienteDemo = modalMode === 'appt'
      ? (pacienteDemoObj?.name || 'Paciente sem nome')
      : (apptPatient.value.trim() || 'Horário bloqueado');
    const idDemo = Date.now();
    if(modalMode === 'appt'){
      criarComandaDoAgendamento({ agendamentoId: idDemo, key, pacienteId: pacienteDemoObj ? pacienteDemoObj.id : null,
        cliente: pacienteDemo, servicoNome: getServicosSelecionados().join(', ') || null });
    }
    appointments[key].push({
      id: idDemo,
      pacienteId: pacienteDemoObj ? pacienteDemoObj.id : null,
      observacoes: modalMode === 'appt' ? document.getElementById('apptObs').value.trim() : '',
      time: hora,
      duration: duracao,
      label: pacienteDemo,
      servico: modalMode === 'appt' ? (getServicosSelecionados().join(', ') || null) : null,
      type: modalMode
    });
    const tipoCriado = modalMode;
    closeModal();
    renderCalendar();
    renderCurrentView();
    if(tipoCriado !== 'appt'){ showToast('Horário bloqueado!'); return { tipo: 'block' }; }
    return { tipo: 'appt', id: idDemo, paciente: pacienteDemoObj, key, hora, servicos: getServicosSelecionados().join(', ') || null };
  }

  // Carrega a agenda do Supabase.
  // - Só um carregamento por vez: se a página e o login pedirem ao mesmo tempo, os dois usam o mesmo.
  // - Se der erro (ex.: a sessão estava sendo renovada naquele instante), tenta de novo até 3 vezes.
  // - O aviso só aparece se todas as tentativas falharem, e mostra o motivo.
  let carregamentoAgendaEmAndamento = null;
  function loadAgendamentosFromSupabase(){
    if(carregamentoAgendaEmAndamento) return carregamentoAgendaEmAndamento;
    carregamentoAgendaEmAndamento = carregarAgendaComTentativas().finally(() => { carregamentoAgendaEmAndamento = null; });
    return carregamentoAgendaEmAndamento;
  }

  // Tenta do pedido mais completo ao mais simples. Se o banco não tiver alguma coluna
  // (ex.: google_event_id, observacoes) ou a ligação agendamentos → pacientes, o pedido
  // completo é recusado inteiro; antes isso fazia a agenda aparecer vazia ao recarregar.
  async function buscarAgendamentosUmaVez(){
    const consultas = [
      'id, data, hora, duracao_min, duracao_minutos, tipo, motivo, servico_nome, paciente_id, google_event_id, observacoes, status, pacientes ( nome )',
      '*, pacientes ( nome )',
      '*',
    ];
    let data = null, error = null;
    for(const campos of consultas){
      ({ data, error } = await supabaseClient.from('agendamentos').select(campos));
      if(!error && data) return { data, error: null };
      console.warn('Agenda: consulta "' + campos + '" falhou:', error && error.message);
      // Erro de sessão/rede: não adianta simplificar a consulta, volta para tentar de novo.
      if(error && /jwt|token|fetch|network|timeout|failed/i.test(error.message || '')) break;
    }
    return { data, error };
  }

  // Preenche o nome da paciente a partir da lista de pacientes quando a agenda veio sem ele.
  function completarNomesAgenda(){
    let mudou = false;
    Object.keys(appointments).forEach(k => (appointments[k] || []).forEach(a => {
      if(a.type === 'appt' && a.pacienteId != null && (!a.label || a.label === 'Paciente sem nome')){
        const p = patients.find(pp => String(pp.id) === String(a.pacienteId));
        if(p && p.name){ a.label = p.name; mudou = true; }
      }
    }));
    if(mudou){ renderCalendar(); renderCurrentView(); }
  }

  async function carregarAgendaComTentativas(){
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return; // não logado: mantém os dados de exemplo locais

      let data = null, error = null;
      for(let tentativa = 1; tentativa <= 3; tentativa++){
        try{
          ({ data, error } = await buscarAgendamentosUmaVez());
        } catch(e){
          data = null; error = e;
        }
        if(!error && data) break;
        console.warn(`Agenda: tentativa ${tentativa} de 3 falhou.`, error);
        if(tentativa < 3) await new Promise(r => setTimeout(r, 900 * tentativa));
      }

      if(error || !data){
        // Conta real: nunca deixar os atendimentos de exemplo (modo demonstração) na tela.
        Object.keys(appointments).forEach(k => delete appointments[k]);
        renderCalendar();
        renderCurrentView();
        const motivo = (error && (error.message || error.error_description || String(error))) || 'sem resposta do servidor';
        showToast('Não foi possível carregar sua agenda (' + motivo.slice(0, 90) + '). Recarregue a página antes de fazer alterações.');
        agendaCarregadaOk = false;
        return;
      }
      agendaCarregadaOk = true;

      Object.keys(appointments).forEach(k => delete appointments[k]);
      data.forEach(row => {
        if(row.status === 'cancelado') return; // cancelados ficam no banco (histórico), fora da agenda
        let chaveData = String(row.data || '');
        if(chaveData.includes('T')){ const d = new Date(chaveData); if(!isNaN(d)) chaveData = dateKey(d); }
        chaveData = chaveData.slice(0, 10);
        row.data = chaveData;
        if(!appointments[row.data]) appointments[row.data] = [];
        appointments[row.data].push({
          id: row.id,
          time: (row.hora || '00:00:00').slice(0,5),
          duration: parseInt(row.duracao_min || row.duracao_minutos, 10) || 60,
          label: row.tipo === 'block' ? (row.motivo || 'Horário bloqueado')
            : (row.pacientes?.nome || (patients.find(pp => String(pp.id) === String(row.paciente_id)) || {}).name || 'Paciente sem nome'),
          servico: row.servico_nome || null,
          type: row.tipo === 'block' ? 'block' : 'appt',
          pacienteId: row.paciente_id || null,
          observacoes: row.observacoes || '',
          googleEventId: row.google_event_id || null,
        });
      });
      renderCalendar();
      renderCurrentView();
    } catch(e){
      console.warn('Agenda: erro inesperado ao montar a agenda.', e);
      showToast('Não foi possível montar sua agenda (' + String(e && e.message || e).slice(0, 90) + '). Recarregue a página.');
    }
  }
