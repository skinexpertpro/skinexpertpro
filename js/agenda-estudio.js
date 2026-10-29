/* Skin Expert Pro — Agenda do estúdio (plano Studio).
   Carregar no index.html logo DEPOIS de js/agenda.js: usa as funções e variáveis de lá.

   Como funciona:
   - Ao entrar, pergunta ao banco (função estudio_meu) se a profissional faz parte de um estúdio.
     Se não fizer (plano Essencial), este arquivo não muda nada na Agenda.
   - No estúdio, a Agenda ganha o quadro "Profissionais", o filtro "Todas / Só a minha"
     e uma coluna por profissional no modo Diário (no Semanal, lado a lado em cada dia).
   - Os horários das colegas vêm da função estudio_agenda: a profissional vê só serviço e horário;
     a titular vê também o nome da paciente.
   - Só a titular marca na agenda de outra profissional (função estudio_marcar_atendimento). */

(function(){
  const CORES = [
    { c: 'var(--pink)', l: 'var(--pink-light)', t: 'var(--sidebar-bg)' },
    { c: 'var(--gold)', l: 'var(--gold-light)', t: 'var(--gold-dark)' },
    { c: '#5f6b3a',     l: '#e9ecdc',          t: '#3b4421' },
    { c: '#3f5f73',     l: '#e2ebf0',          t: '#24394a' },
  ];
  const DIAS_FAIXA = 10; // carrega as colegas do mês visível, com folga para as semanas que viram o mês

  const E = {
    ativo: false, iniciando: null,
    meuId: null, papel: null, nomeEstudio: '',
    equipe: [],            // [{ id, nome, papel, cor, expediente }]
    visiveis: new Set(),   // ids marcados no quadro "Profissionais"
    escopo: 'todas',       // 'todas' | 'minha'
    outros: {},            // 'AAAA-MM-DD' -> [{ id, pro, time, duration, type, servico, motivo, paciente }]
    faixa: null,           // { inicio, fim } já carregada
    carregando: null,
  };

  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || 'Profissional';
  const souTitular = () => E.papel === 'titular';
  const membro = id => E.equipe.find(m => m.id === id);
  const estilo = m => `--ec-c:${m.cor.c};--ec-l:${m.cor.l};--ec-t:${m.cor.t}`;
  const LOCK = '<svg class="ec-lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';

  /* ---------- Colunas visíveis ---------- */
  function colunasVisiveis(){
    if(!E.ativo) return [];
    if(E.escopo === 'minha') return E.equipe.filter(m => m.id === E.meuId);
    return E.equipe.filter(m => E.visiveis.has(m.id));
  }
  function soEu(cols){ return cols.length === 1 && cols[0].id === E.meuId; }

  /* ---------- Expediente (Meu Negócio > Horários de Atendimento) ---------- */
  function lerExpediente(valor){
    let v = valor;
    if(typeof v === 'string'){ try{ v = JSON.parse(v); }catch(e){ v = null; } }
    return Array.isArray(v) && v.length ? v[0] : null;
  }
  // Devolve { fechado, ini, fim } em minutos para um dia da semana, ou null se não houver horário salvo.
  function janelaDoDia(m, diaSemana){
    const exp = m.expediente;
    if(!exp || !Array.isArray(exp.entradas)) return null;
    if(exp.fechados && exp.fechados[diaSemana]) return { fechado: true, ini: 0, fim: 0 };
    const ini = exp.entradas[diaSemana], fim = (exp.saidas || [])[diaSemana];
    if(!ini || !fim) return null;
    return { fechado: false, ini: timeStrToMinutes(ini), fim: timeStrToMinutes(fim) };
  }

  /* ---------- Banco ---------- */
  async function iniciarEstudio(){
    // Se já está iniciando (ex.: antes do login terminar), roda de novo ao final.
    if(E.iniciando){ E.repetir = true; return E.iniciando; }
    E.iniciando = (async () => {
      try{
        if(typeof modoDemonstracao !== 'undefined' && modoDemonstracao){ desligar(); return; }
        const { data: u } = await supabaseClient.auth.getUser();
        if(!u || !u.user){ desligar(); return; }
        const { data: est, error } = await supabaseClient.rpc('estudio_meu');
        if(error){ console.warn('Estúdio: função estudio_meu indisponível (rode o SQL do plano Studio).', error.message); desligar(); return; }
        const linha = Array.isArray(est) ? est[0] : est;
        if(!linha){ desligar(); return; }

        const { data: eq, error: erroEq } = await supabaseClient.rpc('estudio_equipe');
        if(erroEq || !Array.isArray(eq) || !eq.length){ console.warn('Estúdio: não foi possível ler a equipe.', erroEq && erroEq.message); desligar(); return; }

        const eraAtivo = E.ativo;
        const idsAntes = E.equipe.map(m => m.id);
        E.meuId = u.user.id;
        E.papel = linha.papel;
        E.nomeEstudio = linha.nome || '';
        E.equipe = eq
          .sort((a, b) => Number(a.ordem) - Number(b.ordem))
          .map((m, i) => ({ id: m.profissional_id, nome: m.nome, papel: m.papel, cor: CORES[i % CORES.length], expediente: lerExpediente(m.expedientes) }));
        if(!eraAtivo) E.visiveis = new Set(E.equipe.map(m => m.id));
        else E.equipe.forEach(m => { if(!idsAntes.includes(m.id)) E.visiveis.add(m.id); });
        E.ativo = true;
        E.faixa = null;
        montarInterface();
        await carregarOutros(true);
      } catch(e){
        console.warn('Estúdio: erro ao iniciar.', e);
      } finally {
        E.iniciando = null;
        if(E.repetir){ E.repetir = false; iniciarEstudio(); }
      }
    })();
    return E.iniciando;
  }

  function desligar(){
    const estava = E.ativo;
    E.ativo = false; E.papel = null; E.equipe = []; E.outros = {}; E.faixa = null;
    document.querySelectorAll('.estudio-pros-card, .estudio-escopo').forEach(el => el.remove());
    document.getElementById('view-agenda')?.classList.remove('estudio-ativo');
    if(estava){ try{ renderCalendar(); renderCurrentView(); }catch(e){} }
  }

  function faixaNecessaria(){
    const base = new Date(selectedDate);
    const ini = new Date(base.getFullYear(), base.getMonth(), 1); ini.setDate(ini.getDate() - DIAS_FAIXA);
    const fim = new Date(base.getFullYear(), base.getMonth() + 1, 0); fim.setDate(fim.getDate() + DIAS_FAIXA);
    return { inicio: dateKey(ini), fim: dateKey(fim) };
  }
  function faixaCobre(){
    if(!E.faixa) return false;
    let a, b;
    if(agendaViewMode === 'semanal'){
      const s = getWeekStart(selectedDate), f = new Date(s); f.setDate(f.getDate() + 6);
      a = dateKey(s); b = dateKey(f);
    } else { a = b = dateKey(selectedDate); }
    return a >= E.faixa.inicio && b <= E.faixa.fim;
  }

  async function carregarOutros(forcar){
    if(!E.ativo) return;
    if(!forcar && faixaCobre()) return;
    if(E.carregando) return E.carregando;
    const faixa = faixaNecessaria();
    E.carregando = (async () => {
      try{
        const { data, error } = await supabaseClient.rpc('estudio_agenda', { p_inicio: faixa.inicio, p_fim: faixa.fim });
        if(error){ console.warn('Estúdio: não foi possível carregar a agenda das colegas.', error.message); return; }
        const mapa = {};
        (data || []).forEach(r => {
          const k = String(r.data).slice(0, 10);
          (mapa[k] = mapa[k] || []).push({
            id: r.id, pro: r.profissional_id,
            time: String(r.hora || '00:00').slice(0, 5),
            duration: parseInt(r.duracao, 10) || 60,
            type: r.tipo === 'block' ? 'block' : 'appt',
            servico: r.servico_nome || '', motivo: r.motivo || '', paciente: r.paciente_nome || '',
          });
        });
        E.outros = mapa;
        E.faixa = faixa;
        renderCurrentView();
      } finally { E.carregando = null; }
    })();
    return E.carregando;
  }

  /* ---------- Interface: quadro "Profissionais" e filtro "Todas / Só a minha" ---------- */
  function montarInterface(){
    document.getElementById('view-agenda')?.classList.add('estudio-ativo');

    if(!document.querySelector('.estudio-escopo')){
      const toolbar = document.querySelector('#view-agenda .schedule-toolbar');
      const toggle = document.createElement('div');
      toggle.className = 'estudio-escopo';
      toggle.setAttribute('role', 'group');
      toggle.setAttribute('aria-label', 'De quem é a agenda');
      toggle.innerHTML = '<button type="button" data-escopo="todas">Todas</button><button type="button" data-escopo="minha">Só a minha</button>';
      toggle.addEventListener('click', e => {
        const b = e.target.closest('[data-escopo]'); if(!b) return;
        E.escopo = b.dataset.escopo;
        atualizarInterface();
        renderCurrentView();
      });
      const modo = toolbar && toolbar.querySelector('.view-mode-toggle');
      if(modo) modo.insertAdjacentElement('afterend', toggle);
      else if(toolbar) toolbar.prepend(toggle);
    }

    if(!document.querySelector('.estudio-pros-card')){
      const lateral = document.querySelector('#view-agenda .agenda-lateral');
      const card = document.createElement('div');
      card.className = 'card estudio-pros-card';
      card.innerHTML = '<div class="estudio-pros-titulo"></div><div class="estudio-pros-lista"></div>';
      card.addEventListener('change', e => {
        const c = e.target.closest('[data-pro]'); if(!c) return;
        if(c.checked) E.visiveis.add(c.dataset.pro); else E.visiveis.delete(c.dataset.pro);
        atualizarInterface();
        renderCurrentView();
      });
      const cal = lateral && lateral.querySelector('.calendar-card');
      if(cal) cal.insertAdjacentElement('afterend', card);
      else if(lateral) lateral.prepend(card);
    }
    atualizarInterface();
  }

  function contarNoPeriodo(id){
    const dias = agendaViewMode === 'semanal'
      ? Array.from({ length: 7 }, (_, i) => { const d = getWeekStart(selectedDate); d.setDate(d.getDate() + i); return dateKey(d); })
      : [dateKey(selectedDate)];
    let n = 0;
    dias.forEach(k => {
      if(id === E.meuId) n += (appointments[k] || []).filter(a => a.type === 'appt').length;
      else n += (E.outros[k] || []).filter(a => a.pro === id && a.type === 'appt').length;
    });
    return n;
  }

  function atualizarInterface(){
    if(!E.ativo) return;
    document.querySelectorAll('.estudio-escopo button').forEach(b => b.classList.toggle('active', b.dataset.escopo === E.escopo));
    const card = document.querySelector('.estudio-pros-card');
    if(!card) return;
    card.querySelector('.estudio-pros-titulo').innerHTML = `Profissionais<span>${esc(E.nomeEstudio)}</span>`;
    const travado = E.escopo === 'minha';
    card.querySelector('.estudio-pros-lista').innerHTML = E.equipe.map(m => `
      <label class="estudio-pro" style="${estilo(m)}">
        <input type="checkbox" data-pro="${esc(m.id)}" ${E.visiveis.has(m.id) ? 'checked' : ''} ${travado ? 'disabled' : ''}>
        <span class="estudio-pro-nome">${esc(m.nome)}${m.id === E.meuId ? ' (você)' : ''}
          <small>${m.papel === 'titular' ? 'Titular' : 'Profissional'}</small></span>
        <span class="estudio-pro-qtd" title="Atendimentos no período">${contarNoPeriodo(m.id)}</span>
      </label>`).join('');
  }

  /* ---------- Diário: uma coluna por profissional ---------- */
  const renderScheduleOriginal = renderSchedule;
  renderSchedule = function(){
    scheduleRows.classList.remove('estudio-cols');
    const cols = colunasVisiveis();
    if(!E.ativo || soEu(cols)){ renderScheduleOriginal(); atualizarInterface(); return; }
    if(!faixaCobre()) carregarOutros();
    desenharDiaEstudio(cols);
    atualizarInterface();
  };

  function desenharDiaEstudio(cols){
    const ROW_H = DAY_ROW_H;
    const key = dateKey(selectedDate);
    const diaSemana = selectedDate.getDay();
    scheduleDate.textContent = `${weekdayFull[diaSemana]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`;

    const total = cols.reduce((s, m) => s + contarNoPeriodo(m.id), 0);
    scheduleCount.textContent = cols.length
      ? `${total} atendimento(s) · ${cols.length} profissional(is)`
      : 'Nenhuma profissional selecionada';

    scheduleRows.innerHTML = '';
    scheduleRows.classList.add('estudio-cols');
    if(!cols.length){
      scheduleRows.innerHTML = '<div class="ec-vazio">Marque pelo menos uma profissional no quadro "Profissionais".</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'ec-grid';
    // Os cliques da grade do estúdio são tratados aqui; não deixam o clique da agenda individual abrir junto.
    grid.addEventListener('click', e => e.stopPropagation());

    const gutter = document.createElement('div');
    gutter.className = 'ec-gutter';
    let g = '<div class="ec-head"></div>';
    for(let h = 0; h < 24; h++){
      g += `<div class="time-row hour" style="height:${ROW_H}px"><div class="time-label">${pad(h)}:00</div></div>`;
      g += `<div class="time-row" style="height:${ROW_H}px"><div class="time-label">:30</div></div>`;
    }
    gutter.innerHTML = g;
    grid.appendChild(gutter);

    cols.forEach(m => {
      const col = document.createElement('div');
      col.className = 'ec-col';
      col.setAttribute('style', estilo(m));
      const n = contarNoPeriodo(m.id);
      col.innerHTML = `<div class="ec-head"><span class="ec-av">${esc(iniciais(m.nome))}</span>
        <span class="ec-head-t"><b>${esc(m.nome)}${m.id === E.meuId ? ' (você)' : ''}</b><span>${n} atendimento(s)</span></span></div>`;

      const rows = document.createElement('div');
      rows.className = 'ec-rows';
      let r = '';
      for(let i = 0; i < 48; i++) r += `<div class="time-row${i % 2 === 0 ? ' hour' : ''}" style="height:${ROW_H}px"><div class="time-line"></div></div>`;
      rows.innerHTML = r;

      // Fora do expediente
      const jan = janelaDoDia(m, diaSemana);
      if(jan){
        const faixas = jan.fechado ? [[0, 24 * 60]] : [[0, jan.ini], [jan.fim, 24 * 60]];
        faixas.forEach(([a, b]) => {
          if(b <= a) return;
          const off = document.createElement('div');
          off.className = 'ec-off';
          off.style.top = (a / 30) * ROW_H + 'px';
          off.style.height = ((b - a) / 30) * ROW_H + 'px';
          rows.appendChild(off);
        });
      }

      if(m.id === E.meuId){
        (appointments[key] || []).forEach(item => {
          const block = blocoBase(item.time, item.duration, ROW_H);
          block.className = 'schedule-block ec-block ' + (item.type === 'block' ? 'block' : 'appt ec-cor');
          block.innerHTML = `<div class="sb-title">${esc(item.label)}</div><div class="sb-time">${item.servico ? esc(item.servico) + ' · ' : ''}${item.time} · ${item.duration} min</div>`;
          attachDragToReschedule(block, item, key, ROW_H, () => renderSchedule());
          rows.appendChild(block);
        });
      } else {
        (E.outros[key] || []).filter(it => it.pro === m.id).forEach(it => rows.appendChild(blocoOutra(it, m, ROW_H, false)));
      }

      rows.addEventListener('click', e => {
        if(suprimirCliqueAgenda) return;
        if(e.target.closest('.schedule-block')) return;
        const rect = rows.getBoundingClientRect();
        const minutos = snapMinutes(((e.clientY - rect.top) / ROW_H) * 30, 15);
        cliqueEmHorarioLivre(m, key, minutosToHora(minutos));
      });

      col.appendChild(rows);
      grid.appendChild(col);
    });

    scheduleRows.appendChild(grid);
  }

  function iniciais(nome){
    const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function minutosToHora(m){ return minutesToTimeStr(m); }
  function blocoBase(hora, duracao, ROW_H){
    const block = document.createElement('div');
    const ini = timeStrToMinutes(hora);
    block.style.top = (ini / 30) * ROW_H + 'px';
    block.style.height = Math.max((duracao / 30) * ROW_H - 4, 20) + 'px';
    return block;
  }

  // Bloco de um horário de outra profissional (dia ou semana).
  function blocoOutra(it, m, ROW_H, semana){
    const fim = minutesToTimeStr(timeStrToMinutes(it.time) + it.duration);
    const el = blocoBase(it.time, it.duration, ROW_H);
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const comNome = !!it.paciente;
    if(it.type === 'block'){
      el.className = (semana ? 'week-block' : 'schedule-block ec-block') + ' block ec-outra';
      el.innerHTML = semana
        ? `<div class="wb-title">${esc(it.motivo || 'Bloqueado')}</div>`
        : `<div class="sb-title">${esc(it.motivo || 'Horário bloqueado')}</div><div class="sb-time">${it.time}–${fim}</div>`;
    } else if(comNome){
      el.className = (semana ? 'week-block' : 'schedule-block ec-block') + ' ec-outra ec-cor';
      el.innerHTML = semana
        ? `<div class="wb-title">${esc(primeiroNome(it.paciente))}</div><div>${esc(it.servico)}</div>`
        : `<div class="sb-title">${esc(it.paciente)}</div><div class="sb-time">${it.servico ? esc(it.servico) + ' · ' : ''}${it.time} · ${it.duration} min</div>`;
    } else {
      el.className = (semana ? 'week-block' : 'schedule-block ec-block') + ' ec-outra ec-cor ec-privado';
      el.innerHTML = semana
        ? `<div class="wb-title">${LOCK}${esc(it.servico || 'Ocupado')}</div>`
        : `<div class="sb-title">${LOCK}${esc(it.servico || 'Horário ocupado')}</div><div class="sb-time">${it.time}–${fim} · paciente de ${esc(primeiroNome(m.nome))}</div>`;
    }
    el.setAttribute('aria-label', `${it.type === 'block' ? 'Bloqueio' : (it.servico || 'Atendimento')} às ${it.time}, agenda de ${m.nome}`);
    const abrir = e => { e.stopPropagation(); abrirDetalheOutra(it, m); };
    el.addEventListener('click', abrir);
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(e); } });
    return el;
  }

  function cliqueEmHorarioLivre(m, key, hora){
    const jan = janelaDoDia(m, keyParaData(key).getDay());
    const min = timeStrToMinutes(hora);
    if(jan && (jan.fechado || min < jan.ini || min >= jan.fim)){
      showToast(`Fora do horário de atendimento de ${primeiroNome(m.nome)}.`);
      return;
    }
    if(m.id === E.meuId){
      selectedDate = keyParaData(key);
      openModal('appt', hora);
      return;
    }
    if(souTitular()){ abrirMarcarParaOutra(m, key, hora); return; }
    showToast(`Esse horário é da agenda de ${primeiroNome(m.nome)}. Só a titular marca para outras profissionais.`);
  }

  /* ---------- Semanal: profissionais lado a lado em cada dia ---------- */
  const renderWeekScheduleOriginal = renderWeekSchedule;
  renderWeekSchedule = function(){
    renderWeekScheduleOriginal();
    const cols = colunasVisiveis();
    if(!E.ativo){ return; }
    atualizarInterface();
    if(soEu(cols)) return;
    if(!faixaCobre()) carregarOutros();

    const ROW_H = WEEK_ROW_H;
    const lanes = Math.max(cols.length, 1);
    const laneDe = id => cols.findIndex(m => m.id === id);
    const meuLane = laneDe(E.meuId);
    const inicio = getWeekStart(selectedDate);

    weekGrid.querySelectorAll('.week-day-col').forEach((col, i) => {
      const d = new Date(inicio); d.setDate(d.getDate() + i);
      const key = dateKey(d);
      const rows = col.querySelector('.week-day-rows');
      if(!rows) return;

      rows.querySelectorAll('.week-block').forEach(b => {
        if(meuLane < 0){ b.style.display = 'none'; return; }
        posicionarNaFaixa(b, meuLane, lanes);
        const eu = membro(E.meuId);
        if(eu && !b.classList.contains('block')){ b.classList.add('ec-cor'); b.setAttribute('style', b.getAttribute('style') + ';' + estilo(eu)); }
      });

      (E.outros[key] || []).forEach(it => {
        const lane = laneDe(it.pro);
        if(lane < 0) return;
        const m = membro(it.pro);
        const el = blocoOutra(it, m, ROW_H, true);
        el.setAttribute('style', el.getAttribute('style') + ';' + estilo(m));
        posicionarNaFaixa(el, lane, lanes);
        rows.appendChild(el);
      });
    });

    const total = cols.reduce((s, m) => s + contarNoPeriodo(m.id), 0);
    scheduleCount.textContent = `${total} atendimento(s) na semana · ${cols.length} profissional(is)`;
  };

  function posicionarNaFaixa(el, lane, lanes){
    if(lanes <= 1) return;
    el.style.left = `calc(${lane} * 100% / ${lanes} + 2px)`;
    el.style.right = 'auto';
    el.style.width = `calc(100% / ${lanes} - 4px)`;
  }

  /* ---------- Janelas: detalhe do horário de uma colega ---------- */
  let janela = null;
  function fecharJanela(){ if(janela){ janela.remove(); janela = null; } }
  function abrirJanela(html){
    fecharJanela();
    janela = document.createElement('div');
    janela.className = 'modal-overlay open estudio-janela';
    janela.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
    janela.addEventListener('click', e => { if(e.target === janela || e.target.closest('[data-fechar]')) fecharJanela(); });
    document.body.appendChild(janela);
    const foco = janela.querySelector('select, input, button.modal-btn-confirm, button');
    if(foco) foco.focus();
    return janela;
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && janela) fecharJanela(); });

  function abrirDetalheOutra(it, m){
    const d = keyParaDataSegura(it);
    const fim = minutesToTimeStr(timeStrToMinutes(it.time) + it.duration);
    const chip = `<span class="ec-chip" style="${estilo(m)}"><i></i>${esc(m.nome)}</span>`;
    const quando = `${weekdayFull[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`;
    let corpo;
    if(it.type === 'block'){
      corpo = `<h3>${esc(it.motivo || 'Horário bloqueado')}</h3>${chip}
        <dl class="ec-kv"><dt>Data</dt><dd>${quando}</dd><dt>Horário</dt><dd>${it.time}–${fim}</dd></dl>`;
    } else if(it.paciente){
      corpo = `<h3>${esc(it.paciente)}</h3>${chip}
        <dl class="ec-kv"><dt>Serviço</dt><dd>${esc(it.servico || '—')}</dd><dt>Data</dt><dd>${quando}</dd><dt>Horário</dt><dd>${it.time}–${fim}</dd></dl>
        <p class="ec-nota">Você vê esta paciente porque é a <b>titular</b> do estúdio. A ficha continua sendo de ${esc(primeiroNome(m.nome))}.</p>`;
    } else {
      corpo = `<h3>Horário ocupado</h3>${chip}
        <dl class="ec-kv"><dt>Serviço</dt><dd>${esc(it.servico || '—')}</dd><dt>Data</dt><dd>${quando}</dd><dt>Horário</dt><dd>${it.time}–${fim}</dd></dl>
        <p class="ec-nota">${LOCK} <b>Paciente de ${esc(primeiroNome(m.nome))}.</b> O nome e a ficha da paciente ficam visíveis só para a profissional responsável e para a titular do estúdio.</p>`;
    }
    abrirJanela(`${corpo}<div class="modal-actions"><button type="button" class="modal-btn-confirm" data-fechar>Fechar</button></div>`);
  }
  function keyParaDataSegura(it){
    for(const k of Object.keys(E.outros)) if(E.outros[k].includes(it)) return keyParaData(k);
    return new Date(selectedDate);
  }

  /* ---------- Janela: a titular marca na agenda de outra profissional ---------- */
  async function abrirMarcarParaOutra(m, key, hora){
    const duracoes = [30, 45, 60, 75, 90, 120, 150, 180];
    abrirJanela(`<form id="ecFormMarcar" novalidate>
      <h3>Novo atendimento</h3>
      <div class="modal-field"><label>Profissional</label><div class="ec-chip" style="${estilo(m)}"><i></i>${esc(m.nome)}</div></div>
      <div class="modal-field"><label for="ecPaciente">Paciente</label>
        <select id="ecPaciente" disabled><option>Carregando…</option></select>
        <small class="ec-ajuda">Aparecem só as pacientes de ${esc(primeiroNome(m.nome))}.</small></div>
      <div class="modal-field"><label for="ecServico">Serviço</label><select id="ecServico" disabled><option>Carregando…</option></select></div>
      <div class="ec-duas">
        <div class="modal-field"><label for="ecData">Data</label><input id="ecData" type="date" value="${key}"></div>
        <div class="modal-field"><label for="ecHora">Horário</label><input id="ecHora" type="time" step="900" value="${hora}"></div>
      </div>
      <div class="modal-field"><label for="ecDuracao">Duração</label>
        <select id="ecDuracao">${duracoes.map(d => `<option value="${d}" ${d === 60 ? 'selected' : ''}>${formatarDuracaoMin(d)}</option>`).join('')}</select></div>
      <div id="ecErro"></div>
      <div class="modal-actions"><button type="button" class="modal-btn-cancel" data-fechar>Cancelar</button><button type="submit" class="modal-btn-confirm" id="ecSalvar" disabled>Agendar</button></div>
    </form>`);

    const [pac, serv] = await Promise.all([
      supabaseClient.rpc('estudio_pacientes_de', { p_profissional: m.id }),
      supabaseClient.rpc('estudio_servicos_de', { p_profissional: m.id }),
    ]);
    if(!janela) return; // fechou enquanto carregava
    const selPac = janela.querySelector('#ecPaciente'), selServ = janela.querySelector('#ecServico'), erro = janela.querySelector('#ecErro');
    if(pac.error || serv.error){
      erro.innerHTML = `<div class="ec-erro">${esc((pac.error || serv.error).message)}</div>`;
      return;
    }
    if(!(pac.data || []).length){
      selPac.innerHTML = '<option value="">Nenhuma paciente cadastrada</option>';
      erro.innerHTML = `<div class="ec-erro">${esc(primeiroNome(m.nome))} ainda não tem pacientes. A paciente precisa ser cadastrada por ela.</div>`;
      return;
    }
    selPac.innerHTML = pac.data.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('');
    selServ.innerHTML = '<option value="">Sem serviço</option>' + (serv.data || []).map(s => `<option value="${esc(s.nome)}" data-duracao="${esc(s.duracao || '')}">${esc(s.nome)}${s.duracao ? ' · ' + esc(s.duracao) : ''}</option>`).join('');
    selPac.disabled = false; selServ.disabled = false;
    janela.querySelector('#ecSalvar').disabled = false;

    selServ.addEventListener('change', () => {
      const op = selServ.selectedOptions[0];
      const min = op && duracaoServicoParaMinutos(op.dataset.duracao);
      if(!min) return;
      const selDur = janela.querySelector('#ecDuracao');
      if(![...selDur.options].some(o => Number(o.value) === min)) selDur.insertAdjacentHTML('beforeend', `<option value="${min}">${formatarDuracaoMin(min)}</option>`);
      selDur.value = String(min);
    });

    janela.querySelector('#ecFormMarcar').addEventListener('submit', async ev => {
      ev.preventDefault();
      const data = janela.querySelector('#ecData').value;
      const h = janela.querySelector('#ecHora').value;
      const dur = parseInt(janela.querySelector('#ecDuracao').value, 10);
      if(!data || !h){ erro.innerHTML = '<div class="ec-erro">Escolha a data e o horário do atendimento.</div>'; return; }
      const jan = janelaDoDia(m, keyParaData(data).getDay());
      const ini = timeStrToMinutes(h);
      if(jan && (jan.fechado || ini < jan.ini || ini + dur > jan.fim)){
        erro.innerHTML = `<div class="ec-erro">Fora do horário de atendimento de ${esc(primeiroNome(m.nome))}. Escolha outro horário.</div>`;
        return;
      }
      const botao = janela.querySelector('#ecSalvar');
      botao.disabled = true; botao.textContent = 'Agendando…';
      const { error } = await supabaseClient.rpc('estudio_marcar_atendimento', {
        p_profissional: m.id, p_paciente_id: selPac.value, p_data: data, p_hora: h, p_duracao: dur, p_servico: selServ.value || null,
      });
      if(error){
        botao.disabled = false; botao.textContent = 'Agendar';
        erro.innerHTML = `<div class="ec-erro">${esc(error.message)}</div>`;
        return;
      }
      const nomePac = selPac.selectedOptions[0] ? selPac.selectedOptions[0].textContent : 'a paciente';
      fecharJanela();
      selectedDate = keyParaData(data);
      viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
      await carregarOutros(true);
      renderCalendar();
      showToast(`Agendado: ${nomePac} às ${h} com ${primeiroNome(m.nome)}.`);
    });
  }

  /* ---------- Ligar ao carregamento da agenda e ao logout ---------- */
  const loadOriginal = loadAgendamentosFromSupabase;
  loadAgendamentosFromSupabase = function(){
    const p = loadOriginal.apply(this, arguments);
    Promise.resolve(p).then(() => iniciarEstudio()).catch(() => iniciarEstudio());
    return p;
  };

  try{
    supabaseClient.auth.onAuthStateChange((evento) => { if(evento === 'SIGNED_OUT') desligar(); });
  }catch(e){}

  // Atualiza os horários das colegas a cada minuto enquanto a Agenda estiver aberta.
  setInterval(() => {
    if(!E.ativo || document.visibilityState !== 'visible') return;
    const v = document.getElementById('view-agenda');
    if(v && v.classList.contains('active')) carregarOutros(true);
  }, 60000);

  // Ao trocar de mês/semana, garante que as colegas daquele período estejam carregadas.
  ['scheduleNavPrev', 'scheduleNavNext', 'scheduleNavToday', 'calPrev', 'calNext'].forEach(id => {
    const b = document.getElementById(id);
    if(b) b.addEventListener('click', () => { if(E.ativo && !faixaCobre()) carregarOutros(); });
  });

  // Para quem já estava logada quando este arquivo carregou.
  iniciarEstudio();
})();
