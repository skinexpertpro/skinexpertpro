/* Skin Expert Pro — Plano de SkinCare para a paciente (página pública ?rotina=código).
   A profissional envia o link pela ficha da paciente (Plano de SkinCare › planos salvos › WhatsApp / Copiar link).
   A paciente abre no celular, sem login: rotina da Manhã e da Noite, passo a passo, com foto, modo de uso,
   preço aproximado, cupom e o botão Comprar (quando a profissional colocou o link do produto).
   Banco: coluna planos_skincare.token e função plano_por_token (só devolve o primeiro nome da paciente).
   Carregado depois de termos.js e antes de paginacao.js e celular.js. */

  const planoToken = new URLSearchParams(window.location.search).get('rotina');

  if(planoToken){
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'none';

    const tela = document.createElement('div');
    tela.className = 'plano-cli';
    tela.id = 'publicPlanoScreen';
    tela.innerHTML = '<div class="plano-cli-carregando">Carregando o seu plano…</div>';
    document.body.appendChild(tela);

    const esc = (t) => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

    const doCatalogo = (p) => {
      try{
        const lista = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
        const n = norm(p.name), b = norm(p.brand);
        return lista.find(x => norm(x.name) === n && norm(x.brand) === b) || lista.find(x => norm(x.name) === n) || null;
      }catch(e){ return null; }
    };
    const etapaDe = (p) => { try{ return categoriaCanonica(p.categoria || (doCatalogo(p) || {}).category || ''); }catch(e){ return p.categoria || ''; } };
    function precoDe(p, pais){
      try{
        const cat = doCatalogo(p);
        const valor = p.price != null ? p.price : (cat ? cat.price : null);
        if(valor == null || isNaN(valor)) return '';
        const i = faixaIndex(valor);
        const soBrasil = p.apenasBrasil || (cat && cat.apenasBrasil);
        if(soBrasil) return faixasPrecoBRL[i];
        const moeda = (typeof moedaPorPais === 'function' && moedaPorPais(pais)) || 'BRL';
        return ({ BRL: faixasPrecoBRL[i], USD: faixasPrecoUSD[i], EUR: faixasPrecoEUR[i] })[moeda] || faixasPrecoBRL[i];
      }catch(e){ return ''; }
    }
    function linkSeguro(l){
      const bruto = String(l || '').trim();
      if(!bruto) return '';
      const url = /^https?:\/\//i.test(bruto) ? bruto : 'https://' + bruto;
      try{ const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.href : ''; }catch(e){ return ''; }
    }
    function whatsDaProfissional(tel){
      let d = String(tel || '').replace(/\D/g, '');
      if(d.length < 8) return '';
      if(d.length === 9) d = '351' + d;          // celular de Portugal sem o código
      else if(d.length <= 11) d = '55' + d;     // número do Brasil sem o código
      return 'https://wa.me/' + d;
    }

    const ICONE_SOL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const ICONE_LUA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
    const FOTO_PADRAO = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/><path d="M9 11h6"/></svg>';

    function cartaoPasso(p, n, pais){
      const cat = doCatalogo(p);
      const foto = p.image || (cat && cat.image) || '';
      const uso = p.usage || (cat && cat.usage) || '';
      const preco = precoDe(p, pais);
      // Sem link da profissional, o Comprar abre a busca do produto nas lojas (Google Shopping)
      const link = linkSeguro(p.link) || ('https://www.google.com/search?tbm=shop&q=' + encodeURIComponent([p.brand, p.name].filter(Boolean).join(' ')));
      const quando = (p.frequencia === 'personalizar' && p.dias && p.dias.length) ? 'Usar: ' + p.dias.map(d => NOMES_DIAS[d]).filter(Boolean).join(', ') : '';
      return `<article class="plano-cli-passo">
        <div class="plano-cli-passo-topo"><span class="plano-cli-num">${n}</span><span class="plano-cli-etapa">${esc(etapaDe(p) || 'Passo ' + n)}</span></div>
        <div class="plano-cli-prod">
          <div class="plano-cli-foto">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ''}<span class="plano-cli-foto-padrao">${FOTO_PADRAO}</span></div>
          <div class="plano-cli-info">
            <b>${esc(p.name)}</b>
            ${p.brand ? `<span class="plano-cli-marca">${esc(p.brand)}</span>` : ''}
            ${uso ? `<span class="plano-cli-uso">${esc(uso)}</span>` : ''}
            ${quando ? `<span class="plano-cli-quando">${esc(quando)}</span>` : ''}
            ${preco ? `<span class="plano-cli-preco">${esc(preco)}</span>` : ''}
          </div>
        </div>
        ${p.name ? `<div class="plano-cli-acoes">
          ${p.cupom ? `<button type="button" class="plano-cli-cupom" data-cupom="${esc(p.cupom)}" aria-label="Copiar cupom ${esc(p.cupom)}">Cupom <strong>${esc(p.cupom)}</strong></button>` : ''}
          ${link ? `<a class="plano-cli-comprar" href="${esc(link)}" target="_blank" rel="noopener">Comprar</a>` : ''}
        </div>` : ''}
      </article>`;
    }

    (async () => {
      let dados = null;
      try{
        const { data, error } = await supabaseClient.rpc('plano_por_token', { p_token: planoToken });
        if(!error) dados = typeof data === 'string' ? JSON.parse(data) : data;
      }catch(e){}
      if(!dados){
        tela.innerHTML = `<div class="plano-cli-invalido"><h1>Link não encontrado</h1><p>Este plano não existe mais ou o link está incompleto. Peça um link novo à sua esteticista.</p></div>`;
        return;
      }
      const manha = Array.isArray(dados.manha) ? dados.manha : [];
      const noite = Array.isArray(dados.noite) ? dados.noite : [];
      const dt = dados.data_gerada ? new Date(dados.data_gerada) : null;
      const quando = dt ? `${dt.getDate()} ${MESES[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}` : '';
      const quem = [dados.profissional_nome, dados.profissional_titulo].filter(Boolean).join(' · ');
      const whats = whatsDaProfissional(dados.profissional_telefone);
      const primeiro = dados.paciente_nome || '';
      document.title = 'Seu plano de skincare';

      tela.innerHTML = `<header class="plano-cli-topo">
          <span class="plano-cli-selo">Plano de SkinCare</span>
          <h1>${primeiro ? esc(primeiro) + ', esta é a sua rotina' : 'Esta é a sua rotina'}</h1>
          <p>${esc([quem ? 'Montada por ' + quem : '', quando].filter(Boolean).join(' · '))}</p>
          ${dados.objetivo ? `<div class="plano-cli-objetivo"><b>Objetivo</b>${esc(dados.objetivo)}${dados.duracao ? ` <span>· acompanhamento de ${esc(dados.duracao)} dias</span>` : ''}</div>` : ''}
        </header>
        <div class="plano-cli-abas" role="tablist" aria-label="Período">
          <button type="button" role="tab" data-aba="manha">${ICONE_SOL} Manhã</button>
          <button type="button" role="tab" data-aba="noite">${ICONE_LUA} Noite</button>
        </div>
        <main class="plano-cli-lista" id="planoCliLista" role="tabpanel"></main>
        <footer class="plano-cli-rodape">
          ${whats ? `<a class="plano-cli-whats" href="${esc(whats)}" target="_blank" rel="noopener">Falar com ${esc(dados.profissional_nome ? primeiroNomeDe(dados.profissional_nome) : 'a esteticista')} no WhatsApp</a>` : ''}
          <span class="plano-cli-marca-app">Feito com Skin Expert Pro</span>
        </footer>`;

      const lista = tela.querySelector('#planoCliLista');
      function mostrar(aba){
        const itens = aba === 'manha' ? manha : noite;
        tela.querySelectorAll('[data-aba]').forEach(b => { const on = b.dataset.aba === aba; b.classList.toggle('ativa', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        lista.innerHTML = itens.length
          ? itens.map((p, i) => cartaoPasso(p, i + 1, dados.paciente_pais)).join('')
          : `<div class="plano-cli-vazio">Nenhum produto na rotina da ${aba === 'manha' ? 'manhã' : 'noite'}.</div>`;
        lista.querySelectorAll('.plano-cli-foto img').forEach(img => {
          const falhou = () => img.remove();
          img.addEventListener('error', falhou);
          if(img.complete && img.naturalWidth === 0) falhou();
        });
        lista.querySelectorAll('[data-cupom]').forEach(b => b.addEventListener('click', async () => {
          try{ await navigator.clipboard.writeText(b.dataset.cupom); b.classList.add('copiado'); b.innerHTML = 'Cupom copiado!'; }catch(e){}
        }));
      }
      tela.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.aba)));
      // À noite já abre na rotina da noite
      const h = new Date().getHours();
      mostrar((h >= 17 || h < 4) && noite.length ? 'noite' : (manha.length ? 'manha' : 'noite'));
    })();
  }
