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
  var VERSAO_CELULAR = false;
  if(VERSAO_CELULAR) document.documentElement.classList.add('celular-ativo');
