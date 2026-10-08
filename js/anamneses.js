/* Skin Expert Pro — Anamneses respondidas pela paciente e pré-fichas do Dashboard.
   Arquivo 13 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= ANAMNESES RESPONDIDAS PELA PACIENTE ================= */
  async function renderAnamnesesRespondidas(){
    const container = document.getElementById('anamnesesRespondidasContainer');
    container.innerHTML = '';
    if(!currentPatient) return;

    let data;
    if(isPacienteReal(currentPatient)){
      const { data: rows, error } = await supabaseClient
        .from('anamneses')
        .select('*')
        .eq('paciente_id', currentPatient.id)
        .order('respondida_em', { ascending: false });
      if(error || !rows) return;
      data = semAnamnesesRepetidas(rows);
    } else {
      data = demoAnamnesesPorPaciente[currentPatient.id] || [];
    }

    if(!data || data.length === 0) return;

    data.forEach(a => {
      const dt = new Date(a.respondida_em);
      const pad2 = n => String(n).padStart(2, '0');
      const horario = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      const dataFormatada = `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()} às ${horario}`;
      const sist = a.sistemica || {};
      const ev = a.estilo_vida || {};
      const sk = a.skincare || {};
      const autoList = (a.autopercepcao || []).map(t => `<div class="rotina-summary-item">${t}</div>`).join('')
        || '<div class="rotina-summary-item" style="color:var(--text-muted);">Nenhum item marcado.</div>';

      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = `
        <summary>
          <div class="historico-entry-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3v2h6V3"/></svg>
          </div>
          <div>
            <div class="historico-entry-title">${a.token ? 'Anamnese respondida pela paciente' : 'Anamnese preenchida pela profissional'}</div>
            <div class="historico-entry-date">${dataFormatada}</div>
          </div>
          <div class="historico-entry-spacer"></div>
          <button class="historico-pdf-btn" data-pdf-anamnese="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Baixar PDF
          </button>
          <svg class="historico-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div class="historico-entry-body">
          ${a.confirmada_em
            ? `<div class="consentimento-registro">✓ Conferida e confirmada pela paciente em ${new Date(a.confirmada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · consentimento ${escHTML(a.consentimento_versao || '')}</div>`
            : a.consentimento_em
            ? `<div class="consentimento-registro">✓ Consentimento aceito pela paciente em ${new Date(a.consentimento_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${escHTML(a.consentimento_versao || '')}</div>`
            : a.confirmacao_token
            ? `<div class="consentimento-registro falta">Aguardando a paciente conferir e confirmar. <button type="button" class="fin-btn-mini" data-reenviar-conf="${escHTML(a.confirmacao_token)}" style="margin-left:6px;">Enviar link pelo WhatsApp</button></div>`
            : '<div class="consentimento-registro falta">Sem consentimento registrado (anamnese anterior a esta função).</div>'}
          <div class="toggle-subtitle">Anamnese Sistêmica</div>
          <div class="rotina-summary-item">Medicamentos: ${sist.medicamentos || '—'}</div>
          <div class="rotina-summary-item">Alergias: ${sist.alergias || '—'}${sist.alergia_tipo ? ' — Tipo: ' + sist.alergia_tipo : ''}</div>
          <div class="rotina-summary-item">Gestante: ${sist.gestante || '—'} · Lactante: ${sist.lactante || '—'}</div>
          <div class="rotina-summary-item">Diabética: ${sist.diabetica || '—'}${sist.diabetica_tipo ? ' (' + sist.diabetica_tipo + ')' : ''} · Tireoide: ${sist.tireoide || '—'}${sist.tireoide_tipo ? ' (' + sist.tireoide_tipo + ')' : ''}</div>
          <div class="rotina-summary-item">Hipertensão: ${sist.hipertensao || '—'} · Hipotensão: ${sist.hipotensao || '—'}</div>
          <div class="rotina-summary-item">Cardiopatologia: ${sist.cardiopatologia || '—'} · Epilepsia: ${sist.epilepsia || '—'}</div>
          <div class="rotina-summary-item">Trombose: ${sist.trombose || '—'} · Insuficiência renal: ${sist.insuficiencia_renal || '—'} · Hepatite: ${sist.hepatite || '—'}</div>
          <div class="rotina-summary-item">SOP: ${sist.sop || '—'} · Antecedentes oncológicos: ${sist.oncologicos || '—'} · Cirurgia bariátrica: ${sist.bariatrico || '—'}</div>
          <div class="rotina-summary-item">Ansiedade: ${sist.ansiedade || '—'} · Depressão: ${sist.depressao || '—'}</div>
          <div class="rotina-summary-item">Dermatite: ${sist.dermatite || '—'}${sist.dermatite_frequencia ? ' (freq: ' + sist.dermatite_frequencia + ')' : ''} · Asma: ${sist.asma || '—'}${sist.asma_frequencia ? ' (freq: ' + sist.asma_frequencia + ')' : ''}</div>
          ${sist.outras_doencas ? `<div class="rotina-summary-item">Outras doenças: ${sist.outras_doencas}</div>` : ''}
          <div class="toggle-subtitle">Estilo de Vida</div>
          <div class="rotina-summary-item">Atividade física: ${ev.atividade_fisica || '—'} · Alimentação: ${ev.alimentacao || '—'}</div>
          <div class="rotina-summary-item">Água: ${ev.agua || '—'} · Sono: ${ev.sono || '—'}</div>
          <div class="rotina-summary-item">Exposição ao sol: ${ev.sol || '—'} · Tabagista: ${ev.tabagista || '—'}</div>
          <div class="rotina-summary-item">Bebida alcoólica: ${ev.alcool || '—'}${ev.alcool_frequencia ? ' (freq: ' + ev.alcool_frequencia + ')' : ''}</div>
          <div class="rotina-summary-item">Evacuação: ${ev.evacuacao || '—'} · Hábito urinário: ${ev.habito_urinario || '—'}</div>
          <div class="rotina-summary-item">Frequência menstrual: ${ev.frequencia_menstrual || '—'}</div>
          ${a.integrativa ? `<div class="toggle-subtitle">Anamnese Integrativa</div><div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${a.integrativa}</div>` : ''}
          <div class="toggle-subtitle">Descobrindo a Sua Pele</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">Principal Queixa: ${a.principal_queixa || '—'}</div>
          ${a.tratamentos_anteriores ? `<div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">Tratamentos Anteriores: ${a.tratamentos_anteriores}</div>` : ''}
          ${autoList}
          <div class="toggle-subtitle">Skincare</div>
          <div class="rotina-summary-item">Rotina atual: ${sk.atual || '—'}</div>
          ${sk.parado ? `<div class="rotina-summary-item">Produtos parados: ${sk.parado}</div>` : ''}
          <div class="rotina-summary-item">Regularidade: ${sk.regularidade || '—'} · Como gostaria: ${sk.como_gostaria || '—'}</div>
          <div class="toggle-subtitle">Investimento Confortável</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${a.investimento || '—'}</div>
          ${a.observacoes ? `<div class="toggle-subtitle">Observações Adicionais</div><div class="rotina-summary-item" style="border:none;">${a.observacoes}</div>` : ''}
        </div>
      `;
      const btnReenviar = details.querySelector('[data-reenviar-conf]');
      if(btnReenviar) btnReenviar.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        abrirEnvioMensagem({ paciente: currentPatient, modelo: 'confirmar_anamnese', link: linkConfirmacaoAnamnese(btnReenviar.dataset.reenviarConf) });
      });
      details.querySelector('[data-pdf-anamnese]').addEventListener('click', (e) => {
        e.preventDefault();
        openAnamnesePdf(a, dataFormatada);
      });
      container.appendChild(details);
    });
  }

  function openAnamnesePdf(a, dataFormatada){
    pushNavHistory();
    setLandscapePrintMode(false);
    const sist = a.sistemica || {};
    const ev = a.estilo_vida || {};
    const sk = a.skincare || {};

    document.getElementById('pdfAnamneseBrand').textContent = perfilProfissional.nome || '—';
    document.getElementById('pdfAnamneseRole').textContent = perfilProfissional.titulo || '';
    document.getElementById('pdfAnamneseContact').textContent = [perfilProfissional.email, perfilProfissional.telefone].filter(Boolean).join(' · ') || '—';
    document.getElementById('pdfAnamnesePaciente').textContent = currentPatient ? currentPatient.name : '—';
    document.getElementById('pdfAnamneseData').textContent = dataFormatada;
    document.getElementById('pdfPrincipalQueixa').textContent = a.principal_queixa || '—';
    document.getElementById('pdfTratamentosAnteriores').textContent = a.tratamentos_anteriores || '—';
    document.getElementById('pdfAutopercepcao').textContent = (a.autopercepcao || []).join('; ') || 'Nenhum item marcado.';
    document.getElementById('pdfIntegrativa').textContent = a.integrativa || '—';
    document.getElementById('pdfSistemica').textContent =
      `Medicamentos: ${sist.medicamentos || '—'} · Alergias: ${sist.alergias || '—'}${sist.alergia_tipo ? ' (' + sist.alergia_tipo + ')' : ''} · Gestante: ${sist.gestante || '—'} · Lactante: ${sist.lactante || '—'} · Diabética: ${sist.diabetica || '—'}${sist.diabetica_tipo ? ' (' + sist.diabetica_tipo + ')' : ''} · Tireoide: ${sist.tireoide || '—'}${sist.tireoide_tipo ? ' (' + sist.tireoide_tipo + ')' : ''} · Hipertensão: ${sist.hipertensao || '—'} · Hipotensão: ${sist.hipotensao || '—'} · Cardiopatologia: ${sist.cardiopatologia || '—'} · Epilepsia: ${sist.epilepsia || '—'} · Trombose: ${sist.trombose || '—'} · Insuficiência renal: ${sist.insuficiencia_renal || '—'} · Hepatite: ${sist.hepatite || '—'} · SOP: ${sist.sop || '—'} · Antecedentes oncológicos: ${sist.oncologicos || '—'} · Cirurgia bariátrica: ${sist.bariatrico || '—'} · Ansiedade: ${sist.ansiedade || '—'} · Depressão: ${sist.depressao || '—'} · Dermatite: ${sist.dermatite || '—'}${sist.dermatite_frequencia ? ' (freq: ' + sist.dermatite_frequencia + ')' : ''} · Asma: ${sist.asma || '—'}${sist.asma_frequencia ? ' (freq: ' + sist.asma_frequencia + ')' : ''}${sist.outras_doencas ? ' · Outras doenças: ' + sist.outras_doencas : ''}`;

    const explicacoesTireoide = {
      'Hipotireoidismo': 'Hipotireoidismo: A tireoide produz poucos hormônios, deixando o metabolismo lento. Os sinais comuns são cansaço extremo, ganho de peso, pele seca, prisão de ventre e intolerância ao frio.',
      'Hipertireoidismo': 'Hipertireoidismo: A tireoide produz hormônios em excesso, acelerando o organismo. Os sinais comuns são perda de peso rápida, coração acelerado (taquicardia), ansiedade, tremores e intolerância ao calor.'
    };
    const pdfTireoideExplicacao = document.getElementById('pdfTireoideExplicacao');
    if(sist.tireoide_tipo && explicacoesTireoide[sist.tireoide_tipo]){
      pdfTireoideExplicacao.textContent = explicacoesTireoide[sist.tireoide_tipo];
      pdfTireoideExplicacao.style.display = 'block';
    } else {
      pdfTireoideExplicacao.textContent = '';
      pdfTireoideExplicacao.style.display = 'none';
    }
    document.getElementById('pdfEstiloVida').textContent =
      `Atividade física: ${ev.atividade_fisica || '—'} · Alimentação: ${ev.alimentacao || '—'} · Água: ${ev.agua || '—'} · Sono: ${ev.sono || '—'} · Exposição ao sol: ${ev.sol || '—'} · Tabagista: ${ev.tabagista || '—'} · Bebida alcoólica: ${ev.alcool || '—'}${ev.alcool_frequencia ? ' (freq: ' + ev.alcool_frequencia + ')' : ''} · Evacuação: ${ev.evacuacao || '—'} · Hábito urinário: ${ev.habito_urinario || '—'} · Frequência menstrual: ${ev.frequencia_menstrual || '—'}`;
    document.getElementById('pdfSkincare').textContent =
      `Rotina atual: ${sk.atual || '—'}${sk.parado ? ' · Produtos parados: ' + sk.parado : ''} · Regularidade: ${sk.regularidade || '—'} · Como gostaria: ${sk.como_gostaria || '—'}`;
    document.getElementById('pdfInvestimento').textContent = a.investimento || '—';
    document.getElementById('pdfObservacoes').textContent = a.observacoes || '—';

    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavForPdf = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavForPdf) pacientesNavForPdf.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-skincare-pdf').classList.add('active');
    pageTitle.textContent = 'Ficha de Anamnese — ' + (currentPatient ? currentPatient.name : '');
    pageSubtitle.style.display = 'none';
  }

  function setLandscapePrintMode(on){
    let styleEl = document.getElementById('landscapePrintStyle');
    if(on){
      if(!styleEl){
        styleEl = document.createElement('style');
        styleEl.id = 'landscapePrintStyle';
        styleEl.textContent = '@page{ size: landscape; margin: 12mm; }';
        document.head.appendChild(styleEl);
      }
    } else if(styleEl){
      styleEl.remove();
    }
  }

  function openPlanoPdf(plano){
    pushNavHistory();
    setLandscapePrintMode(true);
    document.getElementById('pdfPlanoBrand').textContent = perfilProfissional.nome || '—';
    document.getElementById('pdfPlanoRole').textContent = perfilProfissional.titulo || '';
    document.getElementById('pdfPlanoContact').textContent = [perfilProfissional.email, perfilProfissional.telefone].filter(Boolean).join(' · ') || '—';
    document.getElementById('pdfPlanoPaciente').textContent = currentPatient ? currentPatient.name : '—';
    document.getElementById('pdfPlanoData').textContent = plano.dataGerada || '—';
    document.getElementById('pdfPlanoObjetivo').textContent = plano.objetivo || '—';
    document.getElementById('pdfPlanoDuracao').textContent = plano.duracao ? plano.duracao + ' dias' : '—';

    const pdfPlaceholderImg = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2216%22%20fill%3D%22%23f4ede8%22/%3E%3Cpath%20d%3D%22M40%2028h20v9l7%207v42a5%205%200%2001-5%205H38a5%205%200%2001-5-5V44l7-7z%22%20fill%3D%22none%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22%20stroke-linejoin%3D%22round%22/%3E%3Cline%20x1%3D%2240%22%20y1%3D%2250%22%20x2%3D%2260%22%20y2%3D%2250%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22/%3E%3C/svg%3E';
    // Planos antigos guardaram o endereço da foto da época; se a foto mudou de lugar, usa a foto ATUAL
    // do catálogo (mesmo nome do produto). Se mesmo assim não carregar, mostra o desenho padrão.
    const normNome = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    function fotoAtualDoProduto(p){
      try{
        const lista = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
        const n = normNome(p.name), b = normNome(p.brand);
        const achado = lista.find(x => normNome(x.name) === n && normNome(x.brand) === b) || lista.find(x => normNome(x.name) === n);
        if(achado && achado.image) return achado.image;
      }catch(e){}
      return p.image || '';
    }
    // O filtro de segurança tira "onerror" e o desenho SVG do HTML, então o substituto é colocado por aqui.
    function protegerFotosPdf(el){
      el.querySelectorAll('img.pdf-product-thumb').forEach(img => {
        const usarPadrao = () => { img.removeEventListener('error', usarPadrao); img.src = pdfPlaceholderImg; };
        if(!img.getAttribute('src')) usarPadrao();
        else { img.addEventListener('error', usarPadrao); if(img.complete && img.naturalWidth === 0) usarPadrao(); }
      });
    }
    function renderPdfProdutoCard(p){
      const whyHtml = (p.why && p.why.length)
        ? `<div class="pdf-product-why"><div class="pdf-product-why-title">Por que foi sugerido</div><div class="pdf-product-why-item"><b>Contém:</b> ${p.why.map(w => w.nome).join(', ')}</div>${p.func ? `<div class="pdf-product-why-item">${p.func}</div>` : ''}</div>`
        : (p.func
          ? `<div class="pdf-product-why"><div class="pdf-product-why-title">Por que foi indicado</div><div class="pdf-product-why-item">${p.func}</div></div>`
          : '');
      const etapaHtml = p.categoria ? `<div class="pdf-product-etapa">${p.categoria}</div>` : '';
      const usageHtml = p.usage
        ? `<div class="pdf-product-usage-title">Modo de uso</div><div class="pdf-product-usage">${p.usage}</div>`
        : '';
      return `<div class="pdf-product"><img class="pdf-product-thumb" src="${fotoAtualDoProduto(p)}" alt="${p.name}"><div class="pdf-product-info">${etapaHtml}<div class="pdf-product-name">${p.name}</div><div class="pdf-product-brand">${p.brand}</div>${usageHtml}${whyHtml}</div></div>`;
    }

    function ordenarPorEtapa(lista){
      return [...lista].sort((a, b) => {
        let ia = skincareCategories.indexOf(categoriaCanonica(a.categoria));
        let ib = skincareCategories.indexOf(categoriaCanonica(b.categoria));
        if(ia === -1) ia = skincareCategories.length;
        if(ib === -1) ib = skincareCategories.length;
        return ia - ib;
      });
    }

    const manhaOrdenada = ordenarPorEtapa(plano.manha);
    const noiteOrdenada = ordenarPorEtapa(plano.noite);

    const manhaEl = document.getElementById('pdfPlanoManha');
    manhaEl.innerHTML = manhaOrdenada.length
      ? manhaOrdenada.map(renderPdfProdutoCard).join('')
      : '<p style="color:var(--text-muted);">Nenhum produto adicionado.</p>';

    const noiteEl = document.getElementById('pdfPlanoNoite');
    noiteEl.innerHTML = noiteOrdenada.length
      ? noiteOrdenada.map(renderPdfProdutoCard).join('')
      : '<p style="color:var(--text-muted);">Nenhum produto adicionado.</p>';
    protegerFotosPdf(manhaEl);
    protegerFotosPdf(noiteEl);

    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavForPdf = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavForPdf) pacientesNavForPdf.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-plano-pdf').classList.add('active');
    pageTitle.textContent = 'Plano de SkinCare — ' + (currentPatient ? currentPatient.name : '');
    pageSubtitle.style.display = 'none';
  }

  /* ---------- Cor do tema ---------- */
  const TEMAS = [
    { id:'bordo', nome:'Bordô com Dourado', cor1:'#4a1524', cor2:'#a9762f', cor3:'#f2e2e6' },
    { id:'azul',  nome:'Azul com Dourado',  cor1:'#14284a', cor2:'#a9762f', cor3:'#e2e8f2' },
    { id:'verde', nome:'Verde com Dourado', cor1:'#1d3a2b', cor2:'#a9762f', cor3:'#e1ede5' },
    { id:'terracota', nome:'Terracota com Dourado', cor1:'#5a3326', cor2:'#a9762f', cor3:'#f4e5dc' },
  ];
  // Quem usava um tema que saiu da lista (ex.: Grafite) volta para o Bordô.
  try{ const t0 = document.documentElement.getAttribute('data-tema'); if(t0 && !TEMAS.some(x => x.id === t0)) aplicarTema('bordo'); }catch(e){}
  function temaAtual(){
    const t = document.documentElement.getAttribute('data-tema') || 'bordo';
    return TEMAS.some(x => x.id === t) ? t : 'bordo';
  }
  function aplicarTema(id){
    if(!TEMAS.some(t => t.id === id)) id = 'bordo';
    if(id === 'bordo') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', id);
    try{ localStorage.setItem('skinExpertTema', id); }catch(e){}
    renderSeletorTema();
  }
  function renderSeletorTema(){
    const wrap = document.getElementById('temaOpcoes');
    if(!wrap) return;
    const atual = temaAtual();
    wrap.innerHTML = '';
    TEMAS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tema-opcao' + (t.id === atual ? ' ativo' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', t.id === atual ? 'true' : 'false');
      b.innerHTML = `
        <div class="tema-bola-wrap">
          <div class="tema-bola"><span style="background:${t.cor1}"></span><span style="background:${t.cor2}"></span><span style="background:${t.cor3}"></span></div>
          <span class="tema-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></span>
        </div>
        <span class="tema-nome">${t.nome}</span>`;
      b.addEventListener('click', () => {
        if(t.id === temaAtual()) return;
        aplicarTema(t.id);
        salvarConfig('tema', t.id);
        showToast('Tema "' + t.nome + '" aplicado!');
      });
      wrap.appendChild(b);
    });
  }
  // Quem tinha escolhido um tema que saiu da lista (ex.: Rosa, Prata) volta para o padrão.
  if(document.documentElement.getAttribute('data-tema') && temaAtual() === 'bordo') aplicarTema('bordo');
  renderSeletorTema();

  /* ---------- Configurações (preferências de moeda/idioma) ---------- */
  (function initConfiguracoes(){
    const paisSelect = document.getElementById('cfgPaisAtuacao');
    paisSelect.value = localStorage.getItem('skinExpertPaisAtuacao') || 'BR';
    document.getElementById('cfgMoeda').value = localStorage.getItem('skinExpertMoeda') || '';

    document.getElementById('btnSalvarConfiguracoes').addEventListener('click', () => {
      localStorage.setItem('skinExpertPaisAtuacao', paisSelect.value);
      salvarConfig('pais_atuacao', paisSelect.value);
      const moedaSel = document.getElementById('cfgMoeda').value;
      try{ localStorage.setItem('skinExpertMoeda', moedaSel); }catch(e){}
      salvarConfig('moeda', moedaSel);
      renderCatalogo();
      aplicarMoedaNoApp();
      showToast('Preferências salvas! Moeda do sistema: ' + simboloMoeda());
    });

    document.getElementById('btnSalvarDadosProfissionais').addEventListener('click', async () => {
      const nome = document.getElementById('cfgNomeProfissional').value.trim();
      const titulo = document.getElementById('cfgTituloProfissional').value.trim();
      const telefone = document.getElementById('cfgTelefoneProfissional').value.trim();

      if(!nome){ showToast('Informe seu nome.'); return; }

      perfilProfissional.nome = nome;
      perfilProfissional.titulo = titulo || 'Esteticista e Cosmetóloga';
      perfilProfissional.telefone = telefone;

      const usuarioPerfil = await usuarioParaSalvar();
      if(!usuarioPerfil && !modoDemonstracao) return; // sessão caiu: não finge que salvou
      if(usuarioPerfil){
        try {
          const { error: erroPerfil } = await supabaseClient.from('perfis').upsert({ id: usuarioPerfil.id, nome: perfilProfissional.nome, titulo: perfilProfissional.titulo, telefone: perfilProfissional.telefone });
          if(erroPerfil){ showToast('Não foi possível salvar seus dados: ' + erroPerfil.message); return; }
        } catch(err){
          console.warn('Não foi possível salvar Meus Dados Profissionais no Supabase.', err);
          showToast('Não foi possível salvar seus dados. Verifique a internet e tente de novo.');
          return;
        }
      } else {
        localStorage.setItem('skinExpertDemoNome', perfilProfissional.nome);
        localStorage.setItem('skinExpertDemoTitulo', perfilProfissional.titulo);
        localStorage.setItem('skinExpertDemoTelefone', perfilProfissional.telefone);
      }

      atualizarSidebarPerfil();
      showToast('Seus dados foram salvos com sucesso!');
    });

    document.getElementById('btnSalvarWhatsapp').addEventListener('click', async () => {
      const numero = document.getElementById('cfgWhatsappNumero').value.trim();
      const phoneId = document.getElementById('cfgWhatsappPhoneId').value.trim();
      const token = document.getElementById('cfgWhatsappToken').value.trim();

      if(!phoneId || !token){ showToast('Preencha o Phone Number ID e o Access Token.'); return; }

      integracaoWhatsapp = { provider: 'meta_cloud_api', phone_number_id: phoneId, access_token: token, numero_whatsapp: numero, ativo: true };

      const usuarioWhats = await usuarioParaSalvar();
      if(!usuarioWhats && !modoDemonstracao) return;
      if(usuarioWhats){
        try {
          const { error: erroWhats } = await supabaseClient.from('integracoes_whatsapp').upsert({
            profissional_id: usuarioWhats.id,
            provider: integracaoWhatsapp.provider,
            phone_number_id: integracaoWhatsapp.phone_number_id,
            access_token: integracaoWhatsapp.access_token,
            numero_whatsapp: integracaoWhatsapp.numero_whatsapp,
            ativo: true,
            atualizado_em: new Date().toISOString()
          });
          if(erroWhats) throw erroWhats;
        } catch(err){
          console.warn('Não foi possível salvar a integração de WhatsApp no Supabase.', err);
          showToast('Erro ao salvar a integração. Tente novamente.');
          return;
        }
      } else {
        localStorage.setItem('skinExpertWhatsappPhoneId', phoneId);
        localStorage.setItem('skinExpertWhatsappToken', token);
        localStorage.setItem('skinExpertWhatsappNumero', numero);
        localStorage.setItem('skinExpertWhatsappAtivo', 'true');
      }

      preencherCamposWhatsapp();
      showToast('Integração com WhatsApp salva com sucesso!');
    });

    document.getElementById('btnTestarWhatsapp').addEventListener('click', async () => {
      if(!integracaoWhatsapp.phone_number_id || !integracaoWhatsapp.access_token){
        showToast('Salve sua integração antes de testar.');
        return;
      }
      showToast('Enviando mensagem de teste...');
      try{
        const { data, error } = await supabaseClient.functions.invoke('testar-whatsapp', { body: {} });
        if(error){
          showToast('Não foi possível confirmar o envio. Verifique seu Phone Number ID e Token.');
        } else {
          showToast('Mensagem de teste enviada! Verifique o WhatsApp do número cadastrado.');
        }
      } catch(e){
        showToast('Não foi possível conectar para testar agora.');
      }
    });

    document.getElementById('btnConectarGoogleAgenda').addEventListener('click', async () => {
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){
        showToast('Conecte-se com uma conta real (fora do modo demonstração) para usar a Google Agenda.');
        return;
      }
      iniciarConexaoGoogleAgenda(userData.user.id);
    });

    document.getElementById('btnDesconectarGoogleAgenda').addEventListener('click', async () => {
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return;
      try{
        await supabaseClient.from('integracoes_google_agenda').update({ ativo: false }).eq('profissional_id', userData.user.id);
      } catch(err){
        console.warn('Não foi possível desconectar a Google Agenda.', err);
      }
      googleAgendaConectado = false;
      preencherStatusGoogleAgenda();
      showToast('Google Agenda desconectada.');
    });
  })();

  document.getElementById('backFromPlanoPdf').addEventListener('click', () => {
    setLandscapePrintMode(false);
    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavBack = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavBack) pacientesNavBack.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-registro-paciente').classList.add('active');
    pageTitle.textContent = 'Registro de Paciente';
    pageSubtitle.style.display = 'none';
    switchRegistroTab('recomendacoes');
  });
  document.getElementById('btnBaixarPdfPlano').addEventListener('click', () => window.print());

  // Assinatura do conteúdo de uma anamnese: duas com a mesma assinatura (mesma paciente) são repetição.
  function assinaturaAnamnese(a){
    const campos = ['paciente_id', 'principal_queixa', 'tratamentos_anteriores', 'autopercepcao', 'integrativa',
                    'sistemica', 'estilo_vida', 'skincare', 'investimento', 'observacoes'];
    return JSON.stringify(campos.map(c => a[c] == null ? null : a[c]));
  }
  // Remove repetições: mesmo link (token) ou mesmo conteúdo da mesma paciente em até 24h.
  // Fica a primeira enviada. A lista deve vir da mais recente para a mais antiga.
  function semAnamnesesRepetidas(lista){
    const porToken = new Set(), porConteudo = new Map(), saida = [];
    lista.slice().reverse().forEach(a => { // da mais antiga para a mais recente
      if(a.token){
        const t = String(a.token);
        if(porToken.has(t)) return;
        porToken.add(t);
      }
      const sig = assinaturaAnamnese(a);
      const quando = new Date(a.respondida_em || 0).getTime();
      const anterior = porConteudo.get(sig);
      if(anterior != null && Math.abs(quando - anterior) < 24 * 3600 * 1000) return;
      porConteudo.set(sig, quando);
      saida.push(a);
    });
    return saida.reverse();
  }

  let renderPreFichasEmAndamento = null;
  function renderPreFichasDashboard(){
    if(renderPreFichasEmAndamento) return renderPreFichasEmAndamento; // evita montar a lista duas vezes ao mesmo tempo
    renderPreFichasEmAndamento = (async () => {
      const container = document.getElementById('preFichasContainer');
      const { data, error } = await supabaseClient
        .from('anamneses')
        .select('*, pacientes(nome)')
        .not('token', 'is', null)             // só as respondidas pela paciente pelo link
        .order('respondida_em', { ascending: false })
        .limit(60);
      if(error || !data) return;

      const lista = semAnamnesesRepetidas(data.filter(a => a.token)).slice(0, 5);
      container.innerHTML = '';
      if(!lista.length){
        container.innerHTML = '<div class="empty-state">Nenhuma pré-ficha respondida.</div>';
        return;
      }
      lista.forEach(a => {
        const dt = new Date(a.respondida_em);
        const dataFormatada = `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}`;
        const nome = a.pacientes ? a.pacientes.nome : ((patients.find(x => String(x.id) === String(a.paciente_id)) || {}).name || 'Paciente');
        const item = document.createElement('div');
        item.className = 'produtos-com-ativo-item';
        item.innerHTML = `
          <div><div class="pca-name">${escHTML(nome)}</div><div class="pca-brand">Respondida em ${dataFormatada}</div></div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        `;
        item.addEventListener('click', () => {
          const p = patients.find(x => String(x.id) === String(a.paciente_id));
          if(p) openPatientRegistro(p.id, 'historico');
        });
        container.appendChild(item);
      });
    })().catch(e => console.warn('Pré-fichas:', e)).finally(() => { renderPreFichasEmAndamento = null; });
    return renderPreFichasEmAndamento;
  }
