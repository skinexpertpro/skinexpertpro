/* Skin Expert Pro — Catálogo de Produtos.
   Arquivo 5 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= CATÁLOGO DE PRODUTOS MODULE ================= */
  /* Categorias do catálogo: o cadastro às vezes usa nomes diferentes para a mesma coisa
     ("Protetor Solar" x "Filtro Solar", "Limpeza" x "Limpador"...). Tudo é convertido para o
     mesmo nome usado nos filtros da rotina, senão o produto não aparece ao filtrar. */
  function categoriaCanonica(cat){
    const t = String(cat || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if(!t) return 'Tratamento';
    if(/protetor|filtro solar|fotoprote|fps|solar|sunscreen|spf/.test(t)) return 'Protetor Solar';
    if(/demaquil|micelar|cleansing (oil|balm)|oleo de limpeza/.test(t)) return 'Demaquilante';
    if(/limp|sabonete|cleanser|espuma/.test(t)) return 'Limpador';
    if(/tonic|toner|loção tonica|essencia/.test(t)) return 'Tônico';
    if(/esfolia|peeling|scrub|exfolia/.test(t)) return 'Esfoliante';
    if(/olho|olheira|eye/.test(t)) return 'Área dos Olhos';
    if(/hidrat|moistur|creme facial/.test(t)) return 'Hidratante';
    return 'Tratamento'; // sérum, ampola, antiacne, máscara etc.
  }

  /* products: em js/dados.js */
  products.forEach(p => { p.category = categoriaCanonica(p.category); });

  function formatPrice(v){ return fmtMoeda(v); } // segue a moeda escolhida em Configurações

  const faixasPrecoBRL = ['Até R$ 50', 'R$ 50 – R$ 100', 'R$ 100 – R$ 200', 'R$ 200 – R$ 500', 'Acima de R$ 500'];
  const faixasPrecoUSD = ['Até $ 10', '$ 10 – $ 20', '$ 20 – $ 40', '$ 40 – $ 100', 'Acima de $ 100'];
  const faixasPrecoEUR = ['Até € 10', '€ 10 – € 20', '€ 20 – € 40', '€ 40 – € 90', 'Acima de € 90'];

  function faixaIndex(v){
    if(v < 50) return 0;
    if(v < 100) return 1;
    if(v < 200) return 2;
    if(v < 500) return 3;
    return 4;
  }
  function faixaDePreco(v){
    const i = faixaIndex(v);
    return `${faixasPrecoBRL[i]} · ${faixasPrecoUSD[i]} · ${faixasPrecoEUR[i]}`;
  }

  function moedaPreferidaAtual(){
    let escolhida = '';
    try{ escolhida = localStorage.getItem('skinExpertMoeda') || ''; }catch(e){}
    if(escolhida === 'BRL' || escolhida === 'EUR' || escolhida === 'USD') return escolhida;
    let pais = 'BR';
    try{ pais = localStorage.getItem('skinExpertPaisAtuacao') || 'BR'; }catch(e){}
    if(pais === 'US') return 'USD';
    if(pais === 'BR') return 'BRL';
    return 'EUR'; // PT, ES, FR, IT, DE, EU
  }
  // Deduz a moeda a partir do país escrito/selecionado no cadastro da paciente.
  const PAISES_UNIAO_EUROPEIA = [
    'alemanha', 'austria', 'áustria', 'belgica', 'bélgica', 'bulgaria', 'bulgária', 'chipre',
    'croacia', 'croácia', 'dinamarca', 'eslovaquia', 'eslováquia', 'eslovenia', 'eslovênia',
    'espanha', 'spain', 'estonia', 'estônia', 'finlandia', 'finlândia', 'franca', 'frança', 'france',
    'grecia', 'grécia', 'hungria', 'irlanda', 'ireland', 'italia', 'itália', 'italy', 'letonia', 'letônia',
    'lituania', 'lituânia', 'luxemburgo', 'malta', 'paises baixos', 'países baixos', 'holanda', 'netherlands',
    'polonia', 'polônia', 'portugal', 'republica tcheca', 'república tcheca', 'romenia', 'romênia', 'suecia', 'suécia',
    'europa', 'europe',
  ];
  function moedaPorPais(pais){
    if(!pais) return null;
    const p = pais.trim().toLowerCase();
    if(!p) return null;
    if(p.includes('brasil') || p.includes('brazil')) return 'BRL';
    if(p.includes('united states') || p.includes('estados unidos') || p === 'eua' || p === 'usa') return 'USD';
    if(PAISES_UNIAO_EUROPEIA.some(pais2 => p.includes(pais2))) return 'EUR';
    return null;
  }

  // Moeda a usar para a paciente atual: o PAÍS DE RESIDÊNCIA (aba Dados) manda.
  // Sem país no cadastro: usa a moeda da anamnese (campo "Investimento") e,
  // por último, a moeda padrão do profissional.
  function moedaAnamnesePaciente(){
    const moedaPais = currentPatient ? moedaPorPais(currentPatient.pais) : null;
    if(moedaPais) return moedaPais;
    if(currentPatient && currentPatient.moedaAnamnese) return currentPatient.moedaAnamnese;
    return moedaPreferidaAtual();
  }
  function faixasOrdenadasPorMoeda(i){
    const todas = { BRL: faixasPrecoBRL[i], USD: faixasPrecoUSD[i], EUR: faixasPrecoEUR[i] };
    const principal = moedaPreferidaAtual();
    const outras = ['BRL', 'USD', 'EUR'].filter(m => m !== principal);
    return { principal: todas[principal], secundarias: outras.map(m => todas[m]) };
  }
  function faixaDePrecoLinhas(v, apenasBrasil){
    const i = faixaIndex(v);
    if(apenasBrasil) return `${faixasPrecoBRL[i]}<br><span style="font-size:11px; color:var(--text-muted);">Venda somente no Brasil</span>`;
    const { principal, secundarias } = faixasOrdenadasPorMoeda(i);
    return `${principal}<br>${secundarias.join('<br>')}`;
  }
  function faixaDePrecoCompacta(v, apenasBrasil){
    const i = faixaIndex(v);
    if(apenasBrasil){
      return `<div class="faixa-preco-compacta">
        <div class="faixa-preco-principal">${faixasPrecoBRL[i]}</div>
        <div class="faixa-preco-secundaria">Venda somente no Brasil</div>
      </div>`;
    }
    const { principal, secundarias } = faixasOrdenadasPorMoeda(i);
    return `<div class="faixa-preco-compacta">
      <div class="faixa-preco-principal">${principal}</div>
      <div class="faixa-preco-secundaria">${secundarias.join(' · ')}</div>
    </div>`;
  }

  // Mostra apenas a faixa de preço na moeda definida na anamnese clínica da paciente
  // (sem as outras moedas), para os cards do Plano de SkinCare.
  function faixaDePrecoUnica(v, apenasBrasil){
    const i = faixaIndex(v);
    if(apenasBrasil){
      return `<div class="faixa-preco-compacta">
        <div class="faixa-preco-principal">${faixasPrecoBRL[i]}</div>
        <div class="faixa-preco-secundaria">Venda somente no Brasil</div>
      </div>`;
    }
    const todas = { BRL: faixasPrecoBRL[i], USD: faixasPrecoUSD[i], EUR: faixasPrecoEUR[i] };
    const moeda = moedaAnamnesePaciente();
    return `<div class="faixa-preco-compacta">
      <div class="faixa-preco-principal">${todas[moeda] || todas.BRL}</div>
    </div>`;
  }

  // Catálogo no mesmo formato do Dicionário de Ativos: barra A–Z + cartões por letra.
  let catalogoLetra = 'A';
  const CATALOGO_LETRAS = ['#'].concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  const escCat = (t) => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const semAcentoCat = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function letraDoProduto(nome){
    const l = String(nome || '').trim().charAt(0).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    return /^[A-Z]$/.test(l) ? l : '#';
  }

  function renderCatalogo(){
    const termoBruto = document.getElementById('catalogoSearch').value.trim();
    const termo = semAcentoCat(termoBruto);
    const termoAtivo = termo.replace(/\s+/g, '-');
    const categoryFilter = document.getElementById('catalogoCategoria').value;
    const filtered = products.filter(p => {
      const matchesSearch = !termo || semAcentoCat(p.name).includes(termo) || semAcentoCat(p.brand).includes(termo)
        || (p.ativos || []).some(a => semAcentoCat(a).includes(termoAtivo));
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((x, y) => String(x.name).localeCompare(String(y.name), 'pt-BR'));

    document.getElementById('catalogoCount').textContent = filtered.length;

    const container = document.getElementById('catalogoCards');
    const azNav = document.getElementById('catalogoAzNav');
    container.innerHTML = '';
    if(!filtered.length){
      container.innerHTML = '<div class="registro-card empty-state">Nenhum produto encontrado.</div>';
      azNav.innerHTML = '';
      return;
    }

    const grupos = {};
    filtered.forEach(p => { const l = letraDoProduto(p.name); (grupos[l] = grupos[l] || []).push(p); });
    const letrasCom = CATALOGO_LETRAS.filter(l => grupos[l]);
    const buscando = !!termo;
    if(!buscando && catalogoLetra !== 'TODAS' && !grupos[catalogoLetra]) catalogoLetra = letrasCom[0];
    const visiveis = (buscando || catalogoLetra === 'TODAS') ? letrasCom : [catalogoLetra];

    azNav.innerHTML = CATALOGO_LETRAS.map(l => {
      const tem = !!grupos[l];
      const ativa = !buscando && catalogoLetra === l;
      const rotulo = l === '#' ? 'começando com número' : 'com a letra ' + l;
      return `<button type="button" class="az-nav-letter ${tem ? '' : 'disabled'} ${ativa ? 'active' : ''}" data-letra="${l}" ${tem ? '' : 'disabled'} aria-pressed="${ativa}" title="${tem ? grupos[l].length + ' produto(s) ' + rotulo : 'Nenhum produto ' + rotulo}">${l}</button>`;
    }).join('') + `<button type="button" class="az-nav-letter todas ${!buscando && catalogoLetra === 'TODAS' ? 'active' : ''}" data-letra="TODAS" aria-pressed="${!buscando && catalogoLetra === 'TODAS'}">Todas</button>`;
    azNav.querySelectorAll('.az-nav-letter:not(.disabled)').forEach(btn => btn.addEventListener('click', () => {
      catalogoLetra = btn.dataset.letra;
      const busca = document.getElementById('catalogoSearch');
      if(busca.value) busca.value = '';
      renderCatalogo();
    }));

    if(buscando){
      const info = document.createElement('div');
      info.className = 'ativo-busca-info';
      info.textContent = `${filtered.length} produto(s) encontrado(s) para "${termoBruto}" em todas as letras`;
      container.appendChild(info);
    }

    visiveis.forEach(l => {
      const grupo = document.createElement('div');
      grupo.className = 'ativo-letter-group';
      grupo.innerHTML = `<div class="ativo-letter-heading">${l === '#' ? 'Produtos que começam com número' : 'Produtos com letra ' + l} (${grupos[l].length})</div>`;
      const grid = document.createElement('div');
      grid.className = 'ativo-card-grid';
      grupos[l].forEach(p => {
        const card = document.createElement('div');
        card.className = 'ativo-card produto-card';
        card.innerHTML = `
          <div class="produto-card-topo">
            ${p.image
              ? `<span class="img-zoomavel mini cat-thumb produto-card-foto" role="button" tabindex="0" title="Ver imagem maior"><img src="${p.image}" alt="${escCat(p.name)}"><span class="img-zoom-hint">${ICONE_LUPA}</span></span>`
              : `<div class="produto-card-foto vazio"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg></div>`}
            <div class="produto-card-id"><div class="ativo-card-name">${escCat(p.name)}</div><div class="produto-card-marca">${escCat(p.brand)}</div></div>
          </div>
          <div class="ativo-card-desc produto-card-desc">${escCat(p.func || '')}</div>
          <div class="produto-card-preco">${faixaDePrecoCompacta(p.price, p.apenasBrasil)}</div>
          <div class="ativo-card-footer">
            <span class="category-chip">${escCat(p.category || '')}</span>
            <button type="button" class="ativo-card-ler-mais">Ver produto ›</button>
          </div>`;
        card.querySelector('.ativo-card-ler-mais').addEventListener('click', () => openProduto(p.id));
        card.querySelector('.ativo-card-name').addEventListener('click', () => openProduto(p.id));
        const thumb = card.querySelector('.cat-thumb');
        if(thumb){
          const abrir = (e) => { e.stopPropagation(); abrirImagemTelaCheia(p.image, p.name, p.brand); };
          thumb.addEventListener('click', abrir);
          thumb.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(e); } });
        }
        grid.appendChild(card);
      });
      grupo.appendChild(grid);
      container.appendChild(grupo);
    });
  }

  document.getElementById('catalogoSearch').addEventListener('input', () => renderCatalogo());

  document.querySelectorAll('#view-catalogo .fin-tab[data-catalogosubview]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-catalogo .fin-tab[data-catalogosubview]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.catalogo-subpanel').forEach(p => p.classList.remove('active'));
      document.getElementById('catalogo-subpanel-' + tab.dataset.catalogosubview).classList.add('active');
    });
  });
  document.getElementById('catalogoCategoria').addEventListener('change', () => renderCatalogo());

  /* ---------- Visualizar imagem em tela cheia (produtos do catálogo) ---------- */
  function abrirImagemTelaCheia(src, titulo, subtitulo){
    if(!src) return;
    document.querySelectorAll('.img-viewer').forEach(v => v.remove());
    const anteriorFoco = document.activeElement;
    const v = document.createElement('div');
    v.className = 'img-viewer';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', titulo ? 'Imagem de ' + titulo : 'Imagem ampliada');
    v.innerHTML = `
      <button class="img-viewer-fechar" aria-label="Fechar">&times;</button>
      <div class="img-viewer-palco"><img alt=""></div>
      <div class="img-viewer-info"></div>
      <div class="img-viewer-dica">Clique na imagem para ampliar · Esc para fechar</div>
    `;
    const img = v.querySelector('img');
    img.src = src;
    img.alt = titulo || 'Imagem';
    const info = v.querySelector('.img-viewer-info');
    if(titulo){
      const t = document.createElement('strong'); t.textContent = titulo; info.appendChild(t);
    }
    if(subtitulo){
      const st = document.createElement('span'); st.textContent = subtitulo; info.appendChild(st);
    }
    const palco = v.querySelector('.img-viewer-palco');
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const ligando = !palco.classList.contains('zoom');
      palco.classList.toggle('zoom', ligando);
      if(ligando){
        // mostra a imagem no tamanho original (ou 2x, se ela for pequena) e centraliza no ponto clicado
        const larguraAlvo = Math.max(img.naturalWidth, (img.getBoundingClientRect().width || 0) * 2);
        img.style.width = larguraAlvo + 'px';
        requestAnimationFrame(() => {
          palco.scrollLeft = (palco.scrollWidth - palco.clientWidth) / 2;
          palco.scrollTop = (palco.scrollHeight - palco.clientHeight) / 2;
        });
      } else {
        img.style.width = '';
      }
    });
    function fechar(){
      v.remove();
      document.removeEventListener('keydown', onKey);
      if(anteriorFoco && anteriorFoco.focus) anteriorFoco.focus();
    }
    function onKey(e){ if(e.key === 'Escape') fechar(); }
    v.addEventListener('click', (e) => { if(e.target === v) fechar(); });
    v.querySelector('.img-viewer-fechar').addEventListener('click', fechar);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(v);
    v.querySelector('.img-viewer-fechar').focus();
  }

  const ICONE_LUPA = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

  function openProduto(productId){
    const p = products.find(x => x.id === productId);
    if(!p) return;
    pushNavHistory();

    document.getElementById('produtoBreadcrumbName').textContent = p.name;
    document.getElementById('produtoNome').textContent = p.name;
    document.getElementById('produtoMarca').textContent = p.brand;
    document.getElementById('produtoCategoria').textContent = p.category;
    document.getElementById('produtoPreco').innerHTML = faixaDePrecoLinhas(p.price, p.apenasBrasil);
    document.getElementById('produtoDescricao').textContent = p.func;
    document.getElementById('produtoInstrucoes').textContent = p.usage;

    const thumbEl = document.getElementById('produtoThumbLg');
    thumbEl.onclick = null; thumbEl.onkeydown = null;
    thumbEl.classList.remove('img-zoomavel');
    thumbEl.removeAttribute('tabindex'); thumbEl.removeAttribute('role'); thumbEl.removeAttribute('title');
    if(p.image){
      thumbEl.innerHTML = `<img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain; border-radius:14px;"><span class="img-zoom-hint">${ICONE_LUPA}</span>`;
      thumbEl.classList.add('img-zoomavel');
      thumbEl.setAttribute('tabindex', '0');
      thumbEl.setAttribute('role', 'button');
      thumbEl.setAttribute('title', 'Clique para ver a imagem em tamanho maior');
      const abrir = () => abrirImagemTelaCheia(p.image, p.name, p.brand);
      thumbEl.onclick = abrir;
      thumbEl.onkeydown = (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(); } };
    } else {
      thumbEl.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg>`;
    }

    const chipsWrap = document.getElementById('produtoAtivosChips');
    chipsWrap.innerHTML = '';
    (p.ativos || []).forEach(ativoId => {
      const ativoIdx = ativosData.findIndex(a => a.id === ativoId);
      if(ativoIdx < 0) return;
      const chip = document.createElement('div');
      chip.className = 'ativo-link-chip';
      chip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l1.9 4.6L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4z"/></svg> ${ativosData[ativoIdx].nome}`;
      chip.addEventListener('click', () => openAtivoDetail(ativoIdx));
      chipsWrap.appendChild(chip);
    });
    document.getElementById('produtoOutrosIngredientes').textContent = p.outrosIngredientes || '—';

    navItems.forEach(i => i.classList.remove('active'));
    const catalogoNavForProduto = document.querySelector('.nav-item[data-view="catalogo"]');
    if(catalogoNavForProduto) catalogoNavForProduto.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-produto').classList.add('active');
    pageTitle.textContent = 'Visualizar Produto';
    pageSubtitle.style.display = 'none';
  }

  document.getElementById('breadcrumbCatalogo').addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-catalogo').classList.add('active');
    const catalogoNav = document.querySelector('.nav-item[data-view="catalogo"]');
    if(catalogoNav) catalogoNav.classList.add('active');
    pageTitle.textContent = 'Catálogo de Produtos';
    pageSubtitle.textContent = 'Gerencie sua lista de produtos e recomendações';
    pageSubtitle.style.display = 'block';
  });

  renderCatalogo();

  renderJornada();

  /* ---------- Carrega Catálogo de Produtos do Supabase (com fallback ao mock) ---------- */
  async function loadProdutosFromSupabase(){
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return; // não logado: mantém o mock local

      const { data, error } = await supabaseClient.from('produtos').select('*');
      if(error || !data || data.length === 0) return; // erro ou tabela vazia: mantém o mock

      products = data.map(p => ({
        id: p.id,
        name: p.nome,
        image: p.imagem_url || '',
        brand: p.marca,
        apenasBrasil: !!p.apenas_brasil,
        category: categoriaCanonica(p.categoria),
        func: p.funcao,
        price: p.preco != null ? parseFloat(p.preco) : null,
        usage: p.modo_uso,
        ativos: p.ativos || [],
        outrosIngredientes: p.outros_ingredientes,
      }));

      produtosCarregadosEm = Date.now();
      renderCatalogo();
      renderSkcProdutosEncontrados();
    } catch(e){
      // qualquer falha de rede/consulta: segue com o mock local, sem travar o app
    }
  }
  // Busca o Catálogo de novo (ex.: produtos novos cadastrados no Supabase com o app já aberto).
  // Roda ao abrir o Plano de SkinCare e o Assistente; no máximo 1 vez a cada 30 segundos.
  let produtosCarregadosEm = 0;
  function atualizarProdutosSeAntigo(){
    if(Date.now() - produtosCarregadosEm < 30000) return;
    produtosCarregadosEm = Date.now();
    loadProdutosFromSupabase();
  }
  // (loadProdutosFromSupabase roda no enterApp, depois do login — aqui só duplicava o carregamento)
