/* Skin Expert Pro — Paginação automática das listas (no máximo 10 itens por página).
   Funciona sozinho: observa as listas abaixo e, quando passam de 10 itens, mostra só 10
   e coloca os números das páginas embaixo. Não mexe em como cada lista é montada.
   O Catálogo de produtos já tem paginação própria e por isso não entra aqui. */
(function iniciarPaginacao(){
  const POR_PAGINA = 10;

  // [seletor da lista, seletor dos itens (vazio = todos os filhos), compacta?]
  const LISTAS = [
    ['#patientsBody'], ['#servicosBody'], ['#categoriasBody'], ['#pacotesBody'], ['#profissionaisBody'],
    ['#comandasBody'], ['#controleBody'], ['#contasBody'], ['#formasLista'],
    ['#lembretesContainer', '', true], ['#acompanhamentosContainer', '', true],
    ['#preFichasContainer', '', true], ['#aniversariantesContainer', '', true],
    ['#anamnesesRespondidasContainer'], ['#planosSkincareHistoricoContainer'], ['#avaliacoesHistoricoContainer'],
    ['#mensagensPacienteContainer .msg-paciente-lista', '.msg-hist-item'],
    ['#recomendacoesList'],
    ['#msgHojeLista', '.msg-item'], ['#msgModelosLista', '.msg-modelo'],
  ];

  const estilo = document.createElement('style');
  estilo.textContent = `
    .pag-fora{ display:none !important; }
    .pagination-bar.pag-auto{ align-items:center; }
    .pagination-bar.pag-compacta{ padding:12px 4px 2px; gap:6px; }
    .pagination-bar.pag-compacta .pagination-btn{ min-width:30px; height:30px; padding:0 8px; }
    .pag-info{ margin-left:auto; font-size:12.5px; color:var(--text-muted); white-space:nowrap; }
    .pag-reticencias{ padding:0 2px; color:var(--text-muted); }
  `;
  document.head.appendChild(estilo);

  const estado = new WeakMap(); // lista -> { pagina, barra, assinatura }

  function itensDe(lista, sel){
    return Array.from(lista.children).filter(el => sel ? el.matches(sel) : !el.classList.contains('pagination-bar'));
  }

  function numerosDasPaginas(atual, total){
    if(total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total, atual - 1, atual, atual + 1]);
    if(atual <= 3) [2, 3, 4].forEach(n => set.add(n));
    if(atual >= total - 2) [total - 3, total - 2, total - 1].forEach(n => set.add(n));
    const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => { if(i && n - nums[i - 1] > 1) out.push('…'); out.push(n); });
    return out;
  }

  function lugarDaBarra(lista){
    // numa tabela, a barra vai logo depois da tabela; senão, logo depois da lista
    return lista.tagName === 'TBODY' ? lista.closest('table') : lista;
  }

  function montarBarra(lista, st, total, qtd, compacta, sel){
    const barra = st.barra || document.createElement('div');
    barra.className = 'pagination-bar pag-auto' + (compacta ? ' pag-compacta' : '');
    barra.innerHTML = '';
    const ir = (p) => {
      st.pagina = p;
      aplicar(lista, sel, compacta);
      const topo = (lista.closest('.card, .registro-card, .card-box') || lugarDaBarra(lista)).getBoundingClientRect().top;
      if(topo < 0) (lista.closest('.card, .registro-card, .card-box') || lugarDaBarra(lista)).scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    const botao = (texto, alvo, opts = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pagination-btn' + (opts.ativo ? ' active' : '');
      b.textContent = texto;
      if(opts.rotulo) b.setAttribute('aria-label', opts.rotulo);
      if(opts.ativo) b.setAttribute('aria-current', 'page');
      b.disabled = !!opts.desligado;
      b.addEventListener('click', (e) => { e.stopPropagation(); ir(alvo); });
      barra.appendChild(b);
    };
    botao('‹', st.pagina - 1, { desligado: st.pagina === 1, rotulo: 'Página anterior' });
    numerosDasPaginas(st.pagina, total).forEach(n => {
      if(n === '…'){ const s = document.createElement('span'); s.className = 'pag-reticencias'; s.textContent = '…'; barra.appendChild(s); }
      else botao(String(n), n, { ativo: n === st.pagina, rotulo: 'Página ' + n });
    });
    botao('›', st.pagina + 1, { desligado: st.pagina === total, rotulo: 'Próxima página' });
    const ini = (st.pagina - 1) * POR_PAGINA + 1, fim = Math.min(st.pagina * POR_PAGINA, qtd);
    const info = document.createElement('span');
    info.className = 'pag-info';
    info.textContent = `${ini}–${fim} de ${qtd}`;
    barra.appendChild(info);
    const ref = lugarDaBarra(lista);
    if(barra.previousElementSibling !== ref) ref.after(barra);
    st.barra = barra;
  }

  function aplicar(lista, sel, compacta){
    let st = estado.get(lista);
    if(!st){ st = { pagina: 1, barra: null, assinatura: '' }; estado.set(lista, st); }
    const itens = itensDe(lista, sel);
    const qtd = itens.length;
    const total = Math.max(1, Math.ceil(qtd / POR_PAGINA));
    if(st.pagina > total) st.pagina = total;
    if(st.pagina < 1) st.pagina = 1;

    const ini = (st.pagina - 1) * POR_PAGINA, fim = ini + POR_PAGINA;
    itens.forEach((el, i) => { const fora = total > 1 && (i < ini || i >= fim); if(el.classList.contains('pag-fora') !== fora) el.classList.toggle('pag-fora', fora); });

    // títulos de grupo (ex.: "Lembrete de amanhã"): somem quando nenhum item do grupo está nesta página
    if(sel){
      let titulo = null, temVisivel = false;
      const fecha = () => { if(titulo){ const fora = total > 1 && !temVisivel; if(titulo.classList.contains('pag-fora') !== fora) titulo.classList.toggle('pag-fora', fora); } };
      Array.from(lista.children).forEach(el => {
        if(el.matches(sel)){ if(!el.classList.contains('pag-fora')) temVisivel = true; }
        else if(!el.classList.contains('pagination-bar')){ fecha(); titulo = el; temVisivel = false; }
      });
      fecha();
    }

    if(total <= 1){
      if(st.barra){ st.barra.remove(); st.barra = null; }
      st.assinatura = '';
      return;
    }
    const assinatura = `${qtd}|${st.pagina}`;
    const ref = lugarDaBarra(lista);
    if(assinatura !== st.assinatura || !st.barra || !st.barra.isConnected || st.barra.previousElementSibling !== ref){
      montarBarra(lista, st, total, qtd, compacta, sel);
      st.assinatura = assinatura;
    }
  }

  function varrer(){
    LISTAS.forEach(([seletor, sel, compacta]) => {
      document.querySelectorAll(seletor).forEach(lista => aplicar(lista, sel || '', !!compacta));
    });
  }

  let agendado = false;
  function agendar(){
    if(agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; varrer(); });
  }
  new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });

  // Ao filtrar ou buscar numa tela, a lista daquela tela volta para a página 1
  function voltarPagina1(e){
    const tela = e.target.closest && e.target.closest('.view, .registro-panel, .fin-panel, .eq-panel');
    if(!tela || e.target.closest('.modal-overlay')) return;
    LISTAS.forEach(([seletor]) => {
      tela.querySelectorAll(seletor).forEach(lista => { const st = estado.get(lista); if(st && !lista.contains(e.target)) st.pagina = 1; });
    });
  }
  document.addEventListener('input', voltarPagina1, true);
  document.addEventListener('change', voltarPagina1, true);

  varrer();
})();
