/* Skin Expert Pro — Meu Negócio: serviços, pacotes, categorias e horários de atendimento.
   Arquivo 11 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= EQUIPE MODULE ================= */
  document.querySelectorAll('#view-equipe .fin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if(tab.dataset.eqsoon){ showToast('Esta funcionalidade estará disponível em breve'); return; }
      document.querySelectorAll('#view-equipe .fin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('#view-equipe .fin-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('eqpanel-' + tab.dataset.eqtab);
      if(panel) panel.classList.add('active');
      else document.getElementById('eqpanel-placeholder').classList.add('active');
    });
  });

  /* ---------- Profissionais ---------- */
  const profissionaisData = [
    { nome:'—', perfil:'Administrador', categoria:'Estética', descricao:'—', ativado:true, principal:true },
  ];

  function renderProfissionais(){
    const body = document.getElementById('profissionaisBody');
    body.innerHTML = '';
    profissionaisData.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${p.nome}</td>
        <td><span class="access-profile-chip">${p.perfil}</span></td>
        <td>${p.categoria || '—'}</td>
        <td>${p.descricao || '—'}</td>
        <td>${p.ativado ? '<span class="status-active">Ativo</span>' : '<span class="pill pill-gray">Inativo</span>'}</td>
      `;
      body.appendChild(tr);
    });
  }
  renderProfissionais();

  // A primeira linha da lista de Profissionais representa quem está logada — atualiza
  // com o nome/título reais assim que Meus Dados Profissionais é carregado (real ou demo).
  function atualizarProfissionalPrincipal(){
    const principal = profissionaisData.find(p => p.principal);
    if(!principal) return;
    principal.nome = perfilProfissional.nome || '—';
    principal.descricao = perfilProfissional.titulo || '—';
    renderProfissionais();
  }

  const modalProfissionalOverlay = document.getElementById('modalProfissionalOverlay');
  document.getElementById('btnNovoProfissional').addEventListener('click', () => {
    document.getElementById('profNome').value = '';
    document.getElementById('profCelular').value = '';
    document.getElementById('profEmail').value = '';
    document.getElementById('profPerfil').value = 'Administrador';
    document.getElementById('profCategoria').value = '';
    document.getElementById('profAtivado').checked = true;
    modalProfissionalOverlay.classList.add('open');
  });
  document.getElementById('modalProfissionalCancel').addEventListener('click', () => modalProfissionalOverlay.classList.remove('open'));
  modalProfissionalOverlay.addEventListener('click', (e) => { if(e.target === modalProfissionalOverlay) modalProfissionalOverlay.classList.remove('open'); });
  document.getElementById('modalProfissionalConfirm').addEventListener('click', () => {
    const nome = document.getElementById('profNome').value.trim();
    if(!nome){ showToast('Informe o nome do profissional'); return; }
    profissionaisData.push({
      nome,
      perfil: document.getElementById('profPerfil').value,
      categoria: document.getElementById('profCategoria').value.trim(),
      descricao: '—',
      ativado: document.getElementById('profAtivado').checked,
    });
    renderProfissionais();
    modalProfissionalOverlay.classList.remove('open');
    showToast('Profissional adicionado com sucesso!');
    salvarConfig('profissionais', profissionaisData);
  });

  /* ---------- Serviços ---------- */
  const moedaSimbolos = { BRL: 'R$', USD: '$', EUR: '€' };
  function formatServicoPreco(preco, moeda){
    return `${moedaSimbolos[moeda] || 'R$'} ${Number(preco).toFixed(2).replace('.', ',')}`;
  }

  let servicosData = [
    { nome:'Limpeza de Pele Profunda', categoria:'Estética', preco:150.00, moeda:'BRL', duracao:'1h' },
    { nome:'Drenagem Linfática', categoria:'Estética', preco:120.00, moeda:'BRL', duracao:'45 min' },
    { nome:'Massagem Relaxante', categoria:'Estética', preco:130.00, moeda:'BRL', duracao:'1h' },
    { nome:'Peeling de Diamante', categoria:'Estética', preco:180.00, moeda:'BRL', duracao:'45 min' },
  ];
  let editingServicoIndex = -1;

  /* ---------- Serviços desativados ----------
     Em vez de excluir, o serviço é DESATIVADO: some das listas para agendamentos, comandas e pacotes
     novos, mas tudo o que já existe (atendimentos, comandas, pacotes) continua igual. Pode reativar. */
  let servicosInativos = new Set(); // ids salvos em configuracoes_profissional, chave 'servicos_inativos'
  function chaveServico(s){ return s && s.id ? String(s.id) : 'nome:' + ((s && s.nome) || ''); }
  function servicoAtivo(s){ return !servicosInativos.has(chaveServico(s)); }
  function servicosAtivos(){ return servicosData.filter(servicoAtivo); }

  async function alternarServicoAtivo(s){
    const chave = chaveServico(s);
    const desativar = servicoAtivo(s);
    if(desativar && !confirm(`Desativar o serviço "${s.nome}"?\n\nEle deixa de aparecer para novos agendamentos, comandas e pacotes. Atendimentos, comandas e pacotes que já existem continuam iguais.\n\nVocê pode reativar quando quiser.`)) return;
    if(!modoDemonstracao && !(await usuarioParaSalvar())) return; // sessão caiu: não muda só na tela
    if(desativar) servicosInativos.add(chave); else servicosInativos.delete(chave);
    if(!modoDemonstracao) await salvarConfig('servicos_inativos', [...servicosInativos]);
    renderServicos();
    showToast(desativar ? `Serviço "${s.nome}" desativado.` : `Serviço "${s.nome}" reativado.`);
  }

  async function loadServicos(){
    const { data: userData } = await supabaseClient.auth.getUser();
    if(!userData || !userData.user) return; // segue com o seed local (modo demonstração)
    const { data, error } = await supabaseClient
      .from('servicos')
      .select('*')
      .eq('profissional_id', userData.user.id)
      .order('created_at', { ascending: true });
    if(error) return;
    try{
      const inativos = await lerConfig('servicos_inativos');
      if(Array.isArray(inativos)) servicosInativos = new Set(inativos.map(String));
    }catch(e){}
    if(data && data.length > 0){
      servicosData = data.map(s => ({ id: s.id, nome: s.nome, categoria: s.categoria, moeda: s.moeda, preco: parseFloat(s.preco), duracao: s.duracao }));
    }
    renderServicos();
  }

  function renderServicos(){
    const body = document.getElementById('servicosBody');
    body.innerHTML = '';
    garantirCategoriasDosServicos();
    atualizarFiltroCategoriaServicos();
    const busca = semAcento(document.getElementById('servicosBusca').value.trim());
    const cat = document.getElementById('servicosFiltroCategoria').value;
    const lista = servicosData.filter(s =>
      (!busca || semAcento(s.nome).includes(busca)) &&
      (!cat || semAcento(s.categoria) === semAcento(cat)));
    try{ renderPacotes(); }catch(e){} // preço dos pacotes acompanha o dos serviços
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="5" class="fin-vazio">${servicosData.length ? 'Nenhum serviço com esses filtros.' : 'Nenhum serviço cadastrado. Use "Novo Serviço".'}</td></tr>`;
      return;
    }
    lista.sort((a, b) => (servicoAtivo(a) ? 0 : 1) - (servicoAtivo(b) ? 0 : 1)); // desativados por último
    lista.forEach(s => {
      const idx = servicosData.indexOf(s);
      const ativo = servicoAtivo(s);
      const tr = document.createElement('tr');
      if(!ativo) tr.className = 'servico-inativo';
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(s.nome)}${ativo ? '' : ' <span class="pill-desativado">Desativado</span>'}</td>
        <td><span class="category-chip">${escHTML(s.categoria || 'Geral')}</span></td>
        <td>${formatServicoPreco(s.preco, s.moeda)}</td>
        <td>${escHTML(s.duracao || '—')}</td>
        <td><div class="fin-acoes" style="justify-content:flex-start;">
          <button class="icon-btn" title="Editar" data-edit-servico="${idx}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
          </button>
          <button class="icon-btn servico-ativar-btn" type="button" data-ativar-servico="${idx}" title="${ativo ? 'Desativar serviço' : 'Reativar serviço'}" aria-label="${ativo ? 'Desativar' : 'Reativar'} serviço ${escHTML(s.nome)}">${ativo ? ICONE_DESATIVAR : ICONE_REATIVAR}</button>
        </div></td>
      `;
      tr.querySelector('[data-edit-servico]').addEventListener('click', () => openServicoModal(idx));
      tr.querySelector('[data-ativar-servico]').addEventListener('click', (e) => { e.stopPropagation(); alternarServicoAtivo(s); });
      body.appendChild(tr);
    });
  }
  document.getElementById('servicosBusca').addEventListener('input', renderServicos);
  document.getElementById('servicosFiltroCategoria').addEventListener('change', renderServicos);
  // (renderServicos inicial roda depois que as categorias existem — ver abaixo)
  // (loadServicos roda no enterApp, depois do login — aqui só duplicava o carregamento)

  const modalServicoOverlay = document.getElementById('modalServicoOverlay');
  const modalServicoTitleEl = document.getElementById('modalServicoTitle');

  const seletorDuracaoServico = criarSeletorDuracao('servDurPicker', 'servDuracao', 'texto');
  seletorDuracaoServico.definir(60);

  function openServicoModal(idx){
    editingServicoIndex = idx;
    if(idx >= 0){
      const s = servicosData[idx];
      modalServicoTitleEl.textContent = 'Editar Serviço';
      document.getElementById('servNome').value = s.nome;
      preencherSelectCategoriaServico(s.categoria);
      // A moeda segue o país de atuação definido em Configurações.
      const moedaPadrao = moedaPreferidaAtual();
      document.getElementById('servMoeda').value = moedaPadrao;
      const avisoMoeda = document.getElementById('servMoedaAviso');
      if(s.moeda && s.moeda !== moedaPadrao){
        avisoMoeda.textContent = `Este serviço estava em ${moedaSimbolos[s.moeda] || s.moeda}. Ao salvar, ele passa para ${moedaSimbolos[moedaPadrao]} (a moeda das suas Configurações) — confira o preço.`;
        avisoMoeda.style.display = 'block';
      } else {
        avisoMoeda.style.display = 'none';
      }
      document.getElementById('servPreco').value = String(s.preco).replace('.', ',');
      seletorDuracaoServico.definir(duracaoServicoParaMinutos(s.duracao) || 60);
    } else {
      modalServicoTitleEl.textContent = 'Novo Serviço';
      document.getElementById('servNome').value = '';
      preencherSelectCategoriaServico(document.getElementById('servicosFiltroCategoria').value || '');
      document.getElementById('servMoeda').value = moedaPreferidaAtual();
      document.getElementById('servMoedaAviso').style.display = 'none';
      document.getElementById('servPreco').value = '';
      seletorDuracaoServico.definir(60);
    }
    modalServicoOverlay.classList.add('open');
  }

  document.getElementById('btnNovoServico').addEventListener('click', () => openServicoModal(-1));
  document.getElementById('modalServicoCancel').addEventListener('click', () => modalServicoOverlay.classList.remove('open'));
  modalServicoOverlay.addEventListener('click', (e) => { if(e.target === modalServicoOverlay) modalServicoOverlay.classList.remove('open'); });
  document.getElementById('modalServicoConfirm').addEventListener('click', async () => {
    const nome = document.getElementById('servNome').value.trim();
    if(!nome){ showToast('Informe o nome do serviço'); return; }
    const precoRaw = document.getElementById('servPreco').value.replace(/[^\d,]/g,'').replace(',','.');
    const dadosServico = {
      nome,
      categoria: (document.getElementById('servCategoria').value || '').trim() || 'Geral',
      moeda: document.getElementById('servMoeda').value,
      preco: parseFloat(precoRaw) || 0,
      duracao: document.getElementById('servDuracao').value,
    };

    const usuarioReal = await usuarioParaSalvar();
    if(!usuarioReal && !modoDemonstracao) return; // sessão caiu: não salva só na tela

    if(editingServicoIndex >= 0){
      const existente = servicosData[editingServicoIndex];
      if(usuarioReal && existente.id){
        const { error } = await supabaseClient.from('servicos').update(dadosServico).eq('id', existente.id);
        if(error){ showToast('Erro ao salvar: ' + error.message); return; }
        dadosServico.id = existente.id;
      }
      servicosData[editingServicoIndex] = dadosServico;
      showToast('Serviço atualizado com sucesso!');
    } else {
      if(usuarioReal){
        const payload = { ...dadosServico, profissional_id: usuarioReal.id };
        const { data, error } = await supabaseClient.from('servicos').insert(payload).select().single();
        if(error){ showToast('Erro ao salvar: ' + error.message); return; }
        dadosServico.id = data.id;
      }
      servicosData.push(dadosServico);
      showToast('Serviço adicionado com sucesso!');
    }
    renderServicos();
    renderCategorias(); // atualiza a contagem de serviços por categoria
    modalServicoOverlay.classList.remove('open');
  });

  const ICONE_DESATIVAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>';
  const ICONE_REATIVAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 102.1-9.4L1 10"/></svg>';

  /* ---------- Categorias ---------- */
  const categoriasData = [
    { nome:'Estética', tipo:'Serviço', profissionais:'', ativado:true },
    { nome:'Produtos de Revenda', tipo:'Produto', profissionais:'', ativado:true },
  ];
  const mesmaCategoria = (a, b) => semAcento(String(a || '').trim()) === semAcento(String(b || '').trim());
  function servicosDaCategoria(nome){ return servicosData.filter(s => mesmaCategoria(s.categoria, nome)); }

  // Categoria usada por algum serviço mas que não está na lista (ex.: criada antes) entra sozinha.
  function garantirCategoriasDosServicos(){
    servicosData.forEach(s => {
      const nome = String(s.categoria || '').trim();
      if(nome && !categoriasData.some(c => mesmaCategoria(c.nome, nome))){
        categoriasData.push({ nome, tipo: 'Serviço', profissionais: '', ativado: true });
      }
    });
  }
  function atualizarFiltroCategoriaServicos(){
    const sel = document.getElementById('servicosFiltroCategoria');
    const atual = sel.value;
    const nomes = categoriasData.filter(c => c.tipo !== 'Produto').map(c => c.nome).sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Categoria: Todas</option>' + nomes.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('');
    sel.value = nomes.some(n => n === atual) ? atual : '';
  }
  function preencherSelectCategoriaServico(atual){
    garantirCategoriasDosServicos();
    const sel = document.getElementById('servCategoria');
    const ativas = categoriasData.filter(c => c.tipo !== 'Produto' && (c.ativado || mesmaCategoria(c.nome, atual))).map(c => c.nome);
    if(atual && !ativas.some(n => mesmaCategoria(n, atual))) ativas.push(atual);
    ativas.sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Selecione a categoria</option>' +
      ativas.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('') +
      '<option value="__nova__">+ Nova categoria…</option>';
    const achada = ativas.find(n => mesmaCategoria(n, atual));
    sel.value = achada || '';
    sel.dataset.anterior = sel.value;
  }
  document.getElementById('servCategoria').addEventListener('change', (e) => {
    const sel = e.target;
    if(sel.value !== '__nova__'){ sel.dataset.anterior = sel.value; return; }
    const nome = (prompt('Nome da nova categoria:') || '').trim();
    if(!nome){ sel.value = sel.dataset.anterior || ''; return; }
    const existente = categoriasData.find(c => mesmaCategoria(c.nome, nome));
    if(existente){ existente.ativado = true; }
    else { categoriasData.push({ nome, tipo: 'Serviço', profissionais: '', ativado: true }); }
    salvarConfig('categorias', categoriasData);
    renderCategorias();
    preencherSelectCategoriaServico(existente ? existente.nome : nome);
    showToast(existente ? `A categoria "${existente.nome}" já existia e foi selecionada.` : `Categoria "${nome}" criada.`);
  });

  function renderCategorias(){
    const body = document.getElementById('categoriasBody');
    body.innerHTML = '';
    garantirCategoriasDosServicos();
    const busca = semAcento(document.getElementById('categoriasBusca').value.trim());
    const lista = categoriasData.filter(c => !busca || semAcento(c.nome).includes(busca));
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="5" class="fin-vazio">${categoriasData.length ? 'Nenhuma categoria com esse nome.' : 'Nenhuma categoria. Use "Nova Categoria".'}</td></tr>`;
      return;
    }
    lista.forEach(c => {
      const qtd = c.tipo === 'Produto' ? null : servicosDaCategoria(c.nome).length;
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(c.nome)}</td>
        <td><span class="category-chip">${escHTML(c.tipo)}</span></td>
        <td>${qtd == null ? '—' : qtd + (qtd === 1 ? ' serviço' : ' serviços')}</td>
        <td>${c.ativado ? '<span class="status-active">Ativa</span>' : '<span class="pill pill-gray">Inativa</span>'}</td>
        <td><div class="fin-acoes">
          <button type="button" class="fin-btn-mini">${c.ativado ? 'Desativar' : 'Ativar'}</button>
        </div></td>
      `;
      // Categorias não são excluídas, só desativadas (para não mexer em serviços e comandas que já existem)
      const [bAtivar] = tr.querySelectorAll('button');
      bAtivar.addEventListener('click', (e) => {
        e.stopPropagation();
        c.ativado = !c.ativado;
        salvarConfig('categorias', categoriasData);
        renderCategorias();
        showToast(c.ativado ? `Categoria "${c.nome}" ativada.` : `Categoria "${c.nome}" desativada — ela some do cadastro de serviços, mas os serviços dela continuam.`);
      });
      tr.addEventListener('click', () => abrirCategoria(c));
      body.appendChild(tr);
    });
  }
  document.getElementById('categoriasBusca').addEventListener('input', renderCategorias);

  // Troca a categoria de vários serviços de uma vez (no banco e na tela).
  async function trocarCategoriaDosServicos(de, para){
    const afetados = servicosDaCategoria(de);
    if(!afetados.length) return true;
    if(!modoDemonstracao){
      const user = await usuarioParaSalvar();
      if(!user) return false;
      for(const sv of afetados){
        if(!sv.id) continue;
        const { error } = await supabaseClient.from('servicos').update({ categoria: para }).eq('id', sv.id);
        if(error){ showToast('Não foi possível atualizar o serviço "' + sv.nome + '": ' + error.message); return false; }
      }
    }
    afetados.forEach(sv => { sv.categoria = para; });
    return true;
  }

  const modalCategoriaOverlay = document.getElementById('modalCategoriaOverlay');
  let categoriaEditando = null;
  function abrirCategoria(c){
    categoriaEditando = c || null;
    document.getElementById('modalCategoriaTitle').textContent = c ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('catNome').value = c ? c.nome : '';
    document.getElementById('catTipo').value = c ? c.tipo : 'Serviço';
    document.getElementById('catProfissionais').value = c ? (c.profissionais || '') : '';
    document.getElementById('catAtivado').checked = c ? !!c.ativado : true;
    modalCategoriaOverlay.classList.add('open');
    setTimeout(() => { if(!modalCategoriaOverlay.contains(document.activeElement)) document.getElementById('catNome').focus(); }, 50);
  }
  function fecharCategoria(){ modalCategoriaOverlay.classList.remove('open'); categoriaEditando = null; }
  document.getElementById('btnNovaCategoria').addEventListener('click', () => abrirCategoria(null));
  document.getElementById('modalCategoriaCancel').addEventListener('click', fecharCategoria);
  modalCategoriaOverlay.addEventListener('click', (e) => { if(e.target === modalCategoriaOverlay) fecharCategoria(); });
  document.getElementById('catNome').addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('modalCategoriaConfirm').click(); });
  document.getElementById('modalCategoriaConfirm').addEventListener('click', async () => {
    const nome = document.getElementById('catNome').value.trim();
    if(!nome){ showToast('Informe o nome da categoria'); return; }
    const duplicada = categoriasData.find(c => c !== categoriaEditando && mesmaCategoria(c.nome, nome));
    if(duplicada){ showToast(`Já existe a categoria "${duplicada.nome}".`); return; }
    const dados = {
      nome,
      tipo: document.getElementById('catTipo').value,
      profissionais: document.getElementById('catProfissionais').value.trim(),
      ativado: document.getElementById('catAtivado').checked,
    };
    const btn = document.getElementById('modalCategoriaConfirm');
    btn.disabled = true;
    try{
      if(categoriaEditando){
        const antigo = categoriaEditando.nome;
        // renomeou: os serviços desta categoria acompanham
        if(!mesmaCategoria(antigo, nome) || antigo !== nome){
          if(!await trocarCategoriaDosServicos(antigo, nome)) return;
        }
        Object.assign(categoriaEditando, dados);
        showToast('Categoria atualizada!');
      } else {
        categoriasData.push(dados);
        showToast('Categoria criada com sucesso!');
      }
    } finally { btn.disabled = false; }
    salvarConfig('categorias', categoriasData);
    fecharCategoria();
    renderCategorias();
    renderServicos();
  });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalCategoriaOverlay.classList.contains('open')) fecharCategoria(); });

  renderCategorias();
  renderServicos();

  /* ---------- Pacotes ---------- */
  // { nome, servicos:[{nome, qtd}], subtotal, desconto:{tipo:'percent'|'valor', valor}|null, valor (preço final) }
  const pacotesData = [];

  function precoServicoPorNome(nome){
    const sv = servicosData.find(x => x.nome === nome);
    return sv ? (Number(sv.preco) || 0) : 0;
  }
  // Recalcula a partir dos serviços (se o preço de um serviço mudar, o pacote acompanha)
  function recalcularPacote(p){
    const temPrecos = (p.servicos || []).some(sv => servicosData.some(x => x.nome === sv.nome));
    if(temPrecos) p.subtotal = arred((p.servicos || []).reduce((t, sv) => t + precoServicoPorNome(sv.nome) * (parseInt(sv.qtd, 10) || 1), 0));
    else if(p.subtotal == null) p.subtotal = Number(p.valor) || 0; // pacote antigo sem os serviços cadastrados
    p.descontoAplicado = calcularDesconto(p.subtotal, p.desconto);
    p.valor = arred(p.subtotal - p.descontoAplicado);
    return p;
  }

  function renderPacotes(){
    const body = document.getElementById('pacotesBody');
    body.innerHTML = '';
    if(pacotesData.length === 0){
      body.innerHTML = `<tr><td colspan="4"><div class="empty-state">Nenhum pacote criado ainda.</div></td></tr>`;
      return;
    }
    const busca = semAcento((document.getElementById('pacotesBusca') || {}).value || '').trim();
    let mostrados = 0;
    pacotesData.forEach((p, idx) => {
      recalcularPacote(p);
      if(busca && !semAcento(p.nome + ' ' + (p.servicos || []).map(sv => sv.nome).join(' ')).includes(busca)) return;
      mostrados++;
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      tr.style.cursor = 'pointer';
      const servs = (p.servicos || []).map(sv => `${(parseInt(sv.qtd, 10) || 1) > 1 ? sv.qtd + '× ' : ''}${escHTML(sv.nome)}`).join(', ');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(p.nome)}</td>
        <td>${servs || '—'}</td>
        <td style="white-space:nowrap;">${p.descontoAplicado > 0 ? `<span class="valor-riscado">${formatPrice(p.subtotal)}</span>` : ''}<strong>${formatPrice(p.valor)}</strong>${p.descontoAplicado > 0 ? `<span class="desconto-tag">–${textoDesconto(p.desconto)}</span>` : ''}</td>
        <td><div class="fin-acoes">
          <button class="icon-btn" type="button" title="Editar" aria-label="Editar pacote ${escHTML(p.nome)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="comanda-apagar" type="button" title="Apagar pacote" aria-label="Apagar pacote ${escHTML(p.nome)}">${ICONE_LIXEIRA}</button>
        </div></td>
      `;
      const [bEditar, bApagar] = tr.querySelectorAll('button');
      bEditar.addEventListener('click', (e) => { e.stopPropagation(); abrirPacote(idx); });
      bApagar.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!confirm(`Apagar o pacote "${p.nome}"?`)) return;
        pacotesData.splice(idx, 1);
        salvarConfig('pacotes', pacotesData);
        renderPacotes();
        showToast('Pacote apagado.');
      });
      tr.addEventListener('click', () => abrirPacote(idx));
      body.appendChild(tr);
    });
    if(!mostrados) body.innerHTML = `<tr><td colspan="4" class="fin-vazio">Nenhum pacote com esse nome.</td></tr>`;
  }
  document.getElementById('pacotesBusca').addEventListener('input', renderPacotes);

  const modalPacoteOverlay = document.getElementById('modalPacoteOverlay');
  const pacoteServicosContainer = document.getElementById('pacoteServicosContainer');
  let editingPacoteIndex = -1;

  function addPacoteServicoRow(nomeInicial, qtdInicial){
    const row = document.createElement('div');
    row.className = 'pacote-row';
    const nomes = servicosAtivos().map(x => x.nome);
    if(nomeInicial && !nomes.includes(nomeInicial)) nomes.push(nomeInicial); // serviço desativado ou que saiu do cadastro
    const options = nomes.map(n => `<option value="${escHTML(n)}" data-preco="${precoServicoPorNome(n)}">${escHTML(n)}</option>`).join('');
    row.innerHTML = `
      <select class="ps-servico"><option value="">Selecione o Serviço</option>${options}</select>
      <input type="text" class="ps-valor" placeholder="0,00" readonly aria-label="Preço unitário">
      <input type="number" class="ps-qtd" value="1" min="1" aria-label="Quantidade">
      <input type="text" class="ps-total" placeholder="0,00" readonly aria-label="Total do serviço">
      <button class="icon-btn trash" type="button" title="Remover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    `;
    function recalcRow(){
      const sel = row.querySelector('.ps-servico');
      const preco = parseFloat(sel.selectedOptions[0]?.dataset.preco || 0);
      const qtd = parseInt(row.querySelector('.ps-qtd').value, 10) || 1;
      row.querySelector('.ps-valor').value = formatPrice(preco);
      row.querySelector('.ps-total').value = formatPrice(preco * qtd);
      recalcPacoteTotal();
    }
    row.querySelector('.ps-servico').addEventListener('change', recalcRow);
    row.querySelector('.ps-qtd').addEventListener('input', recalcRow);
    row.querySelector('.icon-btn.trash').addEventListener('click', () => { row.remove(); recalcPacoteTotal(); });
    pacoteServicosContainer.appendChild(row);
    if(nomeInicial){ row.querySelector('.ps-servico').value = nomeInicial; row.querySelector('.ps-qtd').value = qtdInicial || 1; }
    recalcRow();
  }

  function descontoDoFormularioPacote(){
    const tipo = document.getElementById('pacoteDescontoTipo').value;
    const valor = lerValor(document.getElementById('pacoteDescontoValor').value);
    return tipo && valor > 0 ? { tipo, valor } : null;
  }
  function subtotalDoFormularioPacote(){
    let total = 0;
    pacoteServicosContainer.querySelectorAll('.pacote-row').forEach(row => {
      const sel = row.querySelector('.ps-servico');
      const preco = parseFloat(sel.selectedOptions[0]?.dataset.preco || 0);
      const qtd = parseInt(row.querySelector('.ps-qtd').value, 10) || 1;
      if(sel.value) total += preco * qtd;
    });
    return arred(total);
  }
  function recalcPacoteTotal(){
    const subtotal = subtotalDoFormularioPacote();
    const desc = descontoDoFormularioPacote();
    const aplicado = calcularDesconto(subtotal, desc);
    document.getElementById('pacoteResumo').innerHTML = aplicado > 0
      ? `Subtotal ${formatPrice(subtotal)} · Desconto <strong>– ${formatPrice(aplicado)}</strong>${desc.tipo === 'percent' ? ` (${textoDesconto(desc)})` : ''}` : '';
    document.getElementById('pacoteTotalValue').textContent = formatPrice(subtotal - aplicado);
  }
  document.getElementById('pacoteDescontoTipo').addEventListener('change', (e) => {
    const inp = document.getElementById('pacoteDescontoValor');
    inp.disabled = !e.target.value;
    if(!e.target.value) inp.value = ''; else inp.focus();
    recalcPacoteTotal();
  });
  document.getElementById('pacoteDescontoValor').addEventListener('input', recalcPacoteTotal);

  function abrirPacote(idx){
    editingPacoteIndex = idx;
    const p = idx >= 0 ? pacotesData[idx] : null;
    document.getElementById('modalPacoteTitle').textContent = p ? 'Editar Pacote' : 'Criar Novo Pacote';
    document.getElementById('pacoteNome').value = p ? p.nome : '';
    pacoteServicosContainer.innerHTML = '';
    if(p && (p.servicos || []).length) p.servicos.forEach(sv => addPacoteServicoRow(sv.nome, sv.qtd));
    else addPacoteServicoRow();
    const d = p && p.desconto && p.desconto.valor > 0 ? p.desconto : null;
    document.getElementById('pacoteDescontoTipo').value = d ? d.tipo : '';
    document.getElementById('pacoteDescontoValor').value = d ? String(d.valor).replace('.', ',') : '';
    document.getElementById('pacoteDescontoValor').disabled = !d;
    recalcPacoteTotal();
    modalPacoteOverlay.classList.add('open');
  }
  function fecharPacote(){ modalPacoteOverlay.classList.remove('open'); editingPacoteIndex = -1; }

  document.getElementById('btnAddPacoteServico').addEventListener('click', () => addPacoteServicoRow());
  document.getElementById('btnNovoPacote').addEventListener('click', () => abrirPacote(-1));
  document.getElementById('modalPacoteCancel').addEventListener('click', fecharPacote);
  modalPacoteOverlay.addEventListener('click', (e) => { if(e.target === modalPacoteOverlay) fecharPacote(); });
  document.getElementById('modalPacoteConfirm').addEventListener('click', () => {
    const nome = document.getElementById('pacoteNome').value.trim();
    if(!nome){ showToast('Informe o nome do pacote'); return; }
    const duplicado = pacotesData.find((x, i) => i !== editingPacoteIndex && semAcento(x.nome) === semAcento(nome));
    if(duplicado){ showToast(`Já existe um pacote chamado "${duplicado.nome}".`); return; }
    const servicosEscolhidos = [];
    pacoteServicosContainer.querySelectorAll('.pacote-row').forEach(row => {
      const sel = row.querySelector('.ps-servico');
      if(!sel.value) return;
      const qtd = parseInt(row.querySelector('.ps-qtd').value, 10) || 1;
      const ja = servicosEscolhidos.find(x => x.nome === sel.value);
      if(ja) ja.qtd += qtd; else servicosEscolhidos.push({ nome: sel.value, qtd });
    });
    if(servicosEscolhidos.length === 0){ showToast('Adicione pelo menos um serviço ao pacote'); return; }
    const desconto = descontoDoFormularioPacote();
    const subtotal = subtotalDoFormularioPacote();
    if(desconto && desconto.tipo === 'percent' && desconto.valor > 100){ showToast('O desconto em porcentagem vai até 100%.'); return; }
    if(desconto && desconto.tipo === 'valor' && desconto.valor > subtotal){ showToast(`O desconto passa do valor dos serviços (${formatPrice(subtotal)}).`); return; }
    const pacote = recalcularPacote({ nome, servicos: servicosEscolhidos, subtotal, desconto });
    const editando = editingPacoteIndex >= 0;
    if(editando) pacotesData[editingPacoteIndex] = pacote; else pacotesData.push(pacote);
    salvarConfig('pacotes', pacotesData);
    renderPacotes();
    fecharPacote();
    showToast(editando ? 'Pacote atualizado!' : 'Pacote criado com sucesso!');
  });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalPacoteOverlay.classList.contains('open')) fecharPacote(); });

  renderPacotes();

  /* ---------- Expedientes ---------- */
  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const expedientesData = [
    { nome:'Horário Geral', entradas:['09:00','09:00','09:00','09:00','09:00','09:00','09:00'], intervalos:[false,false,false,false,false,false,false], saidas:['18:00','18:00','18:00','18:00','18:00','18:00','18:00'], fechados:[true,false,false,false,false,false,false] },
  ];
  let editingExpedienteIndex = -1;

  function resumoDiasExpediente(e){
    const fechados = e.fechados || [];
    if(fechados.every(f => !f)) return 'Dom-Sáb';
    if(fechados.every(f => f)) return 'Fechado todos os dias';
    return diasCurtos.filter((_, i) => !fechados[i]).join(', ');
  }

  function renderExpedientes(){
    const body = document.getElementById('expedientesBody');
    body.innerHTML = '';
    expedientesData.forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${e.nome}</td>
        <td>${resumoDiasExpediente(e)}</td>
        <td>${e.entradas[1] || '09:00'} – ${e.saidas[1] || '18:00'}</td>
        <td>
          <button class="icon-btn" title="Editar" data-edit-idx="${idx}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
          </button>
        </td>
      `;
      tr.querySelector('[data-edit-idx]').addEventListener('click', () => openExpedienteModal(idx));
      body.appendChild(tr);
    });
  }
  renderExpedientes();

  const modalExpedienteOverlay = document.getElementById('modalExpedienteOverlay');
  const modalExpedienteTitleEl = document.querySelector('#modalExpedienteOverlay h3');

  function setDiaFechado(i, fechado){
    const entradaEls = document.querySelectorAll('.eg-entrada');
    const saidaEls = document.querySelectorAll('.eg-saida');
    const intervaloEls = document.querySelectorAll('.eg-intervalo');
    entradaEls[i].disabled = fechado;
    saidaEls[i].disabled = fechado;
    intervaloEls[i].disabled = fechado;
  }

  function openExpedienteModal(idx){
    editingExpedienteIndex = idx;
    const entradaEls = document.querySelectorAll('.eg-entrada');
    const saidaEls = document.querySelectorAll('.eg-saida');
    const intervaloEls = document.querySelectorAll('.eg-intervalo');
    const fechadoEls = document.querySelectorAll('.eg-fechado');

    if(idx >= 0){
      const e = expedientesData[idx];
      modalExpedienteTitleEl.textContent = 'Editar Horário de Atendimento';
      document.getElementById('expedienteNome').value = e.nome;
      entradaEls.forEach((el, i) => el.value = e.entradas[i] || '09:00');
      saidaEls.forEach((el, i) => el.value = e.saidas[i] || '18:00');
      intervaloEls.forEach((el, i) => el.checked = !!e.intervalos[i]);
      fechadoEls.forEach((el, i) => { el.checked = !!(e.fechados && e.fechados[i]); setDiaFechado(i, el.checked); });
    } else {
      modalExpedienteTitleEl.textContent = 'Novo Horário de Atendimento';
      document.getElementById('expedienteNome').value = '';
      entradaEls.forEach(el => el.value = '09:00');
      saidaEls.forEach(el => el.value = '18:00');
      intervaloEls.forEach(el => el.checked = false);
      fechadoEls.forEach((el, i) => { el.checked = false; setDiaFechado(i, false); });
    }
    modalExpedienteOverlay.classList.add('open');
  }

  document.querySelectorAll('.eg-fechado').forEach((el, i) => {
    el.addEventListener('change', () => setDiaFechado(i, el.checked));
  });

  document.getElementById('btnNovoExpediente').addEventListener('click', () => openExpedienteModal(-1));
  document.getElementById('modalExpedienteCancel').addEventListener('click', () => modalExpedienteOverlay.classList.remove('open'));
  modalExpedienteOverlay.addEventListener('click', (e) => { if(e.target === modalExpedienteOverlay) modalExpedienteOverlay.classList.remove('open'); });
  document.getElementById('modalExpedienteConfirm').addEventListener('click', () => {
    const nome = document.getElementById('expedienteNome').value.trim();
    if(nome.length < 3 || nome.length > 20){ showToast('O nome deve ter entre 3 e 20 caracteres.'); return; }
    const entradas = Array.from(document.querySelectorAll('.eg-entrada')).map(el => el.value);
    const saidas = Array.from(document.querySelectorAll('.eg-saida')).map(el => el.value);
    const intervalos = Array.from(document.querySelectorAll('.eg-intervalo')).map(el => el.checked);
    const fechados = Array.from(document.querySelectorAll('.eg-fechado')).map(el => el.checked);

    if(editingExpedienteIndex >= 0){
      expedientesData[editingExpedienteIndex] = { nome, entradas, intervalos, saidas, fechados };
      showToast('Horário de atendimento atualizado!');
    } else {
      expedientesData.push({ nome, entradas, intervalos, saidas, fechados });
      showToast('Horário de atendimento criado!');
    }
    renderExpedientes();
    modalExpedienteOverlay.classList.remove('open');
    salvarConfig('expedientes', expedientesData);
  });
