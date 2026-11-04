/* Skin Expert Pro — Agenda compartilhada: estúdio (plano Studio) e conexões (plano Essencial).
   Carregar no index.html logo DEPOIS de js/agenda.js: usa as funções e variáveis de lá.

   - Sem estúdio e sem conexão: este arquivo não muda nada na Agenda.
   - Estúdio: uma coluna por profissional (ou por sala). Das colegas aparecem só serviço,
     horário e sala; de quem atende em outro estúdio, só "Indisponível". Nome de paciente, nunca.
   - Conexões: a coluna da parceira mostra só "Ocupada".
   - Ao marcar, escolhe-se o local (estúdio) e a sala. O banco confere de novo e recusa
     sala ocupada (gatilho agendamento_local_valido). */

(function(){
  const CORES = [
    { c: 'var(--pink)', l: 'var(--pink-light)', t: 'var(--sidebar-bg)' },
    { c: 'var(--gold)', l: 'var(--gold-light)', t: 'var(--gold-dark)' },
    { c: '#5f6b3a',     l: '#e9ecdc',          t: '#3b4421' },
    { c: '#3f5f73',     l: '#e2ebf0',          t: '#24394a' },
    { c: '#7a4d8c',     l: '#efe6f3',          t: '#4a2a57' },
  ];
  const DIAS_FAIXA = 10;
  const CHAVE_ESTUDIO = 'sep.estudioAtual';
  const FORA = '__fora__'; // atendimento fora de qualquer estúdio

  const E = {
    ativo: false, iniciando: null, repetir: false,
    meuId: null, meuNome: 'Você',
    estudios: [],     // [{ id, nome, papel, espaco, salas:[{id,nome,ordem}], equipe:[{id,nome,papel,expediente}] }]
    atual: null,      // id do estúdio mostrado na Agenda
    conexoes: [],     // [{ id, nome, expediente }]
    cores: {},        // id da profissional -> cor
    visiveis: new Set(),
    escopo: 'todas',  // 'todas' | 'minha' | 'sala'
    outros: {},       // 'AAAA-MM-DD' -> [{ id, pro, time, duration, type, servico, motivo, salaId, indisponivel, ocupada }]
    faixa: null, carregando: null,
  };

  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || 'Profissional';
  const iniciais = n => { const p = String(n || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
  const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  const LOCK = '<svg class="ec-lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';

  const estudioAtual = () => E.estudios.find(s => s.id === E.atual) || null;
  const estudioPorId = id => E.estudios.find(s => s.id === id) || null;
  const salasSeparadas = est => !!(est && est.espaco === 'separadas' && est.salas.length);
  const salaPorId = id => { for(const s of E.estudios){ const x = s.salas.find(y => y.id === id); if(x) return x; } return null; };
  const cor = id => E.cores[id] || CORES[0];
  const estilo = id => { const c = cor(id); return `--ec-c:${c.c};--ec-l:${c.l};--ec-t:${c.t}`; };

  // Meu atendimento conta como "deste estúdio"? (sem estúdio marcado vale para quem só tem um)
  const meuNoEstudio = (item, estId) => item.estudioId ? item.estudioId === estId : E.estudios.length === 1 && estId === E.estudios[0].id;

  /* ---------- Quem aparece nas colunas ---------- */
  function todasPessoas(){
    const lista = [{ id: E.meuId, nome: E.meuNome, papel: 'eu', expediente: null }];
    const est = estudioAtual();
    if(est) est.equipe.forEach(m => { if(m.id !== E.meuId) lista.push({ id: m.id, nome: m.nome, papel: m.papel, expediente: m.expediente }); });
    E.conexoes.forEach(c => { if(!lista.some(x => x.id === c.id)) lista.push({ id: c.id, nome: c.nome, papel: 'conexao', expediente: c.expediente }); });
    const eu = est && est.equipe.find(m => m.id === E.meuId);
    lista[0].nome = eu ? eu.nome : (lista[0].nome);
    lista[0].expediente = eu ? eu.expediente : lerExpedienteProprio();
    return lista;
  }
  function colunas(){
    if(!E.ativo) return [];
    if(E.escopo === 'minha') return todasPessoas().filter(p => p.id === E.meuId);
    return todasPessoas().filter(p => E.visiveis.has(p.id));
  }
  const soEu = cols => cols.length === 1 && cols[0].id === E.meuId;
  const porSala = () => E.escopo === 'sala' && salasSeparadas(estudioAtual());

  /* ---------- Expediente ---------- */
  // Sem estúdio, o meu horário vem de Meu Negócio (expedientesData, de meu-negocio.js).
  function lerExpedienteProprio(){ try{ return (typeof expedientesData !== 'undefined' && expedientesData[0]) || null; }catch(e){ return null; } }
  function lerExpediente(valor){
    let v = valor;
    if(typeof v === 'string'){ try{ v = JSON.parse(v); }catch(e){ v = null; } }
    return Array.isArray(v) && v.length ? v[0] : null;
  }
  function janelaDoDia(exp, diaSemana){
    if(!exp || !Array.isArray(exp.entradas)) return null;
    if(exp.fechados && exp.fechados[diaSemana]) return { fechado: true, ini: 0, fim: 0 };
    const ini = exp.entradas[diaSemana], fim = (exp.saidas || [])[diaSemana];
    if(!ini || !fim) return null;
    return { fechado: false, ini: timeStrToMinutes(ini), fim: timeStrToMinutes(fim) };
  }

  /* ---------- Banco ---------- */
  async function iniciar(){
    if(E.iniciando){ E.repetir = true; return E.iniciando; }
    E.iniciando = (async () => {
      try{
        if(typeof modoDemonstracao !== 'undefined' && modoDemonstracao){ desligar(); return; }
        const { data: u } = await supabaseClient.auth.getUser();
        if(!u || !u.user){ desligar(); return; }
        const [rEst, rCon] = await Promise.all([
          supabaseClient.rpc('estudio_meu'),
          supabaseClient.rpc('minhas_conexoes'),
        ]);
        if(rEst.error) console.warn('Estúdio: estudio_meu indisponível.', rEst.error.message);
        if(rCon.error) console.warn('Conexões: minhas_conexoes indisponível.', rCon.error.message);
        const linhas = Array.isArray(rEst.data) ? rEst.data : [];
        const conexoes = (Array.isArray(rCon.data) ? rCon.data : []).filter(c => c.status === 'aceita');
        if(!linhas.length && !conexoes.length){ desligar(); return; }

        const estudios = await Promise.all(linhas.map(async l => {
          const [eq, sl] = await Promise.all([
            supabaseClient.rpc('estudio_equipe', { p_estudio: l.estudio_id }),
            supabaseClient.from('estudio_salas').select('id, nome, ordem').eq('estudio_id', l.estudio_id).eq('ativo', true).order('ordem'),
          ]);
          return {
            id: l.estudio_id, nome: l.nome, papel: l.papel, espaco: l.espaco || 'compartilhada',
            salas: (sl.data || []).map(s => ({ id: s.id, nome: s.nome, ordem: s.ordem })),
            equipe: (eq.data || []).sort((a, b) => Number(a.ordem) - Number(b.ordem))
              .map(m => ({ id: m.profissional_id, nome: m.nome, papel: m.papel, expediente: lerExpediente(m.expedientes) })),
          };
        }));

        if(!estudios.length){
          try{ const r = await supabaseClient.from('perfis').select('nome').eq('id', u.user.id).maybeSingle(); if(r.data && r.data.nome) E.meuNome = r.data.nome; }catch(e){}
        }
        const eraAtivo = E.ativo;
        const antes = new Set(todasPessoasIds());
        E.meuId = u.user.id;
        E.estudios = estudios;
        E.conexoes = conexoes.map(c => ({ id: c.outra_id, nome: c.nome, expediente: lerExpediente(c.expedientes) }));
        const salvo = lsGet(CHAVE_ESTUDIO);
        if(!estudios.some(s => s.id === E.atual)) E.atual = estudios.some(s => s.id === salvo) ? salvo : (estudios[0] ? estudios[0].id : null);
        atribuirCores();
        E.ativo = true;
        todasPessoas().forEach(p => { if(!eraAtivo || !antes.has(p.id)) E.visiveis.add(p.id); });
        if(E.escopo === 'sala' && !salasSeparadas(estudioAtual())) E.escopo = 'todas';
        E.faixa = null;
        montarInterface();
        await carregarOutros(true);
      } catch(e){
        console.warn('Agenda compartilhada: erro ao iniciar.', e);
      } finally {
        E.iniciando = null;
        if(E.repetir){ E.repetir = false; iniciar(); }
      }
    })();
    return E.iniciando;
  }
  function todasPessoasIds(){ return E.ativo ? todasPessoas().map(p => p.id) : []; }
  function atribuirCores(){
    const ids = [];
    E.estudios.forEach(s => s.equipe.forEach(m => { if(!ids.includes(m.id)) ids.push(m.id); }));
    if(!ids.includes(E.meuId)) ids.unshift(E.meuId);
    E.conexoes.forEach(c => { if(!ids.includes(c.id)) ids.push(c.id); });
    // Eu sempre na primeira cor.
    ids.sort((a, b) => (a === E.meuId ? -1 : b === E.meuId ? 1 : 0));
    E.cores = {}; ids.forEach((id, i) => { E.cores[id] = CORES[i % CORES.length]; });
  }

  function desligar(){
    const estava = E.ativo;
    E.ativo = false; E.estudios = []; E.conexoes = []; E.outros = {}; E.faixa = null; E.atual = null;
    document.querySelectorAll('.estudio-pros-card, .estudio-escopo, .estudio-seletor').forEach(el => el.remove());
    document.getElementById('view-agenda')?.classList.remove('estudio-ativo');
    const campo = document.getElementById('estudioLocalField'); if(campo) campo.hidden = true;
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
    if(agendaViewMode === 'semanal'){ const s = getWeekStart(selectedDate), f = new Date(s); f.setDate(f.getDate() + 6); a = dateKey(s); b = dateKey(f); }
    else { a = b = dateKey(selectedDate); }
    return a >= E.faixa.inicio && b <= E.faixa.fim;
  }

  async function carregarOutros(forcar){
    if(!E.ativo) return;
    if(!forcar && faixaCobre()) return;
    if(E.carregando) return E.carregando;
    const faixa = faixaNecessaria();
    const estId = E.atual;
    E.carregando = (async () => {
      try{
        const [rEst, rCon] = await Promise.all([
          estId ? supabaseClient.rpc('estudio_agenda', { p_inicio: faixa.inicio, p_fim: faixa.fim, p_estudio: estId }) : Promise.resolve({ data: [] }),
          E.conexoes.length ? supabaseClient.rpc('conexoes_agenda', { p_inicio: faixa.inicio, p_fim: faixa.fim }) : Promise.resolve({ data: [] }),
        ]);
        if(rEst.error) console.warn('Estúdio: não foi possível carregar a agenda das colegas.', rEst.error.message);
        if(rCon.error) console.warn('Conexões: não foi possível carregar a agenda das parceiras.', rCon.error.message);
        const mapa = {};
        const colegas = new Set((estudioAtual() ? estudioAtual().equipe : []).map(m => m.id));
        (rEst.data || []).forEach(r => {
          const k = String(r.data).slice(0, 10);
          (mapa[k] = mapa[k] || []).push({
            id: r.id, pro: r.profissional_id, time: String(r.hora || '00:00').slice(0, 5),
            duration: parseInt(r.duracao, 10) || 60, type: r.tipo === 'block' ? 'block' : 'appt',
            servico: r.servico_nome || '', motivo: r.motivo || '', salaId: r.sala_id || null,
            indisponivel: !!r.indisponivel, ocupada: false,
          });
        });
        (rCon.data || []).forEach(r => {
          if(colegas.has(r.profissional_id)) return; // já aparece pelo estúdio, com mais detalhe
          const k = String(r.data).slice(0, 10);
          (mapa[k] = mapa[k] || []).push({
            id: 'c-' + r.profissional_id + '-' + k + '-' + r.hora, pro: r.profissional_id, time: String(r.hora || '00:00').slice(0, 5),
            duration: parseInt(r.duracao, 10) || 60, type: 'appt', servico: '', motivo: '', salaId: null,
            indisponivel: false, ocupada: true,
          });
        });
        if(estId !== E.atual) return; // trocou de estúdio enquanto carregava
        E.outros = mapa;
        E.faixa = faixa;
        renderCalendar();
        renderCurrentView();
      } finally { E.carregando = null; }
    })();
    return E.carregando;
  }

  /* ---------- Interface fixa: seletor de estúdio, filtro e quadro de pessoas ---------- */
  function montarInterface(){
    const view = document.getElementById('view-agenda');
    view?.classList.add('estudio-ativo');
    const toolbar = document.querySelector('#view-agenda .schedule-toolbar');

    if(!document.querySelector('.estudio-escopo')){
      const toggle = document.createElement('div');
      toggle.className = 'estudio-escopo';
      toggle.setAttribute('role', 'group');
      toggle.setAttribute('aria-label', 'O que mostrar na agenda');
      toggle.addEventListener('click', e => {
        const b = e.target.closest('[data-escopo]'); if(!b) return;
        E.escopo = b.dataset.escopo;
        atualizarInterface(); renderCurrentView();
      });
      const modo = toolbar && toolbar.querySelector('.view-mode-toggle');
      if(modo) modo.insertAdjacentElement('afterend', toggle); else if(toolbar) toolbar.prepend(toggle);
    }

    if(!document.querySelector('.estudio-seletor')){
      const sel = document.createElement('label');
      sel.className = 'estudio-seletor';
      sel.innerHTML = '<span>Estúdio</span><select id="estudioSeletor" aria-label="Estúdio mostrado na agenda"></select>';
      sel.querySelector('select').addEventListener('change', e => trocarEstudio(e.target.value));
      const esc_ = document.querySelector('.estudio-escopo');
      if(esc_) esc_.insertAdjacentElement('afterend', sel); else if(toolbar) toolbar.prepend(sel);
    }

    if(!document.querySelector('.estudio-pros-card')){
      const lateral = document.querySelector('#view-agenda .agenda-lateral');
      const card = document.createElement('div');
      card.className = 'card estudio-pros-card';
      card.addEventListener('change', e => {
        const c = e.target.closest('[data-pro]'); if(!c) return;
        if(c.checked) E.visiveis.add(c.dataset.pro); else E.visiveis.delete(c.dataset.pro);
        atualizarInterface(); renderCurrentView();
      });
      const cal = lateral && lateral.querySelector('.calendar-card');
      if(cal) cal.insertAdjacentElement('afterend', card); else if(lateral) lateral.prepend(card);
    }
    atualizarInterface();
  }

  function trocarEstudio(id){
    if(!estudioPorId(id) || id === E.atual) return;
    E.atual = id; lsSet(CHAVE_ESTUDIO, id);
    if(E.escopo === 'sala' && !salasSeparadas(estudioAtual())) E.escopo = 'todas';
    todasPessoas().forEach(p => E.visiveis.add(p.id));
    E.outros = {}; E.faixa = null;
    atualizarInterface(); renderCurrentView();
    carregarOutros(true);
  }

  function diasDoPeriodo(){
    if(agendaViewMode === 'semanal') return Array.from({ length: 7 }, (_, i) => { const d = getWeekStart(selectedDate); d.setDate(d.getDate() + i); return dateKey(d); });
    return [dateKey(selectedDate)];
  }
  function contar(id){
    let n = 0;
    diasDoPeriodo().forEach(k => {
      if(id === E.meuId) n += (appointments[k] || []).filter(a => a.type === 'appt').length;
      else n += (E.outros[k] || []).filter(a => a.pro === id && a.type === 'appt').length;
    });
    return n;
  }

  function atualizarInterface(){
    if(!E.ativo) return;
    const est = estudioAtual();
    const opcoes = [['todas', 'Todas'], ['minha', 'Só a minha']];
    if(salasSeparadas(est)) opcoes.push(['sala', 'Por sala']);
    if(E.escopo === 'sala' && !salasSeparadas(est)) E.escopo = 'todas';
    const toggle = document.querySelector('.estudio-escopo');
    if(toggle) toggle.innerHTML = opcoes.map(([k, t]) => `<button type="button" data-escopo="${k}" class="${k === E.escopo ? 'active' : ''}">${t}</button>`).join('');

    const seletor = document.querySelector('.estudio-seletor');
    if(seletor){
      seletor.hidden = E.estudios.length < 2;
      seletor.querySelector('select').innerHTML = E.estudios.map(s => `<option value="${esc(s.id)}" ${s.id === E.atual ? 'selected' : ''}>${esc(s.nome)}</option>`).join('');
    }

    const card = document.querySelector('.estudio-pros-card');
    if(!card) return;
    const travado = E.escopo === 'minha' || porSala();
    const pessoas = todasPessoas();
    const linha = p => `
      <label class="estudio-pro" style="${estilo(p.id)}">
        <input type="checkbox" data-pro="${esc(p.id)}" ${E.visiveis.has(p.id) ? 'checked' : ''} ${travado ? 'disabled' : ''}>
        <span class="estudio-pro-nome">${esc(p.nome)}${p.id === E.meuId ? ' (você)' : ''}
          <small>${p.id === E.meuId ? (est && est.papel === 'titular' ? 'Titular' : (est ? 'Profissional' : 'Você')) : p.papel === 'titular' ? 'Titular' : p.papel === 'conexao' ? 'Conexão · só "Ocupada"' : 'Profissional'}</small></span>
        <span class="estudio-pro-qtd" title="Atendimentos no período">${contar(p.id)}</span>
      </label>`;
    const doEstudio = pessoas.filter(p => p.papel !== 'conexao');
    const conex = pessoas.filter(p => p.papel === 'conexao');
    let html = '';
    if(est){
      html += `<div class="estudio-pros-titulo">Profissionais<span>${esc(est.nome)}${salasSeparadas(est) ? ' · ' + est.salas.length + ' salas' : ' · sala compartilhada'}</span></div>`;
      html += doEstudio.map(linha).join('');
    } else {
      html += `<div class="estudio-pros-titulo">Agenda</div>` + linha(pessoas[0]);
    }
    if(conex.length) html += `<div class="estudio-pros-titulo ec-sub">Conexões</div>` + conex.map(linha).join('');
    card.innerHTML = html;
  }

  /* ---------- Calendário: bolinhas na cor de cada colega ---------- */
  const renderCalendarOriginal = renderCalendar;
  renderCalendar = function(){
    renderCalendarOriginal.apply(this, arguments);
    if(!E.ativo) return;
    const visiveis = new Set(colunas().map(p => p.id));
    document.querySelectorAll('#calDays .cal-day:not(.empty)').forEach(cell => {
      const dia = parseInt(cell.textContent, 10); if(!dia) return;
      const k = dateKey(new Date(viewYear, viewMonth, dia));
      const pros = [...new Set((E.outros[k] || []).filter(a => a.type === 'appt' && visiveis.has(a.pro)).map(a => a.pro))];
      if(!pros.length) return;
      let wrap = cell.querySelector('.day-dots');
      if(!wrap){ wrap = document.createElement('div'); wrap.className = 'day-dots'; cell.appendChild(wrap); }
      pros.slice(0, 3).forEach(id => { const d = document.createElement('span'); d.className = 'day-dot'; d.style.background = cor(id).c; wrap.appendChild(d); });
    });
  };

  /* ---------- Diário ---------- */
  const renderScheduleOriginal = renderSchedule;
  renderSchedule = function(){
    scheduleRows.classList.remove('estudio-cols');
    if(!E.ativo){ renderScheduleOriginal(); return; }
    const cols = colunas();
    if(!porSala() && soEu(cols) && !estudioAtual()){ renderScheduleOriginal(); atualizarInterface(); return; }
    if(!faixaCobre()) carregarOutros();
    desenharDia(cols);
    atualizarInterface();
  };

  function cabecalhoDia(total, rotulo){
    scheduleDate.textContent = `${weekdayFull[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`;
    scheduleCount.textContent = `${total} atendimento(s) · ${rotulo}`;
  }
  function gradeVazia(texto){
    scheduleRows.innerHTML = `<div class="ec-vazio">${texto}</div>`;
  }
  function novaGrade(){
    scheduleRows.innerHTML = '';
    scheduleRows.classList.add('estudio-cols');
    const grid = document.createElement('div');
    grid.className = 'ec-grid';
    grid.addEventListener('click', e => e.stopPropagation()); // a grade cuida dos próprios cliques
    const gutter = document.createElement('div');
    gutter.className = 'ec-gutter';
    let g = '<div class="ec-head"></div>';
    for(let h = 0; h < 24; h++){
      g += `<div class="time-row hour" style="height:${DAY_ROW_H}px"><div class="time-label">${pad(h)}:00</div></div>`;
      g += `<div class="time-row" style="height:${DAY_ROW_H}px"><div class="time-label">:30</div></div>`;
    }
    gutter.innerHTML = g;
    grid.appendChild(gutter);
    scheduleRows.appendChild(grid);
    return grid;
  }
  function novaColuna(grid, cabecalho, styleStr){
    const col = document.createElement('div');
    col.className = 'ec-col';
    if(styleStr) col.setAttribute('style', styleStr);
    col.innerHTML = `<div class="ec-head">${cabecalho}</div>`;
    const rows = document.createElement('div');
    rows.className = 'ec-rows';
    let r = '';
    for(let i = 0; i < 48; i++) r += `<div class="time-row${i % 2 === 0 ? ' hour' : ''}" style="height:${DAY_ROW_H}px"><div class="time-line"></div></div>`;
    rows.innerHTML = r;
    col.appendChild(rows);
    grid.appendChild(col);
    return rows;
  }
  function faixaRiscada(rows, a, b, classe, texto){
    if(b <= a) return;
    const off = document.createElement('div');
    off.className = classe;
    off.style.top = (a / 30) * DAY_ROW_H + 'px';
    off.style.height = ((b - a) / 30) * DAY_ROW_H + 'px';
    if(texto) off.innerHTML = `<span>${texto}</span>`;
    rows.appendChild(off);
  }
  function blocoBase(hora, duracao){
    const el = document.createElement('div');
    el.style.top = (timeStrToMinutes(hora) / 30) * DAY_ROW_H + 'px';
    el.style.height = Math.max((duracao / 30) * DAY_ROW_H - 4, 20) + 'px';
    return el;
  }

  // Atendimentos da sala (ou do espaço compartilhado) neste dia, de todo mundo.
  function ocupacaoDoEspaco(key, est){
    if(!est) return [];
    const lista = [];
    (appointments[key] || []).forEach(a => { if(a.type === 'appt' && meuNoEstudio(a, est.id)) lista.push({ pro: E.meuId, time: a.time, duration: a.duration, salaId: a.salaId || null }); });
    (E.outros[key] || []).forEach(a => { if(a.type === 'appt' && !a.indisponivel && !a.ocupada) lista.push({ pro: a.pro, time: a.time, duration: a.duration, salaId: a.salaId }); });
    return lista;
  }

  function desenharDia(cols){
    const key = dateKey(selectedDate);
    const est = estudioAtual();

    if(porSala()){
      const total = ocupacaoDoEspaco(key, est).length;
      cabecalhoDia(total, `${est.salas.length} salas`);
      const grid = novaGrade();
      est.salas.forEach(sala => {
        const n = ocupacaoDoEspaco(key, est).filter(o => o.salaId === sala.id).length;
        const rows = novaColuna(grid, `<span class="ec-av ec-sala">${sala.ordem}</span><span class="ec-head-t"><b>${esc(sala.nome)}</b><span>${n} atendimento(s)</span></span>`);
        (appointments[key] || []).filter(a => a.type === 'appt' && a.salaId === sala.id).forEach(item => rows.appendChild(blocoMeu(item, key, true)));
        (E.outros[key] || []).filter(a => a.salaId === sala.id && !a.indisponivel).forEach(it => rows.appendChild(blocoOutra(it, false, true)));
        rows.addEventListener('click', e => cliqueLivre(e, rows, key, E.meuId, sala.id));
      });
      return;
    }

    cabecalhoDia(cols.reduce((s, p) => s + contar(p.id), 0), `${cols.length} profissional(is)`);
    if(!cols.length){ gradeVazia('Marque pelo menos uma profissional no quadro ao lado.'); return; }
    const grid = novaGrade();
    const diaSemana = selectedDate.getDay();
    const compartilhada = est && est.espaco === 'compartilhada';
    const ocup = compartilhada ? ocupacaoDoEspaco(key, est) : [];

    cols.forEach(p => {
      const n = contar(p.id);
      const rows = novaColuna(grid,
        `<span class="ec-av">${esc(iniciais(p.nome))}</span><span class="ec-head-t"><b>${esc(p.nome)}${p.id === E.meuId ? ' (você)' : ''}</b><span>${p.papel === 'conexao' ? 'Conexão' : n + ' atendimento(s)'}</span></span>`,
        estilo(p.id));

      const jan = janelaDoDia(p.expediente, diaSemana);
      if(jan){
        if(jan.fechado) faixaRiscada(rows, 0, 24 * 60, 'ec-off');
        else { faixaRiscada(rows, 0, jan.ini, 'ec-off'); faixaRiscada(rows, jan.fim, 24 * 60, 'ec-off'); }
      }
      // Sala compartilhada: mostra quando o espaço está com outra pessoa.
      if(compartilhada && p.papel !== 'conexao'){
        ocup.filter(o => o.pro !== p.id).forEach(o => {
          const a = timeStrToMinutes(o.time);
          faixaRiscada(rows, a, a + o.duration, 'ec-busy', 'Sala ocupada');
        });
      }

      if(p.id === E.meuId){
        (appointments[key] || []).forEach(item => rows.appendChild(blocoMeu(item, key, false)));
      } else {
        (E.outros[key] || []).filter(it => it.pro === p.id).forEach(it => rows.appendChild(blocoOutra(it, false, false)));
      }
      rows.addEventListener('click', e => cliqueLivre(e, rows, key, p.id, null));
    });
  }

  function textoLocal(item){
    if(!item.estudioId){ return ''; }
    if(item.estudioId === E.atual){
      const s = item.salaId && salaPorId(item.salaId);
      return s ? s.nome : '';
    }
    const outro = estudioPorId(item.estudioId);
    return outro ? outro.nome : 'outro estúdio';
  }

  function blocoMeu(item, key, mostrarNome){
    const block = blocoBase(item.time, item.duration);
    block.className = 'schedule-block ec-block ' + (item.type === 'block' ? 'block' : 'appt ec-cor');
    block.setAttribute('style', block.getAttribute('style') + ';' + estilo(E.meuId));
    const local = textoLocal(item);
    block.innerHTML = `<div class="sb-title">${esc(item.label)}</div><div class="sb-time">${item.servico ? esc(item.servico) + ' · ' : ''}${item.time} · ${item.duration} min${local ? ' · ' + esc(local) : ''}${mostrarNome ? ' · você' : ''}</div>`;
    attachDragToReschedule(block, item, key, DAY_ROW_H, () => renderSchedule());
    return block;
  }

  // Horário de uma colega (estúdio) ou parceira (conexão).
  function blocoOutra(it, semana, mostrarNome){
    const p = todasPessoas().find(x => x.id === it.pro) || { nome: 'Profissional' };
    const fim = minutesToTimeStr(timeStrToMinutes(it.time) + it.duration);
    const el = semana ? document.createElement('div') : blocoBase(it.time, it.duration);
    if(semana){ el.style.top = (timeStrToMinutes(it.time) / 30) * WEEK_ROW_H + 'px'; el.style.height = Math.max((it.duration / 30) * WEEK_ROW_H - 3, 16) + 'px'; }
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    const base = semana ? 'week-block' : 'schedule-block ec-block';
    const quem = mostrarNome ? ' · ' + esc(primeiroNome(p.nome)) : '';
    const sala = it.salaId && salaPorId(it.salaId);
    if(it.ocupada || it.indisponivel){
      const rot = it.ocupada ? 'Ocupada' : 'Indisponível';
      el.className = base + ' ec-outra ec-cor ec-privado';
      el.innerHTML = semana ? `<div class="wb-title">${LOCK}${rot}</div>` : `<div class="sb-title">${LOCK}${rot}</div><div class="sb-time">${it.time}–${fim}</div>`;
    } else if(it.type === 'block'){
      el.className = base + ' block ec-outra';
      el.innerHTML = semana ? `<div class="wb-title">${esc(it.motivo || 'Bloqueado')}</div>` : `<div class="sb-title">${esc(it.motivo || 'Horário bloqueado')}${quem}</div><div class="sb-time">${it.time}–${fim}</div>`;
    } else {
      el.className = base + ' ec-outra ec-cor ec-privado';
      el.innerHTML = semana
        ? `<div class="wb-title">${LOCK}${esc(it.servico || 'Ocupado')}</div>`
        : `<div class="sb-title">${LOCK}${esc(it.servico || 'Horário ocupado')}</div><div class="sb-time">${it.time}–${fim}${sala && !mostrarNome ? ' · ' + esc(sala.nome) : ''}${quem}</div>`;
    }
    el.setAttribute('style', (el.getAttribute('style') || '') + ';' + estilo(it.pro));
    el.setAttribute('aria-label', `${it.ocupada ? 'Ocupada' : it.indisponivel ? 'Indisponível' : (it.servico || 'Horário')} às ${it.time}, agenda de ${p.nome}`);
    const abrir = e => { e.stopPropagation(); detalheOutra(it, p); };
    el.addEventListener('click', abrir);
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(e); } });
    return el;
  }

  function cliqueLivre(e, rows, key, proId, salaId){
    if(typeof suprimirCliqueAgenda !== 'undefined' && suprimirCliqueAgenda) return;
    if(e.target.closest('.schedule-block')) return;
    const rect = rows.getBoundingClientRect();
    const hora = minutesToTimeStr(snapMinutes(((e.clientY - rect.top) / DAY_ROW_H) * 30, 15));
    if(proId !== E.meuId){
      const p = todasPessoas().find(x => x.id === proId);
      showToast(`Esse horário é da agenda de ${primeiroNome(p && p.nome)}. Cada profissional marca só na própria agenda.`);
      return;
    }
    const eu = todasPessoas()[0];
    const jan = janelaDoDia(eu.expediente, keyParaData(key).getDay());
    const min = timeStrToMinutes(hora);
    if(jan && (jan.fechado || min < jan.ini || min >= jan.fim)){ showToast('Fora do seu horário de atendimento.'); return; }
    selectedDate = keyParaData(key);
    salaPreferida = salaId;
    openModal('appt', hora);
  }

  /* ---------- Semanal ---------- */
  const renderWeekScheduleOriginal = renderWeekSchedule;
  renderWeekSchedule = function(){
    renderWeekScheduleOriginal();
    if(!E.ativo) return;
    atualizarInterface();
    if(!faixaCobre()) carregarOutros();
    const est = estudioAtual();
    const sala = porSala();
    const cols = colunas();
    if(!sala && soEu(cols) && !est) return;

    const lanesIds = sala ? est.salas.map(s => s.id) : cols.map(p => p.id);
    const lanes = Math.max(lanesIds.length, 1);
    const laneMeu = item => sala ? lanesIds.indexOf(item.salaId) : lanesIds.indexOf(E.meuId);
    const laneOutro = it => sala ? (it.indisponivel ? -1 : lanesIds.indexOf(it.salaId)) : lanesIds.indexOf(it.pro);
    const inicio = getWeekStart(selectedDate);

    weekGrid.querySelectorAll('.week-day-col').forEach((col, i) => {
      const d = new Date(inicio); d.setDate(d.getDate() + i);
      const key = dateKey(d);
      const rows = col.querySelector('.week-day-rows'); if(!rows) return;
      const meus = (appointments[key] || []);
      rows.querySelectorAll('.week-block').forEach((b, idx) => {
        const item = meus[idx];
        const lane = item ? laneMeu(item) : -1;
        if(lane < 0){ b.style.display = 'none'; return; }
        posicionar(b, lane, lanes);
        if(!b.classList.contains('block')){ b.classList.add('ec-cor'); b.setAttribute('style', b.getAttribute('style') + ';' + estilo(E.meuId)); }
      });
      (E.outros[key] || []).forEach(it => {
        const lane = laneOutro(it); if(lane < 0) return;
        const el = blocoOutra(it, true, sala);
        posicionar(el, lane, lanes);
        rows.appendChild(el);
      });
    });
    scheduleCount.textContent = sala ? `Semana · ${est.salas.length} salas` : `${cols.reduce((s, p) => s + contar(p.id), 0)} atendimento(s) na semana · ${cols.length} profissional(is)`;
  };
  function posicionar(el, lane, lanes){
    if(lanes <= 1) return;
    el.style.left = `calc(${lane} * 100% / ${lanes} + 2px)`;
    el.style.right = 'auto';
    el.style.width = `calc(100% / ${lanes} - 4px)`;
  }

  /* ---------- Detalhe de um horário de outra pessoa ---------- */
  let janela = null;
  function fecharJanela(){ if(janela){ janela.remove(); janela = null; } }
  function abrirJanela(html){
    fecharJanela();
    janela = document.createElement('div');
    janela.className = 'modal-overlay open estudio-janela';
    janela.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
    janela.addEventListener('click', e => { if(e.target === janela || e.target.closest('[data-fechar]')) fecharJanela(); });
    document.body.appendChild(janela);
    const foco = janela.querySelector('button'); if(foco) foco.focus();
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && janela) fecharJanela(); });

  function detalheOutra(it, p){
    let d = selectedDate;
    for(const k of Object.keys(E.outros)) if(E.outros[k].includes(it)){ d = keyParaData(k); break; }
    const fim = minutesToTimeStr(timeStrToMinutes(it.time) + it.duration);
    const quando = `${weekdayFull[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`;
    const chip = `<span class="ec-chip" style="${estilo(it.pro)}"><i></i>${esc(p.nome)}</span>`;
    const sala = it.salaId && salaPorId(it.salaId);
    let titulo, linhas, nota;
    if(it.ocupada){
      titulo = 'Horário ocupado'; linhas = '';
      nota = `${LOCK} <b>${esc(primeiroNome(p.nome))} está ocupada.</b> Nas conexões vocês veem só quando a outra está livre ou ocupada.`;
    } else if(it.indisponivel){
      titulo = 'Horário indisponível'; linhas = '';
      nota = `${LOCK} <b>${esc(primeiroNome(p.nome))} está atendendo em outro local.</b> Os detalhes ficam só com ela.`;
    } else if(it.type === 'block'){
      titulo = esc(it.motivo || 'Horário bloqueado'); linhas = ''; nota = '';
    } else {
      titulo = 'Horário ocupado';
      linhas = `<dt>Serviço</dt><dd>${esc(it.servico || '—')}</dd>${sala ? `<dt>Sala</dt><dd>${esc(sala.nome)}</dd>` : ''}`;
      nota = `${LOCK} <b>Cliente de ${esc(primeiroNome(p.nome))}.</b> O nome e a ficha ficam só com ela. Cada profissional é autônoma, com clientes e financeiro próprios.`;
    }
    abrirJanela(`<h3>${titulo}</h3>${chip}
      <dl class="ec-kv">${linhas}<dt>Data</dt><dd>${quando}</dd><dt>Horário</dt><dd>${it.time}–${fim}</dd></dl>
      ${nota ? `<p class="ec-nota">${nota}</p>` : ''}
      <div class="modal-actions"><button type="button" class="modal-btn-confirm" data-fechar>Entendi</button></div>`);
  }

  /* ---------- Local e sala no "Novo Atendimento" ---------- */
  let salaPreferida = null;
  let localEscolhidoAMao = false, salaEscolhidaAMao = false;

  function campoLocal(){
    let campo = document.getElementById('estudioLocalField');
    if(campo) return campo;
    const obs = document.getElementById('modalObsField');
    if(!obs) return null;
    campo = document.createElement('div');
    campo.id = 'estudioLocalField';
    campo.className = 'ec-local';
    campo.hidden = true;
    campo.innerHTML = `
      <div class="modal-field"><label for="ecLocal">Local</label><select id="ecLocal"></select><small class="ec-ajuda" id="ecLocalAjuda"></small></div>
      <div class="modal-field" id="ecSalaWrap"><label for="ecSala">Sala</label><select id="ecSala"></select><small class="ec-ajuda" id="ecSalaAjuda"></small></div>`;
    obs.insertAdjacentElement('beforebegin', campo);
    campo.querySelector('#ecLocal').addEventListener('change', () => { localEscolhidoAMao = true; salaEscolhidaAMao = false; atualizarSalas(); });
    campo.querySelector('#ecSala').addEventListener('change', () => { salaEscolhidaAMao = true; document.getElementById('ecSalaAjuda').textContent = ''; });
    ['apptDate', 'apptTime'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { sugerirLocal(); atualizarSalas(); }));
    document.querySelectorAll('#apptDurPicker select').forEach(s => s.addEventListener('change', atualizarSalas));
    return campo;
  }

  // Estúdio sugerido: onde eu mais atendo nesse dia da semana; se nada, o estúdio aberto na Agenda.
  function sugestaoDeLocal(key){
    if(E.estudios.length === 1) return E.estudios[0].id;
    const dia = keyParaData(key).getDay();
    const conta = {};
    Object.keys(appointments).forEach(k => {
      if(keyParaData(k).getDay() !== dia) return;
      (appointments[k] || []).forEach(a => { if(a.estudioId) conta[a.estudioId] = (conta[a.estudioId] || 0) + 1; });
    });
    const melhor = Object.keys(conta).filter(id => estudioPorId(id)).sort((a, b) => conta[b] - conta[a])[0];
    return melhor || E.atual || E.estudios[0].id;
  }
  function sugerirLocal(){
    if(localEscolhidoAMao || !E.estudios.length) return;
    const sel = document.getElementById('ecLocal'); if(!sel) return;
    const key = document.getElementById('apptDate').value || dateKey(selectedDate);
    sel.value = sugestaoDeLocal(key);
    const ajuda = document.getElementById('ecLocalAjuda');
    ajuda.textContent = E.estudios.length > 1 ? 'Sugerido pelo dia da semana. Você participa de ' + E.estudios.length + ' estúdios.' : '';
  }

  function minutosDuracao(){ return parseInt(document.getElementById('apptDuration').value, 10) || 60; }

  // Quem está na sala nesse horário (com o que a Agenda já carregou deste estúdio).
  function ocupanteDaSala(est, salaId, key, hora, dur){
    const ini = timeStrToMinutes(hora), fim = ini + dur;
    const lista = ocupacaoDoEspaco(key, est).filter(o => est.espaco === 'compartilhada' || o.salaId === salaId);
    return lista.find(o => timeStrToMinutes(o.time) < fim && ini < timeStrToMinutes(o.time) + o.duration) || null;
  }

  function atualizarSalas(){
    const campo = document.getElementById('estudioLocalField'); if(!campo || campo.hidden) return;
    const est = estudioPorId(document.getElementById('ecLocal').value);
    const wrap = document.getElementById('ecSalaWrap'), sel = document.getElementById('ecSala'), ajuda = document.getElementById('ecSalaAjuda');
    const bloqueio = modalMode === 'block';
    if(!est || bloqueio || !salasSeparadas(est)){
      wrap.hidden = true;
      if(est && !bloqueio && est.espaco === 'compartilhada'){
        const key = document.getElementById('apptDate').value || dateKey(selectedDate);
        const conhecido = est.id === E.atual;
        const oc = conhecido ? ocupanteDaSala(est, null, key, document.getElementById('apptTime').value || '09:00', minutosDuracao()) : null;
        document.getElementById('ecLocalAjuda').textContent = oc
          ? `A sala está ocupada das ${oc.time} às ${minutesToTimeStr(timeStrToMinutes(oc.time) + oc.duration)} (${primeiroNome(nomeDe(oc.pro))}).`
          : (E.estudios.length > 1 && !localEscolhidoAMao ? document.getElementById('ecLocalAjuda').textContent : 'Sala compartilhada: o app confere se o espaço está livre.');
      }
      return;
    }
    wrap.hidden = false;
    const key = document.getElementById('apptDate').value || dateKey(selectedDate);
    const hora = document.getElementById('apptTime').value || '09:00';
    const dur = minutosDuracao();
    const conhecido = est.id === E.atual; // das outras salas só o banco sabe
    const anterior = sel.value;
    let primeiraLivre = null;
    sel.innerHTML = est.salas.map(s => {
      const oc = conhecido ? ocupanteDaSala(est, s.id, key, hora, dur) : null;
      if(!oc && !primeiraLivre) primeiraLivre = s.id;
      return `<option value="${esc(s.id)}" ${oc ? 'disabled' : ''}>${esc(s.nome)}${conhecido ? (oc ? ' · ocupada' : ' · livre') : ''}</option>`;
    }).join('');
    const opcaoLivre = id => [...sel.options].some(o => o.value === id && !o.disabled);
    let alvo = null;
    if(salaPreferida && opcaoLivre(salaPreferida)) alvo = salaPreferida;
    else if(salaEscolhidaAMao && opcaoLivre(anterior)) alvo = anterior;
    else alvo = primeiraLivre;
    if(alvo) sel.value = alvo;
    ajuda.textContent = !conhecido ? 'O app confere se a sala está livre ao agendar.'
      : primeiraLivre ? (alvo === primeiraLivre && !salaPreferida ? `Sugerida: ${est.salas.find(s => s.id === primeiraLivre).nome}, a primeira livre nesse horário.` : '')
      : 'Todas as salas estão ocupadas nesse horário. Escolha outro horário.';
  }
  function nomeDe(id){ if(id === E.meuId) return 'você'; const p = todasPessoas().find(x => x.id === id); return p ? p.nome : 'outra profissional'; }

  const openModalOriginal = openModal;
  openModal = function(mode){
    const r = openModalOriginal.apply(this, arguments);
    const campo = campoLocal();
    if(campo){
      const mostrar = E.ativo && E.estudios.length > 0;
      campo.hidden = !mostrar;
      if(mostrar){
        localEscolhidoAMao = false; salaEscolhidaAMao = false;
        const sel = document.getElementById('ecLocal');
        sel.innerHTML = E.estudios.map(s => `<option value="${esc(s.id)}">${esc(s.nome)}</option>`).join('') + `<option value="${FORA}">Fora do estúdio (outro local)</option>`;
        sugerirLocal();
        atualizarSalas();
      }
    }
    salaPreferida = null;
    return r;
  };

  // Na edição de um atendimento já marcado, o local não muda por aqui.
  const abrirEdicaoOriginal = abrirEdicaoAtendimento;
  abrirEdicaoAtendimento = function(){
    const r = abrirEdicaoOriginal.apply(this, arguments);
    const campo = document.getElementById('estudioLocalField'); if(campo) campo.hidden = true;
    return r;
  };

  // Chamado por agenda.js antes de salvar. Devolve os campos extras, ou false para não salvar.
  window.camposDoEstudio = function(mode, key, hora, dur){
    const campo = document.getElementById('estudioLocalField');
    if(!E.ativo || !E.estudios.length || !campo || campo.hidden) return {};
    const local = document.getElementById('ecLocal').value;
    if(!local || local === FORA) return { estudio_id: null, sala_id: null };
    const est = estudioPorId(local);
    if(!est) return {};
    if(mode === 'block') return { estudio_id: est.id, sala_id: null };
    if(est.id === E.atual){
      const salaId = salasSeparadas(est) ? document.getElementById('ecSala').value : null;
      const oc = ocupanteDaSala(est, salaId, key, hora, dur);
      if(oc){
        const s = salaId && salaPorId(salaId);
        showToast(`${s ? s.nome : 'A sala'} está ocupada das ${oc.time} às ${minutesToTimeStr(timeStrToMinutes(oc.time) + oc.duration)} (${primeiroNome(nomeDe(oc.pro))}). Escolha outro horário${s ? ' ou outra sala' : ''}.`);
        return false;
      }
      return { estudio_id: est.id, sala_id: salaId || null };
    }
    return { estudio_id: est.id, sala_id: salasSeparadas(est) ? (document.getElementById('ecSala').value || null) : null };
  };

  /* ---------- Ligar ao carregamento da agenda, ao logout e às trocas de período ---------- */
  const loadOriginal = loadAgendamentosFromSupabase;
  loadAgendamentosFromSupabase = function(){
    const p = loadOriginal.apply(this, arguments);
    Promise.resolve(p).then(() => iniciar()).catch(() => iniciar());
    return p;
  };
  try{ supabaseClient.auth.onAuthStateChange(evento => { if(evento === 'SIGNED_OUT') desligar(); }); }catch(e){}

  setInterval(() => {
    if(!E.ativo || document.visibilityState !== 'visible') return;
    const v = document.getElementById('view-agenda');
    if(v && v.classList.contains('active')) carregarOutros(true);
  }, 60000);

  ['scheduleNavPrev', 'scheduleNavNext', 'scheduleNavToday', 'calPrev', 'calNext'].forEach(id => {
    const b = document.getElementById(id);
    if(b) b.addEventListener('click', () => { if(E.ativo && !faixaCobre()) carregarOutros(); });
  });

  // Outras telas (Meu Negócio › Parcerias) avisam quando algo muda.
  window.agendaCompartilhadaRecarregar = () => { E.faixa = null; iniciar(); };

  iniciar();
})();
