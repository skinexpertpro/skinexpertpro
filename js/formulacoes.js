/* Skin Expert Pro — Formulações Cosméticas: dicionário de ativos e busca guiada.
   Arquivo 12 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= FORMULAÇÕES COSMÉTICAS MODULE ================= */
  /* INCI_GRUPOS_CENTELLA: em js/dados.js */
  /* ativosData: em js/dados.js */
  /* ===== Dicionário de ativos: conteúdo revisado (lotes) ===== */
  /* ATIVOS_REVISADOS: em js/dados.js */
  ativosData.forEach(a => { if(ATIVOS_REVISADOS[a.id]) Object.assign(a, ATIVOS_REVISADOS[a.id]); });
  /* ===== fim lotes ===== */

  function classeTagsHTML(classes){
    return classes.map(c => `<span class="category-chip">${c}</span>`).join(' ');
  }

  /* ---------- Assistente de Busca Guiada (fábrica reutilizável) ---------- */
  const classesDisponiveis = ['Antiacneicos', 'Antiglicantes', 'Anti-inflamatórios', 'Antimicrobianos', 'Antioxidantes', 'Antipoluição', 'Antipruriginosos', 'Calmantes', 'Cicatrizantes', 'Clareadores', 'Despigmentantes', 'Detoxificantes', 'Emolientes', 'Enzimáticos', 'Esfoliantes', 'Filmógenos', 'Firmadores', 'Fotoprotetores', 'Oclusivos', 'Peptídeos', 'Prebióticos', 'Probióticos', 'Queratolíticos', 'Regeneradores', 'Reparadores de barreira', 'Retinoides', 'Seborreguladores', 'Tensoativos', 'Tensores', 'Umectantes', 'Vasoprotetores'];
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  let renderAll;

  function letraInicial(nome){
    return nome.charAt(0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  function createAtivosBrowser(cfg){
    const classesContainer = cfg.classesContainer ? document.getElementById(cfg.classesContainer) : null;
    const temAssistente = !!(cfg.toggleBtn && document.getElementById(cfg.toggleBtn));

    if(classesContainer){
      classesDisponiveis.forEach(c => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.dataset.classe = c;
        chip.textContent = c;
        chip.addEventListener('click', () => { chip.classList.toggle('selected'); render(); });
        classesContainer.appendChild(chip);
      });
    }

    if(temAssistente){
      document.getElementById(cfg.toggleBtn).addEventListener('click', () => {
        const panel = document.getElementById(cfg.panel);
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      [cfg.gestante, cfg.vegano, cfg.organico].forEach(id => {
        document.getElementById(id).addEventListener('change', render);
      });
      document.getElementById(cfg.periodo).addEventListener('change', render);

      document.getElementById(cfg.limpar).addEventListener('click', () => {
        document.getElementById(cfg.gestante).checked = false;
        document.getElementById(cfg.vegano).checked = false;
        document.getElementById(cfg.organico).checked = false;
        document.getElementById(cfg.periodo).value = '';
        classesContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        render();
        showToast('Filtros limpos');
      });
      document.getElementById(cfg.aplicar).addEventListener('click', () => {
        render();
        document.getElementById(cfg.panel).style.display = 'none';
        showToast('Filtros aplicados!');
      });
    }

    let viewMode = 'todos';
    // Letra exibida no dicionário: mostra um grupo por vez para a página não ficar enorme.
    // null = escolhe automaticamente a primeira letra com ativos; 'TODAS' = lista completa.
    let letraSelecionada = null;
    document.querySelectorAll(cfg.tabSelector).forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll(cfg.tabSelector).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        viewMode = tab.dataset[cfg.tabDataKey];
        render();
      });
    });

    function render(){
      const term = document.getElementById(cfg.search).value.trim().toLowerCase();
      const gestante = temAssistente && document.getElementById(cfg.gestante).checked;
      const vegano = temAssistente && document.getElementById(cfg.vegano).checked;
      const organico = temAssistente && document.getElementById(cfg.organico).checked;
      const periodo = temAssistente ? document.getElementById(cfg.periodo).value : '';
      const classesAtivas = classesContainer ? Array.from(classesContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.classe) : [];

      const container = document.getElementById(cfg.cardsContainer);
      const azNavEl = document.getElementById(cfg.azNav);
      container.innerHTML = '';

      let filtered = ativosData.filter(a => {
        if(term && !a.nome.toLowerCase().includes(term)) return false;
        if(gestante && !a.gestantes) return false;
        if(vegano && !a.vegano) return false;
        if(organico && !a.organico) return false;
        if(periodo && a.periodo !== periodo && a.periodo !== 'Ambos') return false;
        if(classesAtivas.length > 0 && !classesAtivas.some(c => a.classe.includes(c))) return false;
        if(viewMode === 'favoritos' && !a.favorito) return false;
        return true;
      });

      if(filtered.length === 0){
        container.innerHTML = '<div class="registro-card empty-state">Nenhum ativo encontrado com esses critérios.</div>';
        azNavEl.innerHTML = '';
        return;
      }

      filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const grupos = {};
      filtered.forEach(a => {
        const letra = letraInicial(a.nome);
        if(!grupos[letra]) grupos[letra] = [];
        grupos[letra].push(a);
      });

      const letrasComAtivos = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const buscando = !!term;
      // Se a letra escolhida ficou sem resultados (por causa de filtros), vai para a primeira disponível.
      if(!buscando && letraSelecionada !== 'TODAS' && !grupos[letraSelecionada]) letraSelecionada = letrasComAtivos[0];
      const letrasVisiveis = (buscando || letraSelecionada === 'TODAS') ? letrasComAtivos : [letraSelecionada];

      azNavEl.innerHTML = alfabeto.map(letra => {
        const temAtivo = !!grupos[letra];
        const ativa = !buscando && letraSelecionada === letra;
        return `<button type="button" class="az-nav-letter ${temAtivo ? '' : 'disabled'} ${ativa ? 'active' : ''}" data-letra="${letra}" ${temAtivo ? '' : 'disabled'} aria-pressed="${ativa}" title="${temAtivo ? grupos[letra].length + ' ativo(s) com a letra ' + letra : 'Nenhum ativo com a letra ' + letra}">${letra}</button>`;
      }).join('') + `<button type="button" class="az-nav-letter todas ${!buscando && letraSelecionada === 'TODAS' ? 'active' : ''}" data-letra="TODAS" aria-pressed="${!buscando && letraSelecionada === 'TODAS'}">Todas</button>`;
      azNavEl.querySelectorAll('.az-nav-letter:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
          letraSelecionada = btn.dataset.letra;
          const busca = document.getElementById(cfg.search);
          if(busca.value){ busca.value = ''; }
          render();
        });
      });

      if(buscando){
        const info = document.createElement('div');
        info.className = 'ativo-busca-info';
        info.textContent = `${filtered.length} ativo(s) encontrado(s) para "${document.getElementById(cfg.search).value.trim()}" em todas as letras`;
        container.appendChild(info);
      }

      letrasVisiveis.forEach(letra => {
        const grupoDiv = document.createElement('div');
        grupoDiv.className = 'ativo-letter-group';
        grupoDiv.id = cfg.cardsContainer + '-' + letra;
        grupoDiv.innerHTML = `<div class="ativo-letter-heading">Ativos com letra ${letra} (${grupos[letra].length})</div>`;

        const grid = document.createElement('div');
        grid.className = 'ativo-card-grid';

        grupos[letra].forEach(a => {
          const realIdx = ativosData.indexOf(a);
          const card = document.createElement('div');
          card.className = 'ativo-card';
          card.innerHTML = `
            <div class="ativo-card-head">
              <div class="ativo-card-name">${a.nome}</div>
              <button class="fav-star-btn ${a.favorito ? 'active' : ''}" title="Favoritar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${a.favorito ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            </div>
            <div class="ativo-card-desc">${a.mecanismo}</div>
            <div class="ativo-card-footer">
              <div class="ativo-classe-tags">${classeTagsHTML(a.classe.slice(0,1))}</div>
              <button class="ativo-card-ler-mais">Ler mais ›</button>
            </div>
          `;
          card.querySelector('.ativo-card-ler-mais').addEventListener('click', () => openAtivoDetail(realIdx));
          card.querySelector('.fav-star-btn').addEventListener('click', () => {
            a.favorito = !a.favorito;
            renderAll();
            salvarConfig('ativos_anotacoes', anotacoesAtivosParaSalvar());
          });
          grid.appendChild(card);
        });

        grupoDiv.appendChild(grid);
        container.appendChild(grupoDiv);
      });
    }

    return render;
  }

  const renderAtivosFormulacoes = createAtivosBrowser({
    search:'ativosSearch', cardsContainer:'ativosCardsContainer', azNav:'azNav', classesContainer:'assistClasses', toggleBtn:'btnToggleAssistente',
    panel:'assistentePanel', gestante:'assistGestante', vegano:'assistVegano', organico:'assistOrganico', periodo:'assistPeriodo',
    limpar:'btnLimparFiltros', aplicar:'btnAplicarFiltros', tabSelector:'#catalogo-subpanel-ativos .fin-tab[data-ativoview]',
    tabDataKey:'ativoview'
  });

  renderAll = () => { renderAtivosFormulacoes(); };
  renderAll();

  /* ---------- Carrega Dicionário de Ativos do Supabase (com fallback ao mock) ---------- */
  async function loadAtivosFromSupabase(){
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return; // não logado: mantém o mock local

      const { data, error } = await supabaseClient.from('ativos').select('*');
      if(error || !data || data.length === 0) return; // erro ou tabela vazia: mantém o mock

      ativosData = data.map(a => ({
        id: a.id,
        nome: a.nome,
        classe: a.classe || [],
        mecanismo: a.mecanismo,
        ph: a.ph,
        incompatibilidade: a.incompatibilidade,
        dosagem: a.dosagem,
        fonte: a.fonte,
        periodo: a.periodo,
        vegano: !!a.vegano,
        organico: !!a.organico,
        gestantes: !!a.gestantes,
        favorito: !!a.favorito,
        anotacao: a.anotacao || '',
        inci: a.inci || '',
        inciNota: a.inci_nota || '',
        compostos: Array.isArray(a.compostos) ? a.compostos : [],
        veganoTexto: a.vegano_texto || '',
        organicoTexto: a.organico_texto || '',
        gestantesTexto: a.gestantes_texto || '',
        nota: a.nota || '',
        inciGrupos: Array.isArray(a.inci_grupos) ? a.inci_grupos : [],
        buscaInci: a.busca_inci !== false,
      }));

      renderAll();
    } catch(e){
      // qualquer falha de rede/consulta: segue com o mock local, sem travar o app
    }
  }
  // (loadAtivosFromSupabase roda no enterApp, depois do login — aqui só duplicava o carregamento)

  document.getElementById('ativosSearch').addEventListener('input', renderAtivosFormulacoes);

  /* ---------- Assistente de Busca Guiada por Ativos (Plano de SkinCare) ---------- */
  const skcAtivosDesejados = new Set();

  document.getElementById('skcBtnToggleAssistente').addEventListener('click', () => {
    const panel = document.getElementById('skcAssistentePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    atualizarProdutosSeAntigo();
  });

  const skcClassesContainer = document.getElementById('skcAssistClasses');
  classesDisponiveis.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.classe = c;
    chip.textContent = c;
    chip.addEventListener('click', () => { chip.classList.toggle('selected'); renderSkcAtivosDesejadosChips(); });
    skcClassesContainer.appendChild(chip);
  });

  const skcFuncaoContainer = document.getElementById('skcFuncaoExterno');

  skincareCategories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.funcao = cat;
    chip.textContent = cat;
    chip.addEventListener('click', () => { chip.classList.toggle('selected'); renderSkcProdutosEncontrados(); });
    skcFuncaoContainer.appendChild(chip);
  });

  document.getElementById('skcAssistGestante').addEventListener('change', renderSkcAtivosDesejadosChips);

  document.getElementById('skcBtnLimparFiltros').addEventListener('click', () => {
    document.getElementById('skcAssistGestante').checked = false;
    skcClassesContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    renderSkcAtivosDesejadosChips();
    showToast('Filtros limpos');
  });
  document.getElementById('skcBtnAplicarFiltros').addEventListener('click', () => {
    renderSkcAtivosDesejadosChips();
    document.getElementById('skcAssistentePanel').style.display = 'none';
    showToast('Filtros aplicados!');
  });

  function renderSkcAtivosDesejadosChips(){
    const gestante = document.getElementById('skcAssistGestante').checked;
    const classesAtivas = Array.from(skcClassesContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.classe);

    const filtered = ativosData.filter(a => {
      if(gestante && !a.gestantes) return false;
      if(classesAtivas.length > 0 && !classesAtivas.some(c => a.classe.includes(c))) return false;
      return true;
    }).sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const wrap = document.getElementById('skcAtivosDesejadosChips');
    wrap.innerHTML = '';
    if(filtered.length === 0){
      wrap.innerHTML = '<div style="font-size:13px; color:var(--text-muted);">Nenhum ativo encontrado com esses critérios.</div>';
    }
    filtered.forEach(a => {
      const chip = document.createElement('div');
      chip.className = 'chip' + (skcAtivosDesejados.has(a.id) ? ' selected' : '');
      chip.textContent = a.nome;
      chip.addEventListener('click', () => {
        if(skcAtivosDesejados.has(a.id)) skcAtivosDesejados.delete(a.id);
        else skcAtivosDesejados.add(a.id);
        chip.classList.toggle('selected');
        renderSkcProdutosEncontrados();
      });
      wrap.appendChild(chip);
    });
    renderSkcProdutosEncontrados();
  }

  /* ---------- Alerta de contraindicações (medicamentos/suplementos e outras doenças) ---------- */
  const mapaContraindicacoes = [
    { termos:['isotretinoina','roacutan','accutane','isotretinoína'], aviso:'Uso de isotretinoína (Roacutan): contraindica peeling/limpeza de pele por até 6 meses.' },
    { termos:['corticoide','corticosteroide','corticóide'], aviso:'Uso de corticoide: pode afetar a drenagem linfática e procedimentos com agulha/extração.' },
    { termos:['anticoagulante','warfarina','marevan','xarelto','eliquis','aas ', 'aspirina'], aviso:'Uso de anticoagulante: risco de sangramento/hematoma em procedimentos com agulha/extração.' },
    { termos:['marca-passo','marcapasso','implante metalico','protese metalica','pino metalico'], aviso:'Marca-passo ou implante metálico: contraindica alguns aparelhos de eletroterapia usados na drenagem.' },
    { termos:['cancer','tumor','linfedema','linfonodo','quimioterapia','oncologico'], aviso:'Histórico de câncer/linfedema ou remoção de linfonodos: contraindicação forte para drenagem linfática.' },
    { termos:['acido','retinoide','tretinoina','adapaleno','acido salicilico','acido glicolico'], aviso:'Uso atual de ácidos/retinoides tópicos: pode causar reação em limpeza de pele.' },
  ];

  function checarContraindicacoes(texto){
    const t = normalizarTexto(texto || '');
    if(!t.trim()) return [];
    const avisos = new Set();
    mapaContraindicacoes.forEach(regra => {
      if(regra.termos.some(termo => t.includes(normalizarTexto(termo)))){
        avisos.add(regra.aviso);
      }
    });
    return Array.from(avisos);
  }

  function bindContraindicacaoCheck(inputId, alertId){
    const input = document.getElementById(inputId);
    const alertBox = document.getElementById(alertId);
    if(!input || !alertBox) return;
    const verificar = () => {
      const avisos = checarContraindicacoes(input.value);
      if(avisos.length === 0){
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
        return;
      }
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<strong>⚠ Possível contraindicação identificada:</strong><ul>' +
        avisos.map(a => `<li>${a}</li>`).join('') + '</ul>';
    };
    input.addEventListener('input', verificar);
    input.addEventListener('blur', verificar);
  }

  bindContraindicacaoCheck('paMedicamentos', 'paMedicamentosAlert');
  bindContraindicacaoCheck('paOutrasDoencas', 'paOutrasDoencasAlert');
  bindContraindicacaoCheck('pubMedicamentos', 'pubMedicamentosAlert');
  bindContraindicacaoCheck('pubOutrasDoencas', 'pubOutrasDoencasAlert');

  /* ---------- Mostra o campo "Qual tipo de alergia?" só quando Alergias = Sim ---------- */
  function bindAlergiaTipoToggle(selectId, wrapId){
    const select = document.getElementById(selectId);
    const wrap = document.getElementById(wrapId);
    if(!select || !wrap) return;
    const atualizar = () => {
      wrap.style.display = select.value === 'Sim' ? 'block' : 'none';
      if(select.value !== 'Sim'){
        const input = wrap.querySelector('input');
        if(input) input.value = '';
        const innerSelect = wrap.querySelector('select');
        if(innerSelect) innerSelect.value = 'Selecionar';
      }
    };
    select.addEventListener('change', atualizar);
    atualizar();
  }

  bindAlergiaTipoToggle('paAlergias', 'paAlergiaTipoWrap');
  bindAlergiaTipoToggle('pubAlergias', 'pubAlergiaTipoWrap');
  bindAlergiaTipoToggle('paDermatite', 'paDermatiteFrequenciaWrap');
  bindAlergiaTipoToggle('pubDermatite', 'pubDermatiteFrequenciaWrap');
  bindAlergiaTipoToggle('paAsma', 'paAsmaFrequenciaWrap');
  bindAlergiaTipoToggle('pubAsma', 'pubAsmaFrequenciaWrap');
  bindAlergiaTipoToggle('paDiabetico', 'paDiabeticoTipoWrap');
  bindAlergiaTipoToggle('pubDiabetico', 'pubDiabeticoTipoWrap');
  bindAlergiaTipoToggle('paTireoide', 'paTireoideTipoWrap');
  bindAlergiaTipoToggle('pubTireoide', 'pubTireoideTipoWrap');

  /* ---------- Sugestão automática de ativos a partir do texto do Objetivo ---------- */
  function normalizarTexto(s){
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const skcMapaObjetivoClasse = [
    { termos:['limpeza profunda','higienizar','higienizacao','sujeira','impureza','impurezas','poros sujos'], classes:['Higienizantes'] },
    { termos:['oleosidade','oleosa','oleoso','brilho excessivo','pele mista','pele oleosa'], classes:['Seborreguladores'] },
    { termos:['acne','cravo','cravos','espinha','espinhas','cisto','comedao','comedoes','poros obstruidos','foliculite'], classes:['Antiacneicos'] },
    { termos:['mancha','manchas','hiperpigmentacao','melasma','melanose','uniformizar o tom','tom desigual','manchas de sol','manchas solares'], classes:['Despigmentantes','Clareadores'] },
    { termos:['ruga','rugas','linha fina','linhas finas','antienvelhecimento','anti-idade','sinais de idade','pele madura'], classes:['Retinoides','Regeneradores'] },
    { termos:['flacidez','firmeza','sustentacao','lifting','perda de firmeza','flacida'], classes:['Firmadores','Tensores','Peptídeos'] },
    { termos:['sensivel','sensibilidade','vermelhidao','rosacea','irritacao','irritada','alergia','reativa'], classes:['Calmantes','Anti-inflamatórios'] },
    { termos:['ressecamento','seca','desidratada','desidratacao','falta de hidratacao','pele repuxando'], classes:['Umectantes','Emolientes'] },
    { termos:['hidratacao','hidratar','sede da pele','hidratada'], classes:['Umectantes'] },
    { termos:['aspereza','pele aspera','maciez','suavizar','textura aspera'], classes:['Emolientes'] },
    { termos:['perda de agua','tewl','protecao da barreira','pele rachada','descamacao severa'], classes:['Oclusivos'] },
    { termos:['poro','poros','textura irregular','celulas mortas','renovacao celular','opacidade da pele'], classes:['Esfoliantes','Queratolíticos'] },
    { termos:['peeling suave','esfoliacao suave','renovacao gentil'], classes:['Enzimáticos','Esfoliantes'] },
    { termos:['barreira','barreira cutanea','barreira da pele','protecao cutanea'], classes:['Reparadores de barreira'] },
    { termos:['cicatriz','cicatrizes','marca de acne','pos-procedimento','pos procedimento','ferida'], classes:['Cicatrizantes','Regeneradores'] },
    { termos:['coceira','prurido','coca','pele que coca'], classes:['Antipruriginosos'] },
    { termos:['poluicao','cidade grande','smog','residuos ambientais'], classes:['Antipoluição'] },
    { termos:['toxinas','desintoxicar','detox','pele cansada'], classes:['Detoxificantes'] },
    { termos:['protecao solar','fotoenvelhecimento','sol','fps','queimadura solar'], classes:['Fotoprotetores'] },
    { termos:['glicacao','acucar','envelhecimento por acucar'], classes:['Antiglicantes'] },
    { termos:['vaso','vasos','capilar','capilares','couperose','olheiras','circulacao','vasinhos'], classes:['Vasoprotetores'] },
    { termos:['bacteria','fungo','fungos','microbiana','infeccao de pele'], classes:['Antimicrobianos'] },
    { termos:['luminosidade','vico','opacidade','radicais livres','antioxidante','pele cansada e opaca'], classes:['Antioxidantes'] },
    { termos:['microbioma','flora cutanea','equilibrio da pele','ph da pele'], classes:['Prebióticos','Probióticos'] },
    { termos:['pelicula protetora','filme protetor'], classes:['Filmógenos'] },
  ];

  function sugerirClassesPorObjetivo(texto){
    const t = normalizarTexto(texto);
    const classes = new Set();
    skcMapaObjetivoClasse.forEach(regra => {
      if(regra.termos.some(termo => t.includes(normalizarTexto(termo)))){
        regra.classes.forEach(c => classes.add(c));
      }
    });
    return classes;
  }

  document.getElementById('btnSugerirAtivosObjetivo').addEventListener('click', () => {
    const texto = document.getElementById('skincareObjetivo').value.trim();
    if(!texto){ showToast('Descreva o objetivo do plano primeiro.'); return; }

    const classesSugeridas = sugerirClassesPorObjetivo(texto);
    if(classesSugeridas.size === 0){
      showToast('Não encontrei ativos relacionados a esse objetivo. Tente descrever com outras palavras (ex: oleosidade, manchas, rugas).');
      return;
    }

    skcClassesContainer.querySelectorAll('.chip').forEach(chip => {
      chip.classList.toggle('selected', classesSugeridas.has(chip.dataset.classe));
    });

    document.getElementById('skcAssistentePanel').style.display = 'block';
    renderSkcAtivosDesejadosChips();

    // pré-seleciona automaticamente todos os ativos que caíram no filtro sugerido
    ativosData.filter(a => a.classe && a.classe.some(c => classesSugeridas.has(c)))
      .forEach(a => skcAtivosDesejados.add(a.id));
    renderSkcAtivosDesejadosChips();

    showToast('Sugestões aplicadas com base no objetivo!');
  });

  function renderSkcProdutosEncontrados(){
    const container = document.getElementById('skcProdutosEncontrados');
    container.innerHTML = '';

    const funcoesAtivas = Array.from(skcFuncaoContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.funcao);

    if(skcAtivosDesejados.size === 0 && funcoesAtivas.length === 0){
      container.innerHTML = '<div class="registro-card empty-state">Escolha uma função de produto ou selecione ativos acima para ver as opções do Catálogo.</div>';
      return;
    }

    // Mesma regra do Dicionário de Ativos: conta o ativo marcado no cadastro do produto
    // e também o que aparece na lista de ingredientes (INCI). Assim, todo produto novo do
    // Catálogo entra na busca sem precisar de ajuste no assistente.
    const ativosPorProduto = new Map(); // id do produto -> { ids: [ativos], marcados: n }
    skcAtivosDesejados.forEach(aid => {
      const a = ativosData.find(x => x.id === aid);
      if(!a) return;
      produtosQueContemAtivo(a).forEach(x => {
        const reg = ativosPorProduto.get(x.id) || { ids: [], marcados: 0 };
        reg.ids.push(aid);
        if(!x.__pelaInci) reg.marcados++;
        ativosPorProduto.set(x.id, reg);
      });
    });
    const ativosDoProduto = p => (ativosPorProduto.get(p.id) || { ids: [] }).ids;
    const qtdAtivosDoProduto = p => ativosDoProduto(p).length;
    const ordenar = (a, b) => (qtdAtivosDoProduto(b) - qtdAtivosDoProduto(a)) ||
      (((ativosPorProduto.get(b.id) || {}).marcados || 0) - ((ativosPorProduto.get(a.id) || {}).marcados || 0));
    let encontrados;
    if(funcoesAtivas.length > 0){
      // Tipo de produto escolhido: mostra TODOS desse tipo (ex.: os 14 protetores solares).
      // Os ativos escolhidos não escondem nada: só colocam primeiro quem os contém.
      encontrados = products.filter(p => funcoesAtivas.includes(p.category)).sort(ordenar);
    } else {
      // Só ativos escolhidos: mostra os produtos que contêm algum deles.
      encontrados = products.filter(p => qtdAtivosDoProduto(p) > 0).sort(ordenar);
    }

    if(encontrados.length === 0){
      container.innerHTML = '<div class="registro-card empty-state">Nenhum produto do Catálogo corresponde a esses critérios ainda.</div>';
      return;
    }

    if(funcoesAtivas.length > 0){
      const comAtivos = skcAtivosDesejados.size ? encontrados.filter(p => qtdAtivosDoProduto(p) > 0).length : 0;
      const resumo = document.createElement('div');
      resumo.style.cssText = 'font-size:12.5px; color:var(--text-muted); margin:0 0 10px 2px;';
      resumo.textContent = `${encontrados.length} produto(s) de ${funcoesAtivas.join(', ')}` +
        (skcAtivosDesejados.size ? ` · ${comAtivos} com os ativos escolhidos (aparecem primeiro)` : '');
      container.appendChild(resumo);
    }

    encontrados.forEach(prod => {
      const ativosMatch = ativosDoProduto(prod)
        .map(aid => ativosData.find(x => x.id === aid))
        .filter(Boolean);
      const onManha = routineEntries.some(e => e.product.id === prod.id && e.period === 'manha');
      const onNoite = routineEntries.some(e => e.product.id === prod.id && e.period === 'noite');

      const card = document.createElement('div');
      card.className = 'product-detail-card';
      const imgSrc = prod.image || 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2216%22%20fill%3D%22%23f4ede8%22/%3E%3Cpath%20d%3D%22M40%2028h20v9l7%207v42a5%205%200%2001-5%205H38a5%205%200%2001-5-5V44l7-7z%22%20fill%3D%22none%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22%20stroke-linejoin%3D%22round%22/%3E%3Cline%20x1%3D%2240%22%20y1%3D%2250%22%20x2%3D%2260%22%20y2%3D%2250%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22/%3E%3C/svg%3E';

      const whyItems = ativosMatch.map(a => `<div class="product-detail-why-item"><b>${a.nome}:</b> ${a.mecanismo || 'Ativo relacionado ao objetivo informado.'}</div>`).join('');

      card.innerHTML = `
        <img class="product-detail-thumb" src="${imgSrc}" alt="${prod.name}">
        <div class="product-detail-info">
          <div class="product-detail-top">
            <div class="product-detail-name">${prod.name}</div>
            <div class="product-detail-brand">${prod.brand}${prod.price ? ' · ' + faixaDePrecoUnica(prod.price, prod.apenasBrasil) : ''}</div>
            ${prod.category ? `<span class="category-chip" style="margin-top:4px;">${prod.category}</span>` : ''}
          </div>
          ${prod.func ? `<div class="product-detail-func">${prod.func}</div>` : ''}
          ${ativosMatch.length > 0 ? `
          <div class="product-detail-why">
            <div class="product-detail-why-title">Por que foi sugerido</div>
            ${whyItems}
          </div>` : ''}
          <div class="product-detail-actions">
            <button class="period-btn manha-btn ${onManha ? 'on' : ''}">☀ Manhã</button>
            <button class="period-btn noite-btn ${onNoite ? 'on' : ''}">🌙 Noite</button>
          </div>
        </div>
      `;
      card.querySelector('.manha-btn').addEventListener('click', () => { toggleRoutineEntry(prod, 'manha', ativosMatch.map(a => ({ nome:a.nome, mecanismo:a.mecanismo || '' }))); renderSkcProdutosEncontrados(); });
      card.querySelector('.noite-btn').addEventListener('click', () => { toggleRoutineEntry(prod, 'noite', ativosMatch.map(a => ({ nome:a.nome, mecanismo:a.mecanismo || '' }))); renderSkcProdutosEncontrados(); });
      container.appendChild(card);
    });
  }

  renderSkcAtivosDesejadosChips();

  const modalAtivoOverlay = document.getElementById('modalAtivoOverlay');
  let currentAtivoIdx = -1;

  // Produtos com o ativo: os marcados no cadastro + os que têm algum dos INCI dele na lista de ingredientes.
  function termosInciDoAtivo(a){
    if(a.buscaInci === false) return []; // ex.: glicerina, presente em quase todos os produtos
    const termos = [];
    if(a.inci) termos.push(a.inci);
    // grupos marcados com detectar:false (ex.: "Não confundir") não entram na busca
    (Array.isArray(a.inciGrupos) ? a.inciGrupos : []).filter(g => g.detectar !== false)
      .forEach(g => (g.itens || []).forEach(it => it.inci && termos.push(it.inci)));
    return [...new Set(termos.map(t => t.toLowerCase().trim()).filter(t => t.length >= 6 && !t.startsWith('(')))];
  }
  function produtosQueContemAtivo(a){
    const termos = termosInciDoAtivo(a);
    const lista = [];
    products.forEach(p => {
      const marcado = (p.ativos || []).includes(a.id);
      let pelaInci = false, baixaConc = false;
      if(!marcado && termos.length){
        const ingredientes = String(p.outrosIngredientes || '').toLowerCase();
        const lista = ingredientes.split(',').map(x => x.trim().replace(/^[^a-z0-9]+|[^a-z0-9)]+$/g, '')).filter(Boolean);
        // Compara o ingrediente inteiro (ou o início dele, ex.: "niacinamide (5%)"), e não um pedaço do texto:
        // assim "betaine" não casa com "cocamidopropyl betaine", nem "retinol" com outro nome que só contenha a palavra.
        const casa = (item, t) => item === t || (item.startsWith(t) && /^\s*[(\/*]/.test(item.slice(t.length)));
        // posição do ativo na lista (a lista vai da maior para a menor quantidade)
        const idx = lista.findIndex(item => termos.some(t => casa(item, t)));
        if(idx >= 0){
          pelaInci = true;
          baixaConc = lista.length >= 6 && (idx + 1) / lista.length > 2/3; // último terço da lista
        }
      }
      if(marcado || pelaInci) lista.push(Object.assign(Object.create(p), { __pelaInci: pelaInci, __baixaConc: baixaConc }));
    });
    // marcados primeiro, depois os encontrados pelo INCI e, por último, os de baixa concentração
    const peso = x => !x.__pelaInci ? 0 : (x.__baixaConc ? 2 : 1);
    return lista.sort((x, y) => peso(x) - peso(y));
  }

  function simNaoHTML(val){
    return val ? '<span class="ativo-badge-sim">Sim</span>' : '<span class="ativo-badge-nao">Não</span>';
  }
  // Mostra a resposta completa quando existe um texto (ex.: "Sim, em uso cosmético habitual*",
  // "Depende da matéria-prima*"); a cor segue o início do texto. Sem texto, usa o Sim/Não simples.
  function preencherSimNao(el, valorBool, texto){
    if(!texto){ el.innerHTML = simNaoHTML(valorBool); return; }
    const t = String(texto).trim();
    const cls = /^sim\b/i.test(t) ? 'ativo-badge-sim' : (/^n[ãa]o\b/i.test(t) ? 'ativo-badge-nao' : 'ativo-badge-neutro');
    el.innerHTML = `<span class="${cls}"></span>`;
    el.firstChild.textContent = t;
  }

  function openAtivoDetail(idx){
    currentAtivoIdx = idx;
    const a = ativosData[idx];
    document.getElementById('ativoDetailNome').textContent = a.nome;
    document.getElementById('ativoDetailMecanismo').textContent = a.mecanismo;
    document.getElementById('ativoDetailPh').textContent = a.ph;
    document.getElementById('ativoDetailDosagem').textContent = a.dosagem;
    document.getElementById('ativoDetailFonte').textContent = a.fonte;
    document.getElementById('ativoDetailPeriodo').textContent = a.periodo;
    preencherSimNao(document.getElementById('ativoDetailVegano'), a.vegano, a.veganoTexto);
    preencherSimNao(document.getElementById('ativoDetailOrganico'), a.organico, a.organicoTexto);
    preencherSimNao(document.getElementById('ativoDetailGestantes'), a.gestantes, a.gestantesTexto);

    // INCI, principais ativos e nota de variação (aparecem só quando cadastrados)
    document.getElementById('ativoDetailInciBloco').style.display = a.inci ? 'block' : 'none';
    document.getElementById('ativoDetailInci').textContent = a.inci || '';
    document.getElementById('ativoDetailInci').style.fontStyle = String(a.inci || '').startsWith('(') ? 'normal' : '';
    document.getElementById('ativoDetailInciNota').textContent = a.inciNota || '';
    const compostos = Array.isArray(a.compostos) ? a.compostos : [];
    document.getElementById('ativoDetailCompostosBloco').style.display = compostos.length ? 'block' : 'none';
    const compWrap = document.getElementById('ativoDetailCompostos');
    compWrap.innerHTML = '';
    compostos.forEach(c => {
      // aceita "Madecassoside (Madecassosídeo)" → nome INCI + tradução
      const m = String(c).match(/^(.*?)\s*\((.*)\)\s*$/);
      const chip = document.createElement('span');
      chip.className = 'ativo-composto';
      chip.textContent = m ? m[1] : c;
      if(m){ const sm = document.createElement('small'); sm.textContent = ' · ' + m[2]; chip.appendChild(sm); }
      compWrap.appendChild(chip);
    });
    // INCI encontrados em formulações, separados por grupo (extratos x matérias-primas x constituintes)
    const grupos = Array.isArray(a.inciGrupos) ? a.inciGrupos : [];
    const gruposEl = document.getElementById('ativoDetailInciGrupos');
    const corpoGrupos = document.getElementById('ativoDetailInciGruposCorpo');
    corpoGrupos.innerHTML = '';
    let totalInci = 0;
    grupos.forEach(g => {
      const itens = Array.isArray(g.itens) ? g.itens : [];
      if(!itens.length) return;
      totalInci += itens.length;
      const t = document.createElement('div'); t.className = 'inci-grupo-titulo' + (g.detectar === false && g.alerta !== false ? ' alerta' : ''); t.textContent = g.titulo || '';
      corpoGrupos.appendChild(t);
      if(g.descricao){ const d = document.createElement('div'); d.className = 'inci-grupo-desc'; d.textContent = g.descricao; corpoGrupos.appendChild(d); }
      const tab = document.createElement('table'); tab.className = 'inci-tabela';
      itens.forEach(it => {
        const tr = document.createElement('tr');
        const c1 = document.createElement('td'); c1.textContent = it.inci || '';
        const c2 = document.createElement('td'); c2.textContent = it.significado || '';
        tr.appendChild(c1); tr.appendChild(c2); tab.appendChild(tr);
      });
      corpoGrupos.appendChild(tab);
    });
    gruposEl.style.display = totalInci ? 'block' : 'none';
    gruposEl.open = false;
    document.getElementById('ativoDetailInciGruposQtd').textContent = totalInci ? `(${totalInci})` : '';

    const notaEl = document.getElementById('ativoDetailNota');
    notaEl.style.display = a.nota ? 'block' : 'none';
    notaEl.textContent = a.nota || '';
    document.getElementById('ativoDetailClasse').innerHTML = classeTagsHTML(a.classe);
    document.getElementById('ativoDetailIncompatibilidade').textContent = a.incompatibilidade;
    document.getElementById('ativoDetailAnotacao').value = a.anotacao || '';

    const produtosContainer = document.getElementById('ativoProdutosContainer');
    produtosContainer.innerHTML = '';
    const produtosComEsteAtivo = produtosQueContemAtivo(a);
    document.getElementById('ativoProdutosQtd').textContent = produtosComEsteAtivo.length ? `(${produtosComEsteAtivo.length})` : '';
    if(produtosComEsteAtivo.length === 0){
      produtosContainer.innerHTML = '<div class="routine-empty" style="padding:14px 0;">Nenhum produto do catálogo cadastrado com este ativo ainda.</div>';
    } else {
      // Faixa horizontal de cartões com foto, nome e marca (em vez de uma lista vertical longa)
      const wrap = document.createElement('div');
      wrap.className = 'pca-carrossel-wrap';
      const faixa = document.createElement('div');
      faixa.className = 'pca-carrossel';
      const iconeFrasco = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg>';
      produtosComEsteAtivo.forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pca-card';
        card.title = `${p.name} — ${p.brand || ''}`;
        card.innerHTML = `
          <div class="pca-card-foto">${p.image ? '<img alt="" loading="lazy">' : iconeFrasco}</div>
          <div class="pca-card-nome"></div>
          <div class="pca-card-marca"></div>`;
        if(p.image){ const img = card.querySelector('img'); img.src = p.image; img.alt = p.name; }
        card.querySelector('.pca-card-nome').textContent = p.name;
        if(p.__pelaInci){
          const origem = document.createElement('span');
          origem.className = 'pca-card-origem';
          origem.textContent = p.__baixaConc ? 'No INCI · baixa concentração' : 'Encontrado pelo INCI';
          origem.title = p.__baixaConc
            ? 'O ativo aparece no último terço da lista de ingredientes, o que indica uma quantidade pequena no produto.'
            : 'Este produto não estava marcado com o ativo, mas a lista de ingredientes contém um dos INCI dele.';
          if(p.__baixaConc){ origem.style.background = 'var(--gray-pill-bg)'; origem.style.color = 'var(--gray-pill-text)'; }
          card.insertBefore(origem, card.querySelector('.pca-card-nome'));
        }
        card.querySelector('.pca-card-marca').textContent = p.brand || '';
        card.addEventListener('click', () => {
          modalAtivoOverlay.classList.remove('open');
          openProduto(p.id);
        });
        faixa.appendChild(card);
      });
      const setaEsq = document.createElement('button');
      setaEsq.type = 'button'; setaEsq.className = 'pca-seta esq'; setaEsq.setAttribute('aria-label', 'Ver produtos anteriores');
      setaEsq.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg>';
      const setaDir = document.createElement('button');
      setaDir.type = 'button'; setaDir.className = 'pca-seta dir'; setaDir.setAttribute('aria-label', 'Ver mais produtos');
      setaDir.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6"/></svg>';
      const passo = () => Math.max(faixa.clientWidth * 0.8, 160);
      setaEsq.addEventListener('click', () => faixa.scrollBy({ left: -passo() }));
      setaDir.addEventListener('click', () => faixa.scrollBy({ left: passo() }));
      const atualizarSetas = () => {
        setaEsq.hidden = faixa.scrollLeft <= 4;
        setaDir.hidden = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 4;
      };
      faixa.addEventListener('scroll', atualizarSetas, { passive:true });
      // rolar com a roda do mouse também anda para os lados
      faixa.addEventListener('wheel', (e) => {
        if(Math.abs(e.deltaY) > Math.abs(e.deltaX) && faixa.scrollWidth > faixa.clientWidth){
          const noInicio = faixa.scrollLeft <= 0 && e.deltaY < 0;
          const noFim = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 1 && e.deltaY > 0;
          if(!noInicio && !noFim){ e.preventDefault(); faixa.scrollLeft += e.deltaY; }
        }
      }, { passive:false });
      wrap.appendChild(setaEsq); wrap.appendChild(faixa); wrap.appendChild(setaDir);
      produtosContainer.appendChild(wrap);
      requestAnimationFrame(atualizarSetas);
    }

    modalAtivoOverlay.classList.add('open');
  }

  document.getElementById('modalAtivoClose').addEventListener('click', () => modalAtivoOverlay.classList.remove('open'));
  modalAtivoOverlay.addEventListener('click', (e) => { if(e.target === modalAtivoOverlay) modalAtivoOverlay.classList.remove('open'); });
  document.getElementById('modalAtivoSalvarAnotacao').addEventListener('click', async () => {
    if(currentAtivoIdx >= 0){
      const ativo = ativosData[currentAtivoIdx];
      ativo.anotacao = document.getElementById('ativoDetailAnotacao').value;
      // Fica nas configurações DA SUA conta (tabela configuracoes_profissional, protegida por RLS):
      // nunca no ativo, que é compartilhado com todas as profissionais.
      const ok = await salvarConfig('ativos_anotacoes', anotacoesAtivosParaSalvar());
      if(ok) showToast(modoDemonstracao ? 'Anotação guardada só nesta tela (modo demonstração).' : 'Anotação salva — só você vê.');
      else return; // salvarConfig já avisou o motivo (sessão expirada ou banco)
    }
    modalAtivoOverlay.classList.remove('open');
  });
