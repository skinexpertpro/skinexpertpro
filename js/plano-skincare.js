/* Skin Expert Pro — Plano de SkinCare e Recomendações (planos salvos da paciente).
   Arquivo 4 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= PLANO DE SKINCARE MODULE ================= */
  const skincareCategories = ["Demaquilante","Limpador","Tônico","Esfoliante","Hidratante","Área dos Olhos","Tratamento","Protetor Solar"];
  const routineEntries = []; // { id, category, product, period, frequency, selectedDays:[], usage, link, expanded }
  const weekdayLabels = ["D","S","T","Q","Q","S","S"];

  function updateSkincareMeta(){
    const basicEl = document.getElementById('skincareMetaBasic');
    if(currentPatient){
      basicEl.textContent = `${currentPatient.age} anos · ${currentPatient.gender || '—'}`;
    } else {
      basicEl.textContent = '— anos · —';
    }
    const baumannVal = document.getElementById('baumannResult') ? document.getElementById('baumannResult').textContent : '—';
    document.getElementById('skincareBaumannBadge').textContent = baumannVal || '—';
    const fitzSel = document.querySelector('#panel-avaliacao .scale-card.selected[data-group="fitzpatrick"]');
    document.getElementById('skincareFototipoBadge').textContent = fitzSel ? fitzSel.querySelector('.sc-title').textContent : '—';
  }

  function toggleRoutineEntry(product, period, why){
    const idx = routineEntries.findIndex(e => e.product.id === product.id && e.period === period);
    if(idx >= 0){
      routineEntries.splice(idx, 1);
    } else {
      routineEntries.push({
        id: 'r' + Date.now() + Math.random().toString(36).slice(2,6),
        category: product.category || 'Outros',
        product: product,
        period: period,
        frequency: 'diario',
        selectedDays: [],
        usage: product.usage || '',
        link: '',
        expanded: false,
        why: why || [],
      });
    }
    renderSkcProdutosEncontrados();
    renderJornada();
  }

  function renderJornada(){
    const container = document.getElementById('jornadaContainer');
    container.innerHTML = '';
    if(routineEntries.length === 0){
      container.innerHTML = '<div class="routine-empty">Nenhum produto adicionado ainda. Escolha produtos ao lado para montar a rotina.</div>';
      return;
    }

    routineEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'routine-entry' + (entry.expanded ? ' expanded' : '');

      const daysHTML = weekdayLabels.map((label, i) => `
        <div class="weekday-chip ${entry.selectedDays.includes(i) ? 'selected' : ''}" data-day="${i}">${label}</div>
      `).join('');

      card.innerHTML = `
        <div class="routine-entry-head">
          <div class="routine-entry-title">
            <span class="routine-period-pill ${entry.period}">${entry.period === 'manha' ? 'Manhã' : 'Noite'}</span>
            ${entry.product.name} <span style="color:var(--text-muted); font-weight:500;">— ${entry.category}</span>
          </div>
          <button class="routine-remove-btn" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
        <div class="routine-entry-body">
          <label>Frequência</label>
          <select class="freq-select">
            <option value="diario" ${entry.frequency === 'diario' ? 'selected' : ''}>Diário</option>
            <option value="personalizar" ${entry.frequency === 'personalizar' ? 'selected' : ''}>Personalizar</option>
          </select>
          <div class="weekday-picker" style="${entry.frequency === 'personalizar' ? '' : 'display:none;'}">${daysHTML}</div>
          <label>Modo de uso</label>
          <textarea class="usage-input">${entry.usage}</textarea>
          <label>Link do produto (opcional)</label>
          <input type="text" class="link-input" value="${entry.link}" placeholder="https://...">
        </div>
      `;

      card.querySelector('.routine-entry-head').addEventListener('click', (e) => {
        if(e.target.closest('.routine-remove-btn')) return;
        entry.expanded = !entry.expanded;
        renderJornada();
      });
      card.querySelector('.routine-remove-btn').addEventListener('click', () => {
        const idx = routineEntries.indexOf(entry);
        if(idx >= 0) routineEntries.splice(idx, 1);
        renderJornada();
        renderSkcProdutosEncontrados();
      });
      const freqSelect = card.querySelector('.freq-select');
      freqSelect.addEventListener('click', (e) => e.stopPropagation());
      freqSelect.addEventListener('change', () => {
        entry.frequency = freqSelect.value;
        renderJornada();
      });
      card.querySelectorAll('.weekday-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const day = parseInt(chip.dataset.day, 10);
          const pos = entry.selectedDays.indexOf(day);
          if(pos >= 0) entry.selectedDays.splice(pos, 1); else entry.selectedDays.push(day);
          chip.classList.toggle('selected');
        });
      });
      const usageInput = card.querySelector('.usage-input');
      usageInput.addEventListener('click', (e) => e.stopPropagation());
      usageInput.addEventListener('input', () => { entry.usage = usageInput.value; });
      const linkInput = card.querySelector('.link-input');
      linkInput.addEventListener('click', (e) => e.stopPropagation());
      linkInput.addEventListener('input', () => { entry.link = linkInput.value; });

      container.appendChild(card);
    });
  }

  /* ================= RECOMENDAÇÕES MODULE (planos de skincare salvos) ================= */
  const recomendacoesDataDemo = []; // usado apenas no modo demonstração (pacientes fictícias)
  const demoAnamnesesPorPaciente = {}; // { pacienteId: [ payload, payload, ... ] } — usado apenas no modo demonstração

  function isPacienteReal(p){
    return p && String(p.id).includes('-');
  }

  // Evita cadastrar a mesma cliente duas vezes: considera duplicado quando o nome
  // (ignorando maiúsculas/espaços) e o número de telefone (só os dígitos) já existem
  // em outra paciente cadastrada. excludeId serve para não comparar a paciente com ela mesma ao editar.
  function encontrarPacienteDuplicado(nome, telefoneNumero, excludeId){
    const nomeNorm = (nome || '').trim().toLowerCase();
    const telNorm = (telefoneNumero || '').replace(/\D/g, '');
    if(!nomeNorm || !telNorm) return null;
    return patients.find(p => {
      if(excludeId && String(p.id) === String(excludeId)) return false;
      const pNome = (p.name || '').trim().toLowerCase();
      const pTel = (p.phoneNumber || '').replace(/\D/g, '');
      return pNome === nomeNorm && pTel === telNorm;
    }) || null;
  }

  /* ---------- Cabeçalho de alerta da paciente (gestante/lactante/alergia) ---------- */
  async function atualizarHeaderPaciente(p){
    const badgesEl = document.getElementById('patientHeaderBadges');
    if(!badgesEl || !p) return;

    badgesEl.innerHTML = '';

    let sist = null;
    if(isPacienteReal(p)){
      const { data, error } = await supabaseClient
        .from('anamneses')
        .select('sistemica')
        .eq('paciente_id', p.id)
        .order('respondida_em', { ascending: false })
        .limit(1);
      if(!error && data && data[0]) sist = data[0].sistemica || {};
    } else {
      const lista = demoAnamnesesPorPaciente[p.id] || [];
      if(lista[0]) sist = lista[0].sistemica || {};
    }
    if(!sist || currentPatient !== p) return;

    const badges = [];
    if(sist.gestante === 'Sim') badges.push({ tipo:'atencao', label:'Atenção', valor:'Gestante' });
    if(sist.lactante === 'Sim') badges.push({ tipo:'atencao', label:'Atenção', valor:'Lactante' });
    if(sist.alergias === 'Sim') badges.push({ tipo:'alergia', label:'Alergia', valor: sist.alergia_tipo || 'Não especificada' });

    badgesEl.innerHTML = badges.map(b => `
      <div class="patient-alert-badge ${b.tipo}">
        <span class="pab-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L14.71 3.86a2 2 0 00-3.42 0z"/></svg>
        </span>
        <span>
          <span class="pab-label">${b.label}</span>
          <span class="pab-value">${b.valor}</span>
        </span>
      </div>
    `).join('');
  }

  function planoCardHTML(plano){
    const manhaHTML = plano.manha.length
      ? plano.manha.map(p => `<div class="rotina-summary-item">${p.name} — ${p.brand}</div>`).join('')
      : '<div class="rotina-summary-item" style="color:var(--text-muted);">Nenhum produto adicionado.</div>';
    const noiteHTML = plano.noite.length
      ? plano.noite.map(p => `<div class="rotina-summary-item">${p.name} — ${p.brand}</div>`).join('')
      : '<div class="rotina-summary-item" style="color:var(--text-muted);">Nenhum produto adicionado.</div>';

    return `
      <summary>
        <div class="historico-entry-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg>
        </div>
        <div>
          <div class="historico-entry-title">${plano.objetivo || 'Plano de SkinCare'}</div>
          <div class="historico-entry-date">${plano.dataGerada}${plano.duracao ? ' · Acompanhamento de ' + plano.duracao + ' dias' : ''}</div>
        </div>
        <div class="historico-entry-spacer"></div>
        <button class="historico-pdf-btn" data-pdf-plano="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Baixar PDF
        </button>
        <svg class="historico-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="historico-entry-body">
        <div class="rotina-summary-cols">
          <div>
            <div class="rotina-summary-title">Rotina da Manhã</div>
            ${manhaHTML}
          </div>
          <div>
            <div class="rotina-summary-title">Rotina da Noite</div>
            ${noiteHTML}
          </div>
        </div>
      </div>
    `;
  }

  function attachPlanoPdfButton(details, plano){
    details.querySelector('[data-pdf-plano]').addEventListener('click', (e) => {
      e.preventDefault();
      openPlanoPdf(plano);
    });
  }

  async function renderRecomendacoes(){
    const list = document.getElementById('recomendacoesList');
    const badge = document.getElementById('recomendacoesCountBadge');
    list.innerHTML = '';

    let planos = [];

    if(isPacienteReal(currentPatient)){
      const { data, error } = await supabaseClient
        .from('planos_skincare')
        .select('*')
        .eq('paciente_id', currentPatient.id)
        .order('data_gerada', { ascending: false });

      if(!error && data){
        planos = data.map(row => {
          const dt = new Date(row.data_gerada);
          return {
            objetivo: row.objetivo,
            duracao: row.duracao_dias,
            dataGerada: `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`,
            manha: row.rotina_manha || [],
            noite: row.rotina_noite || [],
          };
        });
      }
    } else {
      planos = recomendacoesDataDemo.slice().reverse();
    }

    badge.textContent = planos.length + (planos.length === 1 ? ' plano' : ' planos');

    if(planos.length === 0){
      list.innerHTML = '<div class="registro-card empty-state">Nenhum plano de SkinCare foi salvo ainda para esta paciente.</div>';
      return;
    }

    planos.forEach(plano => {
      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = planoCardHTML(plano);
      attachPlanoPdfButton(details, plano);
      list.appendChild(details);
    });
  }
  renderRecomendacoes();

  document.getElementById('btnFinalizarSkincarePlano').addEventListener('click', async () => {
    const objetivo = document.getElementById('skincareObjetivo').value.trim();
    const duracao = document.getElementById('skincareDuracao').value.trim();
    const manha = routineEntries.filter(e => e.period === 'manha').map(e => ({ name: e.product.name, brand: e.product.brand, image: e.product.image || '', categoria: e.category || e.product.category || '', usage: e.usage || e.product.usage || '', func: e.product.func || '', why: e.why || [] }));
    const noite = routineEntries.filter(e => e.period === 'noite').map(e => ({ name: e.product.name, brand: e.product.brand, image: e.product.image || '', categoria: e.category || e.product.category || '', usage: e.usage || e.product.usage || '', func: e.product.func || '', why: e.why || [] }));

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }

      const { error } = await supabaseClient.from('planos_skincare').insert({
        paciente_id: currentPatient.id,
        profissional_id: userData.user.id,
        objetivo, duracao_dias: parseInt(duracao, 10) || null,
        rotina_manha: manha, rotina_noite: noite,
      });

      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
    } else {
      const hoje = new Date();
      recomendacoesDataDemo.push({
        objetivo, duracao,
        dataGerada: `${hoje.getDate()} de ${monthNames[hoje.getMonth()]}, ${hoje.getFullYear()}`,
        manha, noite,
      });
    }

    try{ registrarNovoPlanoAcompanhamento(currentPatient, duracao); }catch(e){ console.warn('Acompanhamentos:', e); }
    await renderRecomendacoes();
    await renderPlanosSkincareHistorico();
    showToast('Plano de SkinCare salvo com sucesso!');
  });

  /* ---------- Planos de SkinCare no Histórico ---------- */
  async function renderPlanosSkincareHistorico(){
    const container = document.getElementById('planosSkincareHistoricoContainer');
    container.innerHTML = '';
    if(!isPacienteReal(currentPatient)) return;

    const { data, error } = await supabaseClient
      .from('planos_skincare')
      .select('*')
      .eq('paciente_id', currentPatient.id)
      .order('data_gerada', { ascending: false });

    if(error || !data) return;

    data.forEach(row => {
      const dt = new Date(row.data_gerada);
      const plano = {
        objetivo: row.objetivo,
        duracao: row.duracao_dias,
        dataGerada: `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`,
        manha: row.rotina_manha || [],
        noite: row.rotina_noite || [],
      };
      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = planoCardHTML(plano);
      attachPlanoPdfButton(details, plano);
      container.appendChild(details);
    });
  }

  function updateHistoricoCountBadge(){
    const total = document.querySelectorAll('#anamnesesRespondidasContainer .historico-entry, #planosSkincareHistoricoContainer .historico-entry, #avaliacoesHistoricoContainer .historico-entry').length;
    const badge = document.getElementById('historicoCountBadge');
    if(badge) badge.textContent = total + (total === 1 ? ' registro' : ' registros');
  }

  document.getElementById('backFromPdf').addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavBack = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavBack) pacientesNavBack.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-registro-paciente').classList.add('active');
    pageTitle.textContent = 'Registro de Paciente';
    pageSubtitle.style.display = 'none';
    switchRegistroTab('historico');
  });

  document.getElementById('btnBaixarPdf').addEventListener('click', () => window.print());
