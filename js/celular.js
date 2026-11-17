/* Skin Expert Pro — Celular: menu de baixo, conta e áreas só do computador.
   Arquivo 17 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= CELULAR: menu de baixo, conta e áreas só do computador ================= */
  // ehCelular() fica no nucleo.js (é usada por vários arquivos)
  const mobileNavEl = document.getElementById('mobileNav');
  function marcarMenuCelular(){
    const ativa = document.querySelector('.view.active');
    const id = ativa ? ativa.id.replace('view-', '') : '';
    const alvo = id === 'registro-paciente' ? 'pacientes' : id;
    mobileNavEl.querySelectorAll('button[data-view]').forEach(b => {
      const on = b.dataset.view === alvo;
      b.classList.toggle('active', on);
      if(on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  mobileNavEl.querySelectorAll('button[data-view]').forEach(b => b.addEventListener('click', () => {
    const item = document.querySelector(`.nav-item[data-view="${b.dataset.view}"]`);
    if(item) item.click();
    window.scrollTo(0, 0);
    marcarMenuCelular();
  }));
  new MutationObserver(marcarMenuCelular).observe(document.querySelector('.main'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  marcarMenuCelular();

  // Áreas que ficam só no computador: no celular aparece um aviso no lugar da tela
  const SO_COMPUTADOR = { catalogo: 'O Catálogo de Produtos', produto: 'O Catálogo de Produtos', financeiro: 'O Financeiro', equipe: 'O Meu Negócio', configuracoes: 'As Configurações', planos: 'Os Planos' };
  Object.keys(SO_COMPUTADOR).forEach(v => {
    const view = document.getElementById('view-' + v);
    if(!view) return;
    view.classList.add('so-computador');
    const aviso = document.createElement('div');
    aviso.className = 'aviso-computador';
    aviso.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      <h2>Disponível no computador</h2>
      <p>${SO_COMPUTADOR[v]} fica na versão para computador. No celular você usa o Dashboard, a Agenda e as Pacientes.</p>
      <button type="button">Voltar ao Dashboard</button>`;
    aviso.querySelector('button').addEventListener('click', () => { const d = document.querySelector('.nav-item[data-view="dashboard"]'); if(d) d.click(); });
    view.prepend(aviso);
  });

  // Ao virar celular com uma aba "só computador" aberta na ficha, volta para Dados
  window.matchMedia('(max-width: 760px)').addEventListener('change', (e) => {
    if(!e.matches || !ehCelular()) return;
    const aba = document.querySelector('.registro-tab.active');
    if(aba && ['planoskincare', 'recomendacoes'].includes(aba.dataset.tab)) switchRegistroTab('dados');
  });

  // Menu da conta (avatar no topo): Sair
  const btnConta = document.getElementById('btnConta'), contaMenu = document.getElementById('contaMenu');
  function fecharMenuConta(){ contaMenu.classList.remove('open'); btnConta.setAttribute('aria-expanded', 'false'); }
  btnConta.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = !contaMenu.classList.contains('open');
    if(abrir){
      const nome = (typeof perfilProfissional !== 'undefined' && perfilProfissional && perfilProfissional.nome) || '';
      const caixa = document.getElementById('contaNome');
      caixa.textContent = '';
      const rot = document.createElement('div'); rot.textContent = 'Perfil:';
      rot.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:2px;';
      const nm = document.createElement('div'); nm.textContent = nome || 'Minha conta';
      nm.style.cssText = 'font-size:14px;font-weight:600;color:var(--text-dark);';
      caixa.append(rot, nm);
    }
    contaMenu.classList.toggle('open', abrir);
    btnConta.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  });
  contaMenu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fecharMenuConta);
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') fecharMenuConta(); });
  document.getElementById('contaSair').addEventListener('click', () => {
    fecharMenuConta();
    const sair = document.querySelector('.nav-item[data-logout]');
    if(sair) sair.click();
  });


  /* ================= CELULAR — visual novo (nov/2026) =================
     Menu de baixo com "+", Início com o resumo do dia, Agenda com Dia/Semana/Mês e linha de "agora". */
  const celEsc = (t) => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const celIrPara = (view) => { const it = document.querySelector(`.nav-item[data-view="${view}"]`); if(it) it.click(); window.scrollTo(0, 0); marcarMenuCelular(); };
  const celRedesenharAgenda = () => { try{ renderCalendar(); renderCurrentView(); }catch(e){} };

  // Marca no <body> qual tela está aberta (o topo do Início muda no celular)
  function celMarcarTela(){
    const ativa = document.querySelector('.view.active');
    const id = ativa ? ativa.id.replace('view-', '') : '';
    document.body.classList.toggle('cel-tela-inicio', id === 'dashboard');
  }
  new MutationObserver(celMarcarTela).observe(document.querySelector('.main'), { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- Painéis que sobem de baixo (+ e Menu) ---------- */
  function celAbrirPainel(titulo, itens){
    celFecharPainel();
    const fundo = document.createElement('div');
    fundo.className = 'cel-painel-fundo';
    fundo.id = 'celPainel';
    fundo.innerHTML = `<div class="cel-painel" role="dialog" aria-modal="true" aria-label="${celEsc(titulo)}">
      <div class="cel-painel-alca" aria-hidden="true"></div>
      <h2 class="cel-painel-titulo">${celEsc(titulo)}</h2>
      <div class="cel-painel-itens"></div></div>`;
    const lista = fundo.querySelector('.cel-painel-itens');
    itens.forEach(it => {
      if(it.nota){ const n = document.createElement('p'); n.className = 'cel-painel-nota'; n.textContent = it.nota; lista.appendChild(n); return; }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cel-painel-item' + (it.destaque ? ' destaque' : '');
      b.innerHTML = `<span class="cel-painel-icone ${it.cor || ''}">${it.icone}</span><span class="cel-painel-txt"><b>${celEsc(it.titulo)}</b>${it.sub ? `<small>${celEsc(it.sub)}</small>` : ''}</span>`;
      b.addEventListener('click', () => { celFecharPainel(); it.acao(); });
      lista.appendChild(b);
    });
    fundo.addEventListener('click', (e) => { if(e.target === fundo) celFecharPainel(); });
    document.body.appendChild(fundo);
    document.body.classList.add('cel-painel-aberto');
    requestAnimationFrame(() => fundo.classList.add('aberto'));
    const primeiro = fundo.querySelector('.cel-painel-item'); if(primeiro) primeiro.focus();
  }
  function celFecharPainel(){
    const p = document.getElementById('celPainel');
    if(p) p.remove();
    document.body.classList.remove('cel-painel-aberto');
  }
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') celFecharPainel(); });

  const CEL_ICONES = {
    atendimento: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    paciente: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="4"/><path d="M3 20c.9-3.6 3.6-6 7-6s6.1 2.4 7 6M19 8v6M16 11h6"/></svg>',
    bloquear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    tutoriais: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/></svg>',
    sair: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  };

  function celNovoAtendimento(){
    // Sem dia escolhido na Agenda, o atendimento novo é para hoje
    const agendaAberta = document.getElementById('view-agenda').classList.contains('active');
    if(!agendaAberta){ selectedDate = new Date(today); viewMonth = today.getMonth(); viewYear = today.getFullYear(); }
    openModal('appt');
  }
  function celAbrirMais(){
    celAbrirPainel('O que você quer criar?', [
      { titulo: 'Novo atendimento', sub: 'Escolha cliente, serviço e horário', icone: CEL_ICONES.atendimento, destaque: true, acao: celNovoAtendimento },
      { titulo: 'Nova paciente', sub: 'Cadastro com nome, telefone e e-mail', icone: CEL_ICONES.paciente, cor: 'dourado', acao: () => { const b = document.getElementById('btnNovoPaciente'); if(b) b.click(); } },
      { titulo: 'Bloquear horário', sub: 'Almoço, folga, curso…', icone: CEL_ICONES.bloquear, cor: 'neutro', acao: () => openModal('block') },
    ]);
  }
  function celAbrirMenu(){
    celAbrirPainel('Menu', [
      { titulo: 'Tutoriais', sub: 'Perguntas e respostas sobre o app', icone: CEL_ICONES.tutoriais, cor: 'dourado', acao: () => celIrPara('tutoriais') },
      { nota: 'Catálogo, Financeiro, Meu Negócio e Configurações ficam na versão para computador.' },
      { titulo: 'Sair da conta', icone: CEL_ICONES.sair, cor: 'neutro', acao: () => { const s = document.querySelector('.nav-item[data-logout]'); if(s) s.click(); } },
    ]);
  }
  document.getElementById('celBtnMais').addEventListener('click', celAbrirMais);
  document.getElementById('celBtnMenu').addEventListener('click', celAbrirMenu);

  /* ---------- Início: saudação, números do dia e atendimentos de hoje ---------- */
  const celSaudacao = document.createElement('div');
  celSaudacao.className = 'cel-saudacao';
  celSaudacao.innerHTML = '<span class="cel-saudacao-data"></span><span class="cel-saudacao-ola"></span>';
  document.getElementById('pageTitle').parentElement.appendChild(celSaudacao);

  const celInicio = document.createElement('section');
  celInicio.className = 'cel-inicio';
  celInicio.setAttribute('aria-label', 'Resumo de hoje');
  document.getElementById('view-dashboard').prepend(celInicio);

  const CEL_DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  function celAniversariosDoMes(){
    try{
      const hoje = new Date(), mes = hoje.getMonth();
      return (patients || []).filter(p => { const n = partesDataNascimento(p.dataNascimento); return n && aniversarioNoAno(n, hoje.getFullYear()).getMonth() === mes; }).length;
    }catch(e){ return 0; }
  }
  function renderInicioCelular(){
    const agora = new Date();
    const h = agora.getHours();
    const nome = primeiroNomeDe((typeof perfilProfissional !== 'undefined' && perfilProfissional && perfilProfissional.nome) || '');
    celSaudacao.querySelector('.cel-saudacao-data').textContent = `${CEL_DIAS[agora.getDay()]}, ${agora.getDate()} de ${monthNames[agora.getMonth()].toLowerCase()}`;
    celSaudacao.querySelector('.cel-saudacao-ola').textContent = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + (nome ? ', ' + nome : '');

    const chaveHoje = dateKey(today);
    const deHoje = (appointments[chaveHoje] || []).filter(a => a.type === 'appt' && a.status !== 'cancelado').sort((a, b) => timeStrToMinutes(a.time) - timeStrToMinutes(b.time));
    let naSemana = 0;
    const ini = getWeekStart(today);
    for(let i = 0; i < 7; i++){ const d = new Date(ini); d.setDate(d.getDate() + i); naSemana += (appointments[dateKey(d)] || []).filter(a => a.type === 'appt' && a.status !== 'cancelado').length; }
    const minAgora = agora.getHours() * 60 + agora.getMinutes();

    const numeros = [[deHoje.length, 'hoje'], [naSemana, 'na semana'], [celAniversariosDoMes(), 'aniversários']]
      .map(([n, t]) => `<div class="cel-numero"><b>${n}</b><span>${t}</span></div>`).join('');
    const lista = deHoje.length
      ? deHoje.map((a, i) => {
          const ini = timeStrToMinutes(a.time), fim = ini + (a.duration || 0);
          const tag = (minAgora >= ini && minAgora < fim) ? '<span class="cel-agora">Agora</span>' : '';
          return `<button type="button" class="cel-atend" data-i="${i}">
            <span class="cel-atend-hora"><b>${celEsc(a.time)}</b><small>${a.duration || 0} min</small></span>
            <span class="cel-atend-barra" aria-hidden="true"></span>
            <span class="cel-atend-txt"><b>${celEsc(a.label || 'Paciente')}</b><small>${celEsc(a.servico || '')}</small></span>${tag}</button>`;
        }).join('')
      : `<div class="cel-vazio"><b>Nenhum atendimento hoje</b><span>Aproveite para responder mensagens ou montar planos de skincare.</span><button type="button" class="cel-vazio-btn">Agendar alguém</button></div>`;
    celInicio.innerHTML = `<div class="cel-numeros">${numeros}</div>
      <div class="cel-hoje-topo"><h2>Atendimentos de hoje</h2><button type="button" class="cel-link" data-ir="agenda">Ver agenda</button></div>
      <div class="cel-hoje-lista">${lista}</div>`;
    celInicio.querySelectorAll('.cel-atend').forEach(b => b.addEventListener('click', () => {
      try{ abrirDetalhesAtendimento(chaveHoje, deHoje[Number(b.dataset.i)], celRedesenharAgenda); }catch(e){ celIrPara('agenda'); }
    }));
    const ver = celInicio.querySelector('[data-ir="agenda"]');
    ver.addEventListener('click', () => { selectedDate = new Date(today); viewMonth = today.getMonth(); viewYear = today.getFullYear(); celIrPara('agenda'); celRedesenharAgenda(); });
    const vazio = celInicio.querySelector('.cel-vazio-btn');
    if(vazio) vazio.addEventListener('click', celAbrirMais);
  }

  /* ---------- Agenda: semana em cima, visão Mês e linha de "agora" ---------- */
  const viewAgendaEl = document.getElementById('view-agenda');
  const celSemana = document.createElement('div');
  celSemana.className = 'cel-semana';
  celSemana.setAttribute('aria-label', 'Dias da semana');
  document.querySelector('#view-agenda .schedule-toolbar').insertAdjacentElement('afterend', celSemana);
  const celListaDia = document.createElement('div');
  celListaDia.className = 'cel-lista-dia';
  document.getElementById('scheduleScrollWeek').insertAdjacentElement('afterend', celListaDia);

  const CEL_SEM = ['dom','seg','ter','qua','qui','sex','sáb'];
  function renderSemanaCelular(){
    const ini = getWeekStart(selectedDate);
    let html = '';
    for(let i = 0; i < 7; i++){
      const d = new Date(ini); d.setDate(d.getDate() + i);
      const cls = ['cel-dia'];
      if(sameDate(d, selectedDate)) cls.push('escolhido');
      if(sameDate(d, today)) cls.push('hoje');
      const tem = (appointments[dateKey(d)] || []).some(a => a.type === 'appt');
      html += `<button type="button" class="${cls.join(' ')}" data-k="${dateKey(d)}" aria-pressed="${sameDate(d, selectedDate)}"><span>${CEL_SEM[d.getDay()]}</span><b>${d.getDate()}</b><i class="${tem ? 'tem' : ''}" aria-hidden="true"></i></button>`;
    }
    celSemana.innerHTML = html;
    celSemana.querySelectorAll('.cel-dia').forEach(b => b.addEventListener('click', () => {
      selectedDate = keyParaData(b.dataset.k);
      viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
      celRedesenharAgenda();
    }));
  }

  function renderListaDiaCelular(){
    if(agendaViewMode !== 'mes'){ celListaDia.innerHTML = ''; return; }
    const key = dateKey(selectedDate);
    const itens = (appointments[key] || []).slice().sort((a, b) => timeStrToMinutes(a.time) - timeStrToMinutes(b.time));
    if(!itens.length){ celListaDia.innerHTML = '<div class="cel-lista-vazia">Nada marcado neste dia.</div>'; return; }
    celListaDia.innerHTML = itens.map((a, i) => `<button type="button" class="cel-lista-item ${a.type === 'block' ? 'bloqueio' : ''}" data-i="${i}">
      <b>${celEsc(a.time)}</b><span>${celEsc(a.type === 'block' ? (a.label || 'Bloqueado') + ' · bloqueado' : (a.label || 'Paciente'))}${a.servico ? ` <small>· ${celEsc(a.servico)}</small>` : ''}</span></button>`).join('');
    celListaDia.querySelectorAll('.cel-lista-item').forEach(b => b.addEventListener('click', () => {
      const item = itens[Number(b.dataset.i)];
      if(item.type === 'appt'){ try{ abrirDetalhesAtendimento(key, item, celRedesenharAgenda); }catch(e){} }
    }));
  }

  // Linha vermelha da hora atual (Dia e Semana, só no dia de hoje)
  function celLinhaAgora(){
    document.querySelectorAll('.agora-linha').forEach(l => l.remove());
    const agora = new Date();
    const min = agora.getHours() * 60 + agora.getMinutes();
    const rotulo = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
    const criar = (alturaLinha, comRotulo) => {
      const l = document.createElement('div');
      l.className = 'agora-linha';
      l.style.top = ((min / 30) * alturaLinha) + 'px';
      l.setAttribute('aria-hidden', 'true');
      if(comRotulo) l.innerHTML = `<span>${rotulo}</span>`;
      return l;
    };
    if(agendaViewMode === 'semanal'){
      document.querySelectorAll('#weekGrid .week-day-col').forEach(col => {
        const cab = col.querySelector('.week-day-header');
        const linhas = col.querySelector('.week-day-rows');
        if(cab && linhas && cab.classList.contains('is-today')) linhas.appendChild(criar(WEEK_ROW_H, false));
      });
      return;
    }
    if(!sameDate(selectedDate, today)) return;
    const colunas = scheduleRows.querySelectorAll('.ec-rows');
    if(colunas.length) colunas.forEach((c, i) => c.appendChild(criar(DAY_ROW_H, i === 0)));
    else scheduleRows.appendChild(criar(DAY_ROW_H, true));
  }
  setInterval(() => { if(viewAgendaEl.classList.contains('active') && document.visibilityState === 'visible') celLinhaAgora(); }, 60000);

  // No Mês, o calendário entra no quadro da agenda, logo abaixo dos botões Dia/Semana/Mês
  const celCalendario = document.querySelector('#view-agenda .calendar-card');
  const celLateral = document.querySelector('#view-agenda .agenda-lateral');
  function celAplicarModoMes(){
    const mes = agendaViewMode === 'mes';
    viewAgendaEl.classList.toggle('cel-modo-mes', mes);
    if(celCalendario && celLateral){
      if(mes && celCalendario.parentElement === celLateral) celSemana.insertAdjacentElement('afterend', celCalendario);
      else if(!mes && celCalendario.parentElement !== celLateral) celLateral.prepend(celCalendario);
    }
    viewAgendaEl.classList.toggle('cel-modo-semana', agendaViewMode === 'semanal');
  }
  document.querySelectorAll('.view-mode-toggle button').forEach(b => b.addEventListener('click', () => { celAplicarModoMes(); renderListaDiaCelular(); }));
  // Se a tela crescer (virar computador) no modo Mês, volta para o Diário
  window.matchMedia('(max-width: 760px)').addEventListener('change', (e) => {
    if(!e.matches && agendaViewMode === 'mes'){ const d = document.querySelector('.view-mode-toggle [data-agenda-view="diario"]'); if(d) d.click(); }
  });

  const celRenderCurrentViewOriginal = renderCurrentView;
  renderCurrentView = function(){
    const r = celRenderCurrentViewOriginal.apply(this, arguments);
    try{ renderSemanaCelular(); renderListaDiaCelular(); celLinhaAgora(); renderInicioCelular(); }catch(e){ console.warn('Celular:', e); }
    return r;
  };
  const celRenderCalendarOriginal = renderCalendar;
  renderCalendar = function(){
    const r = celRenderCalendarOriginal.apply(this, arguments);
    try{ renderSemanaCelular(); renderListaDiaCelular(); renderInicioCelular(); }catch(e){}
    return r;
  };
  // O desenho do dia (inclusive o das colunas do estúdio) também recebe a linha de agora
  const celRenderScheduleOriginal = renderSchedule;
  renderSchedule = function(){ const r = celRenderScheduleOriginal.apply(this, arguments); try{ celLinhaAgora(); }catch(e){} return r; };
  const celRenderWeekOriginal = renderWeekSchedule;
  renderWeekSchedule = function(){ const r = celRenderWeekOriginal.apply(this, arguments); try{ celLinhaAgora(); }catch(e){} return r; };

  // Pacientes e perfil chegam depois do login: atualiza o Início quando a tela abre
  new MutationObserver(() => { if(document.getElementById('view-dashboard').classList.contains('active')) renderInicioCelular(); })
    .observe(document.getElementById('view-dashboard'), { attributes: true, attributeFilter: ['class'] });
  setInterval(() => { if(document.visibilityState === 'visible' && document.body.classList.contains('cel-tela-inicio')) renderInicioCelular(); }, 60000);
  celAplicarModoMes();
  celMarcarTela();
  try{ renderSemanaCelular(); renderInicioCelular(); }catch(e){}

  /* ---------- Início: se já está logada, entra direto (precisa ser a última coisa a rodar) ---------- */
  supabaseClient.auth.getSession().then(({ data }) => {
    if(data.session && !anamneseToken && !confirmarToken && !termoToken && !planoToken){
      // Quem entrou com o login de demonstração volta para a demonstração ao recarregar a página
      if(ehLoginDemonstracao(data.session.user && data.session.user.email)) entrarModoDemonstracao();
      else enterApp();
    }
  });
