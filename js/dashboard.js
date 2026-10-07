/* Skin Expert Pro — Dashboard: Acompanhamentos e quadro de Lembretes.
   Arquivo 9 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= ACOMPANHAMENTOS (Dashboard + coluna da Lista de Pacientes) =================
     Cada Plano de SkinCare tem uma duração em dias. A partir do plano MAIS RECENTE de cada paciente:
       - Lista de Pacientes: "Última rotina" = data do plano; "Acompanhamento" = "Dia X / N" ou "Encerrado".
       - Dashboard: aparece quem está a ACOMP_DIAS_ANTES dias (ou menos) do fim do plano, e continua
         listada até ACOMP_DIAS_DEPOIS dias depois do fim — some antes disso se já tiver retorno agendado. */
  const ACOMP_DIAS_ANTES = 7;
  const ACOMP_DIAS_DEPOIS = 15;
  const ultimoPlanoPorPaciente = {}; // { pacienteId: { inicioKey:'2026-10-01', dias:21 } }

  function situacaoAcompanhamento(plano){
    if(!plano || !plano.dias) return null;
    const hojeKey = dateKey(today);
    const ultimoDiaKey = addDiasKey(plano.inicioKey, plano.dias - 1);
    const diaAtual = diasEntre(plano.inicioKey, hojeKey) + 1;
    const restantes = diasEntre(hojeKey, ultimoDiaKey); // 0 = hoje é o último dia; negativo = já acabou
    return { diaAtual, dias: plano.dias, restantes, ultimoDiaKey, encerrado: restantes < 0 };
  }

  function aplicarAcompanhamentoNosPacientes(){
    patients.forEach(p => {
      const plano = ultimoPlanoPorPaciente[p.id];
      if(!plano){ p.rotina = null; p.acomp = { type:'dash' }; return; }
      p.rotina = formatarDataBR(plano.inicioKey);
      const s = situacaoAcompanhamento(plano);
      if(!s) p.acomp = { type:'dash' };
      else if(s.encerrado) p.acomp = { type:'gray', label:'Encerrado' };
      else p.acomp = { type:'green', label:`Dia ${Math.max(1, s.diaAtual)} / ${s.dias}` };
    });
  }

  function temRetornoAgendado(p){
    const hojeKey = dateKey(today);
    const nome = (p.name || '').trim().toLowerCase();
    return Object.keys(appointments).some(k => k >= hojeKey && (appointments[k] || []).some(a =>
      a.type === 'appt' && (a.pacienteId != null
        ? String(a.pacienteId) === String(p.id)
        : (a.label || '').trim().toLowerCase() === nome)));
  }

  async function carregarAcompanhamentos(){
    Object.keys(ultimoPlanoPorPaciente).forEach(k => delete ultimoPlanoPorPaciente[k]);
    if(modoDemonstracao){
      // Exemplos relativos a hoje, para o quadro aparecer preenchido na demonstração
      const inicio = diasAtras => addDiasKey(dateKey(today), -diasAtras);
      Object.assign(ultimoPlanoPorPaciente, {
        p1: { inicioKey: inicio(120), dias: 60 },
        p3: { inicioKey: inicio(34),  dias: 30 },  // encerrado há 5 dias
        p4: { inicioKey: inicio(86),  dias: 90 },  // dia 87 de 90 → termina em 3 dias
        p5: { inicioKey: inicio(11),  dias: 60 },
      });
    } else {
      const { data, error } = await supabaseClient
        .from('planos_skincare')
        .select('paciente_id, data_gerada, duracao_dias')
        .order('data_gerada', { ascending: false });
      if(error){ console.warn('Acompanhamentos:', error.message); return; }
      (data || []).forEach(row => {
        if(ultimoPlanoPorPaciente[row.paciente_id]) return; // já pegamos o mais recente
        ultimoPlanoPorPaciente[row.paciente_id] = { inicioKey: dateKey(new Date(row.data_gerada)), dias: parseInt(row.duracao_dias, 10) || null };
      });
    }
    aplicarAcompanhamentoNosPacientes();
    renderPacientesTable(); // também redesenha o Dashboard
  }

  // Chamado logo depois de salvar um Plano de SkinCare
  function registrarNovoPlanoAcompanhamento(paciente, duracao){
    if(!paciente) return;
    ultimoPlanoPorPaciente[paciente.id] = { inicioKey: dateKey(today), dias: parseInt(duracao, 10) || null };
    aplicarAcompanhamentoNosPacientes();
    renderPacientesTable();
  }

  function renderAcompanhamentos(){
    const container = document.getElementById('acompanhamentosContainer');
    if(!container) return;
    const lista = patients
      .map(p => ({ p, s: situacaoAcompanhamento(ultimoPlanoPorPaciente[p.id]) }))
      .filter(({ p, s }) => s && p.status !== 'Inativo' && p.status !== 'Inativa'
        && s.restantes <= ACOMP_DIAS_ANTES && s.restantes >= -ACOMP_DIAS_DEPOIS
        && !temRetornoAgendado(p))
      .sort((a, b) => a.s.restantes - b.s.restantes);

    container.innerHTML = '';
    if(!lista.length){
      container.innerHTML = '<div class="empty-state">Nenhum acompanhamento próximo do encerramento.</div>';
      return;
    }
    lista.forEach(({ p, s }) => {
      const r = s.restantes;
      const quando = r > 1 ? `Termina em ${r} dias` : r === 1 ? 'Termina amanhã' : r === 0 ? 'Termina hoje'
                   : r === -1 ? 'Encerrou ontem' : `Encerrou há ${-r} dias`;
      const detalhe = s.encerrado ? `Plano de ${s.dias} dias` : `Dia ${Math.max(1, s.diaAtual)} de ${s.dias}`;
      const row = document.createElement('div');
      row.className = 'acomp-row';
      row.innerHTML = `
        <div class="acomp-nome" title="Abrir registro">${escHTML(p.name)}</div>
        <div><span class="pill ${s.encerrado ? 'pill-gray' : 'pill-green'}">${quando}</span><div class="acomp-sub">${detalhe}</div></div>
        <div class="acomp-acoes">
          <button class="lemb-btn whats" data-a="whats" title="Enviar mensagem no WhatsApp">WhatsApp</button>
          <button class="lemb-btn" data-a="agendar" title="Agendar retorno">Agendar</button>
        </div>`;
      row.querySelector('.acomp-nome').addEventListener('click', () => openPatientRegistro(p.id, 'recomendacoes'));
      row.querySelector('[data-a="whats"]').addEventListener('click', () => {
        const texto = s.encerrado
          ? `Oi, ${primeiroNomeDe(p.name)}! Seu plano de skincare terminou. Vamos marcar sua reavaliação para ver os resultados e ajustar a rotina?`
          : `Oi, ${primeiroNomeDe(p.name)}! Seu plano de skincare está chegando ao fim. Vamos marcar sua reavaliação para ver os resultados e ajustar a rotina?`;
        try{ abrirEnvioMensagem({ paciente: p, modelo: 'retorno', textoInicial: texto }); }
        catch(e){ const url = linkWhatsapp(p, texto); if(url) window.open(url, '_blank', 'noopener'); }
      });
      row.querySelector('[data-a="agendar"]').addEventListener('click', () => {
        const nav = document.querySelector('.nav-item[data-view="agenda"]');
        if(nav) nav.click();
        openModal('appt');
        selecionarPacienteNoModal(p);
      });
      container.appendChild(row);
    });
  }

  function renderLembretes(){
    try{ renderAcompanhamentos(); }catch(e){}
    const container = document.getElementById('lembretesContainer');
    if(!container) return;
    const hojeKey = dateKey(today);
    const todos = todosLembretes();
    const pendentes = todos.filter(l => l.data <= hojeKey);
    const futuros = todos.filter(l => l.data > hojeKey);
    const visiveis = lembretesMostrarFuturos ? todos : pendentes;

    container.innerHTML = '';
    if(visiveis.length === 0){
      container.innerHTML = `<div class="empty-state">${futuros.length ? 'Nenhum lembrete para hoje. 🎉' : 'Nenhum lembrete no momento.'}</div>`;
    }

    const iconeWhats = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.8-1.2A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.7.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';

    visiveis.forEach(l => {
      const quando = descreverQuando(l.data);
      const link = l.paciente ? linkWhatsapp(l.paciente, l.msg) : null;
      const el = document.createElement('div');
      el.className = 'lemb-item' + (quando.atrasado ? ' atrasado' : '');
      el.innerHTML = `
        <div class="lemb-topo">
          <span class="lemb-tipo ${l.tipo}">${l.tipoLabel}</span>
          <span class="lemb-quando ${quando.atrasado ? 'atrasado' : ''}">${quando.txt}</span>
          ${(() => { try{ const mod = l.modelo || ({ pos:'pos', retorno:'retorno', sumida:'sumida' })[l.tipo]; return mod && l.paciente && jaEnviadoHoje(l.paciente, mod) ? '<span class="msg-enviado" style="margin-left:auto;">✓ enviado</span>' : ''; }catch(e){ return ''; } })()}
        </div>
        ${l.pacienteNome ? `<div class="lemb-paciente">${l.pacienteNome}</div>` : ''}
        <div class="lemb-texto"></div>
        <div class="lemb-acoes">
          ${link ? `<button class="lemb-btn whats" data-a="whats">${iconeWhats} WhatsApp</button>` : ''}
          <button class="lemb-btn" data-a="ok">✓ Concluir</button>
          <button class="lemb-btn" data-a="adiar">Adiar ▾</button>
        </div>
      `;
      el.querySelector('.lemb-texto').textContent = l.texto; // texto livre: evita injetar HTML
      const nomeEl = el.querySelector('.lemb-paciente');
      if(nomeEl && l.paciente) nomeEl.addEventListener('click', () => openPatientRegistro(l.paciente.id, 'dados'));
      else if(nomeEl) nomeEl.style.cursor = 'default';
      const w = el.querySelector('[data-a="whats"]');
      if(w) w.addEventListener('click', () => {
        const modelo = l.modelo || ({ pos: 'pos', retorno: 'retorno', sumida: 'sumida' })[l.tipo];
        try{ abrirEnvioMensagem({ paciente: l.paciente, modelo, ...(l.ctx || {}), textoInicial: modelo ? null : l.msg }); }
        catch(e){ window.open(link, '_blank', 'noopener'); }
      });
      el.querySelector('[data-a="ok"]').addEventListener('click', () => concluirLembrete(l));
      el.querySelector('[data-a="adiar"]').addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.lemb-adiar-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'lemb-adiar-menu';
        menu.style.left = e.currentTarget.offsetLeft + 'px';
        [['Amanhã', 1], ['Em 3 dias', 3], ['Semana que vem', 7], ['Daqui a 1 mês', 30]].forEach(([rotulo, dias]) => {
          const b = document.createElement('button');
          b.textContent = rotulo;
          b.addEventListener('click', () => { menu.remove(); adiarLembrete(l, dias); });
          menu.appendChild(b);
        });
        el.querySelector('.lemb-acoes').appendChild(menu);
      });
      container.appendChild(el);
    });

    if(futuros.length){
      const rod = document.createElement('div');
      rod.className = 'lemb-rodape';
      rod.innerHTML = lembretesMostrarFuturos
        ? `<span></span><a>Mostrar só os de hoje</a>`
        : `<span>${futuros.length} agendado${futuros.length === 1 ? '' : 's'} para os próximos dias</span><a>Ver todos</a>`;
      rod.querySelector('a').addEventListener('click', () => { lembretesMostrarFuturos = !lembretesMostrarFuturos; renderLembretes(); });
      container.appendChild(rod);
    }
  }
  document.addEventListener('click', (e) => {
    if(!e.target.closest('.lemb-adiar-menu')) document.querySelectorAll('.lemb-adiar-menu').forEach(m => m.remove());
  });

  /* ---------- Novo lembrete ---------- */
  const modalLembreteOverlay = document.getElementById('modalLembreteOverlay');
  document.getElementById('btnLembrete').addEventListener('click', () => {
    const sel = document.getElementById('lembretePaciente');
    const ordenadas = patients.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
    sel.innerHTML = '<option value="">— Sem paciente —</option>' +
      ordenadas.map(p => `<option value="${p.id}">${(p.name || '').replace(/</g, '&lt;')}</option>`).join('');
    document.getElementById('lembreteTexto').value = '';
    document.getElementById('lembreteData').value = dateKey(today);
    modalLembreteOverlay.classList.add('open');
    setTimeout(() => document.getElementById('lembreteTexto').focus(), 50);
  });
  document.getElementById('modalLembreteCancelar').addEventListener('click', () => modalLembreteOverlay.classList.remove('open'));
  modalLembreteOverlay.addEventListener('click', (e) => { if(e.target === modalLembreteOverlay) modalLembreteOverlay.classList.remove('open'); });
  document.getElementById('modalLembreteSalvar').addEventListener('click', () => {
    const texto = document.getElementById('lembreteTexto').value.trim();
    if(!texto){ showToast('Escreva o lembrete.'); return; }
    const pacienteId = document.getElementById('lembretePaciente').value || null;
    const paciente = pacienteId ? patients.find(p => String(p.id) === String(pacienteId)) : null;
    const data = document.getElementById('lembreteData').value || dateKey(today);
    lembretesEstado.manuais.push({
      id: 'm-' + Date.now(), texto, data,
      pacienteId: paciente ? paciente.id : null, pacienteNome: paciente ? paciente.name : '',
    });
    salvarLembretes();
    modalLembreteOverlay.classList.remove('open');
    if(data > dateKey(today)) lembretesMostrarFuturos = true;
    renderLembretes();
    showToast('Lembrete salvo!');
  });

  /* init */
  renderCalendar();
  renderCurrentView();
  // (loadAgendamentosFromSupabase roda no enterApp, depois do login — aqui só duplicava o carregamento)
