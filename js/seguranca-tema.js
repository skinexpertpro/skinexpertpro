  /* ================= PROTEÇÃO CONTRA CÓDIGO MALICIOSO (XSS) =================
     Tudo o que o app coloca na tela via innerHTML passa por este filtro. Assim, se alguém
     escrever código num campo (ex.: no link público de anamnese), ele aparece como texto
     inofensivo e nunca é executado no painel da profissional. */
  (function(){
    var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if(!desc || !desc.set) return;
    var TAGS_PROIBIDAS = { SCRIPT:1, IFRAME:1, OBJECT:1, EMBED:1, BASE:1, META:1, LINK:1, FRAME:1, FRAMESET:1, APPLET:1, PORTAL:1 };
    var ATRS_URL = { href:1, src:1, 'xlink:href':1, action:1, formaction:1, poster:1, background:1, data:1, lowsrc:1, dynsrc:1, ping:1 };
    // Qualquer sinal de risco (inclusive letras disfarçadas com &#..; ou "script:" quebrado) leva ao filtro completo.
    var SUSPEITO = /<\s*(script|iframe|object|embed|base|meta|link|frame|applet|portal|svg|math|animate|set|template)\b|\son[a-z]+\s*=|script\s*:|data\s*:|srcdoc|formaction|&#|&(colon|tab|newline);|\b(href|src|action|xlink:href)\s*=/i;
    function urlPerigosa(v){
      var u = String(v).replace(/[\u0000-\u0020\u007f-\u009f]/g, '').toLowerCase();
      if(/^(javascript|vbscript):/.test(u)) return true;
      if(/^data:/.test(u) && !/^data:image\/(png|jpe?g|gif|webp|avif|bmp);/.test(u)) return true;
      return false;
    }
    function limpar(raiz){
      var pilha = [raiz], n, i, nome;
      while(pilha.length){
        n = pilha.pop();
        var filhos = n.children ? Array.prototype.slice.call(n.children) : [];
        for(i = 0; i < filhos.length; i++){
          var f = filhos[i], tag = (f.tagName || '').toUpperCase();
          if(TAGS_PROIBIDAS[tag]){ f.remove(); continue; }
          if((tag === 'ANIMATE' || tag === 'SET') && /href/i.test(f.getAttribute('attributeName') || '')){ f.remove(); continue; }
          var atrs = Array.prototype.slice.call(f.attributes);
          for(var j = 0; j < atrs.length; j++){
            nome = atrs[j].name.toLowerCase();
            if(nome.indexOf('on') === 0 || nome === 'srcdoc'){ f.removeAttribute(atrs[j].name); continue; }
            if(ATRS_URL[nome] && urlPerigosa(atrs[j].value)){ f.removeAttribute(atrs[j].name); continue; }
            if(nome === 'style' && /expression\s*\(|javascript\s*:/i.test(atrs[j].value)){ f.removeAttribute(atrs[j].name); }
          }
          if(tag === 'TEMPLATE' && f.content) pilha.push(f.content);
          pilha.push(f);
        }
      }
    }
    window.sanitizarHTML = function(html){
      html = html == null ? '' : String(html);
      if(html.indexOf('<') === -1 || !SUSPEITO.test(html)) return html;
      var t = document.createElement('template');
      desc.set.call(t, html);         // o conteúdo de <template> é inerte: nada executa nem carrega aqui
      limpar(t.content);
      return desc.get.call(t);
    };
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true, enumerable: desc.enumerable,
      get: function(){ return desc.get.call(this); },
      set: function(v){
        var tag = this.tagName;
        if(tag === 'SCRIPT' || tag === 'STYLE'){ desc.set.call(this, v); return; }
        desc.set.call(this, window.sanitizarHTML(v));
      }
    });
  })();

  // Aplica a cor do tema escolhida antes da página aparecer, para não "piscar" na cor padrão.
  try{ var t = localStorage.getItem('skinExpertTema'); if(t && t !== 'bordo') document.documentElement.setAttribute('data-tema', t); }catch(e){}

  // Versão para celular (menu embaixo, áreas só do computador, sem modo demonstração).
  // false = celular continua como antes. Para ligar, troque para true.
  var VERSAO_CELULAR = true;
  if(VERSAO_CELULAR) document.documentElement.classList.add('celular-ativo');

  /* ================= CELULAR: "EM BREVE" =================
     Enquanto a versão para celular não está pronta (VERSAO_CELULAR = false), quem abre o app
     num celular vê um aviso no lugar do sistema. Os links que as pacientes recebem
     (anamnese por link e confirmação de horário) continuam funcionando normalmente no celular. */
  (function(){
    if(VERSAO_CELULAR) return;
    var q = window.location.search || '';
    if(/[?&](anamnese|confirmar)=/.test(q)) return; // link da paciente: libera
    var toque = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var menorLado = Math.min(window.screen.width || 9999, window.screen.height || 9999);
    if(!(toque && menorLado <= 600)) return; // só celulares (tablet e computador seguem normais)

    document.documentElement.classList.add('celular-em-breve');
    var estilo = document.createElement('style');
    estilo.textContent =
      'html.celular-em-breve body > :not(#celularEmBreve){ display:none !important; }' +
      'html.celular-em-breve body{ margin:0; background:#f7f1e8; }' +
      '#celularEmBreve{ min-height:100vh; min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:24px 20px; box-sizing:border-box;' +
      '  font-family:Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color:#2b1a1f; text-align:center; }' +
      '#celularEmBreve .ceb-caixa{ background:#fff; border:1px solid #eadfce; border-radius:18px; padding:34px 24px 26px; max-width:360px; width:100%; }' +
      '#celularEmBreve .ceb-logo{ width:64px; height:64px; border-radius:24%; margin:0 auto 14px; background:url(img/icone-192.png) center/cover no-repeat; }' +
      '#celularEmBreve .ceb-marca{ font-family:"Playfair Display", Georgia, serif; font-size:18px; font-weight:700; color:#4a1524; margin-bottom:18px; }' +
      '#celularEmBreve .ceb-tag{ display:inline-block; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#8a5f22; background:#f6ead2; border-radius:999px; padding:5px 12px; margin-bottom:12px; }' +
      '#celularEmBreve h1{ font-family:"Playfair Display", Georgia, serif; font-size:24px; line-height:1.2; color:#4a1524; margin:0 0 10px; }' +
      '#celularEmBreve p{ font-size:14.5px; line-height:1.55; color:#7a6a63; margin:0 0 18px; }' +
      '#celularEmBreve .ceb-site{ display:block; font-weight:700; color:#4a1524; background:#f7f1e8; border-radius:10px; padding:11px 12px; font-size:14px; margin-bottom:18px; word-break:break-all; }' +
      '#celularEmBreve .ceb-links{ font-size:12px; color:#7a6a63; border-top:1px solid #eadfce; padding-top:14px; }' +
      '#celularEmBreve .ceb-links a{ color:#7a6a63; text-decoration:none; margin:0 6px; }';
    document.head.appendChild(estilo);

    function mostrar(){
      if(document.getElementById('celularEmBreve')) return;
      var tela = document.createElement('div');
      tela.id = 'celularEmBreve';
      var caixa = document.createElement('div'); caixa.className = 'ceb-caixa';
      var logo = document.createElement('div'); logo.className = 'ceb-logo';
      var marca = document.createElement('div'); marca.className = 'ceb-marca'; marca.textContent = 'Skin Expert Pro';
      var tag = document.createElement('div'); tag.className = 'ceb-tag'; tag.textContent = 'Em breve';
      var h1 = document.createElement('h1'); h1.textContent = 'Versão para celular a caminho';
      var p = document.createElement('p'); p.textContent = 'Estamos preparando o Skin Expert Pro para o celular com todo o cuidado. Por enquanto, acesse pelo computador ou tablet:';
      var site = document.createElement('span'); site.className = 'ceb-site'; site.textContent = 'www.skinexpertpro.com';
      var links = document.createElement('div'); links.className = 'ceb-links';
      var a1 = document.createElement('a'); a1.href = 'privacidade.html'; a1.textContent = 'Política de Privacidade';
      var a2 = document.createElement('a'); a2.href = 'termos.html'; a2.textContent = 'Termos de Uso';
      links.appendChild(a1); links.appendChild(document.createTextNode('·')); links.appendChild(a2);
      [logo, marca, tag, h1, p, site, links].forEach(function(el){ caixa.appendChild(el); });
      tela.appendChild(caixa);
      document.body.insertBefore(tela, document.body.firstChild);
    }
    if(document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
  })();
