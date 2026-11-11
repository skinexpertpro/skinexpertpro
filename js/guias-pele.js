/* Skin Expert Pro — Guias de rotina por tipo de pele.
   Entram no fim do PDF do Plano de SkinCare. O guia é escolhido pela avaliação da pele
   (acne > manchas > Glogau III/IV > sensível > oleosa/seca) e a profissional pode trocar no seletor. */

  const GUIAS_PELE = {
    oleosa: {
      nome: 'Pele Oleosa',
      intro: 'O objetivo é controlar o brilho e manter os poros limpos sem agredir a barreira da pele. Pele oleosa também precisa de hidratação.',
      lembre: 'Lavar demais ou usar produtos muito adstringentes faz a pele produzir ainda mais oleosidade.',
      etapas: [
        ['Limpeza', 'Gel ou espuma suave, sem deixar a pele repuxando.', 'Ácido salicílico, zinco, niacinamida', 'Manhã e noite'],
        ['Tonificação', 'Tônico sem álcool para equilibrar e refinar os poros.', 'Niacinamida, hamamelis, ácido glicólico em baixa concentração', 'Manhã e noite'],
        ['Tratamento', 'Sérum seborregulador.', 'Niacinamida, ácido salicílico, retinoide (à noite)', 'Noite (niacinamida também de manhã)'],
        ['Hidratação', 'Gel ou gel-creme oil-free, toque seco.', 'Ácido hialurônico, ceramidas leves, pantenol', 'Manhã e noite'],
        ['Proteção', 'Protetor FPS 30+ com toque seco ou matte; reaplicar a cada 2–3 h se exposta.', '', 'Todas as manhãs'],
        ['Cuidados extras', 'Máscara de argila para absorver o excesso de oleosidade.', '', '1 a 2x por semana'],
      ],
    },
    seca: {
      nome: 'Pele Seca',
      intro: 'O objetivo é repor lípides e água e fortalecer a barreira para a pele parar de descamar e repuxar.',
      lembre: 'Banho muito quente e sabonete comum ressecam ainda mais. Aplique o hidratante com a pele levemente úmida.',
      etapas: [
        ['Limpeza', 'Leite, óleo ou creme de limpeza sem espuma forte. À noite, pode fazer dupla limpeza com óleo.', 'Glicerina, ceramidas, aveia', 'Noite (de manhã, só água ou limpeza leve)'],
        ['Tonificação', 'Tônico ou essência hidratante, aplicado em camadas.', 'Ácido hialurônico, pantenol, extrato de arroz', 'Manhã e noite'],
        ['Tratamento', 'Sérum de hidratação profunda e reparo.', 'Ácido hialurônico, peptídeos, esqualano, ácido lático em baixa concentração', 'Manhã e noite (ácido lático 2x por semana)'],
        ['Hidratação', 'Creme mais encorpado que sela a umidade.', 'Ceramidas, manteiga de karité, esqualano, ureia 5–10%', 'Manhã e noite'],
        ['Proteção', 'Protetor FPS 30+ com textura cremosa ou hidratante.', '', 'Todas as manhãs'],
        ['Cuidados extras', 'Máscara hidratante ou sleeping mask; óleo facial nas áreas mais secas.', '', '2 a 3x por semana'],
      ],
    },
    mista: {
      nome: 'Pele Mista',
      intro: 'O objetivo é equilibrar duas zonas: controlar a oleosidade da zona T (testa, nariz e queixo) e hidratar as bochechas.',
      lembre: 'Dá para tratar por áreas: produto seborregulador só na zona T e hidratação extra nas bochechas.',
      etapas: [
        ['Limpeza', 'Gel de limpeza suave, pH equilibrado.', 'Niacinamida, chá verde, glicerina', 'Manhã e noite'],
        ['Tonificação', 'Tônico equilibrante sem álcool.', 'Niacinamida, centella asiatica, ácido hialurônico', 'Manhã e noite'],
        ['Tratamento', 'Sérum leve; esfoliação química só na zona T.', 'Niacinamida, ácido salicílico (zona T), vitamina C', 'Vitamina C de manhã; ácidos 2 a 3 noites por semana'],
        ['Hidratação', 'Gel-creme leve no rosto todo; um pouco mais nas bochechas se repuxar.', 'Ácido hialurônico, ceramidas, pantenol', 'Manhã e noite'],
        ['Proteção', 'Protetor FPS 30+ fluido ou toque seco.', '', 'Todas as manhãs'],
        ['Cuidados extras', 'Multimasking: argila na zona T e máscara hidratante nas bochechas.', '', '1x por semana'],
      ],
    },
    sensivel: {
      nome: 'Pele Sensível',
      intro: 'O objetivo é acalmar, reduzir vermelhidão e reconstruir a barreira com o mínimo de produtos.',
      lembre: 'Menos é mais. Evite fragrância, álcool e óleos essenciais, e teste cada produto novo atrás da orelha ou no maxilar por 2 a 3 dias.',
      etapas: [
        ['Limpeza', 'Limpador sem sulfato e sem perfume, ou água micelar. Água morna, nunca quente.', 'Aveia coloidal, glicerina, alantoína', 'Noite (de manhã, só água se preferir)'],
        ['Tonificação', 'Bruma ou tônico calmante, aplicado com as mãos, sem algodão.', 'Centella asiatica, água termal, pantenol', 'Manhã e noite'],
        ['Tratamento', 'Sérum calmante e reparador.', 'Centella asiatica (madecassoside), niacinamida em baixa concentração, bisabolol', 'Manhã e noite'],
        ['Hidratação', 'Creme reparador de barreira com poucos ingredientes.', 'Ceramidas, esqualano, pantenol, manteiga de karité', 'Manhã e noite'],
        ['Proteção', 'Protetor mineral FPS 30+ (óxido de zinco ou dióxido de titânio), sem perfume.', '', 'Todas as manhãs'],
        ['Cuidados extras', 'Máscara calmante; evitar esfoliantes físicos e ácidos fortes.', '', '1x por semana'],
      ],
    },
    acneica: {
      nome: 'Pele Acneica',
      intro: 'O objetivo é desobstruir os poros, reduzir a inflamação e prevenir marcas, sem ressecar a pele a ponto de piorar a acne.',
      lembre: 'Não esprema as lesões e troque a fronha com frequência. Acne moderada a grave ou cística deve ser avaliada por dermatologista.',
      etapas: [
        ['Limpeza', 'Gel de limpeza com ativo antiacne, sem esfregar.', 'Ácido salicílico, peróxido de benzoíla em baixa concentração, enxofre', 'Manhã e noite'],
        ['Tonificação', 'Tônico calmante e antioleosidade, sem álcool.', 'Niacinamida, ácido salicílico, centella asiatica', 'Manhã e noite'],
        ['Tratamento', 'Sérum ou gel secativo; retinoide para renovação celular.', 'Ácido azelaico, niacinamida, adapaleno ou retinal, ácido salicílico', 'Noite (azelaico e niacinamida também de manhã)'],
        ['Hidratação', 'Gel hidratante não comedogênico, essencial para tolerar os ativos.', 'Ácido hialurônico, ceramidas, pantenol', 'Manhã e noite'],
        ['Proteção', 'Protetor FPS 50 oil-free, toque seco — evita que as lesões virem manchas.', '', 'Todas as manhãs'],
        ['Cuidados extras', 'Patch de hidrocoloide em espinhas inflamadas; máscara de argila.', '', 'Patch quando surgir; máscara 1x por semana'],
      ],
    },
    manchas: {
      nome: 'Pele com Manchas',
      intro: 'O objetivo é clarear manchas existentes e impedir que novas se formem. O resultado leva de 8 a 12 semanas de uso contínuo.',
      lembre: 'Sem protetor solar todos os dias nenhum clareador funciona. Luz visível e calor também escurecem manchas, então prefira protetor com cor.',
      etapas: [
        ['Limpeza', 'Limpador suave que não irrite (irritação também mancha).', 'Niacinamida, glicerina, ácido glicólico leve', 'Manhã e noite'],
        ['Tonificação', 'Tônico uniformizador.', 'Niacinamida, extrato de arroz, ácido lático', 'Manhã e noite'],
        ['Tratamento', 'Antioxidante de manhã e clareador à noite.', 'Vitamina C, ácido tranexâmico, ácido azelaico, alfa-arbutin, retinoide', 'Vitamina C de manhã; clareadores à noite'],
        ['Hidratação', 'Hidratante para manter a barreira e tolerar os ativos.', 'Ceramidas, ácido hialurônico, pantenol', 'Manhã e noite'],
        ['Proteção', 'Protetor FPS 50 com cor (óxido de ferro); reaplicar a cada 2–3 h se exposta.', '', 'Todas as manhãs e ao longo do dia'],
        ['Cuidados extras', 'Esfoliação química suave para renovar a pele; máscara clareadora.', '', '1 a 2x por semana'],
      ],
    },
    madura: {
      nome: 'Pele Madura',
      intro: 'O objetivo é estimular colágeno, melhorar firmeza e textura e compensar a perda de hidratação natural da pele.',
      lembre: 'Constância vale mais que concentração. Leve os produtos até o pescoço e o colo, que também envelhecem.',
      etapas: [
        ['Limpeza', 'Limpador cremoso ou em óleo que não tire a oleosidade natural.', 'Glicerina, esqualano, ceramidas', 'Manhã e noite'],
        ['Tonificação', 'Essência ou tônico hidratante e antioxidante.', 'Ácido hialurônico, extrato de arroz, peptídeos', 'Manhã e noite'],
        ['Tratamento', 'Antioxidante de manhã e renovador à noite.', 'Vitamina C, retinol ou retinal, peptídeos, bakuchiol (alternativa ao retinol), NAD/EGF', 'Vitamina C de manhã; retinoide à noite'],
        ['Hidratação', 'Creme nutritivo e firmador; creme específico para a área dos olhos.', 'Ceramidas, peptídeos, esqualano, ácido hialurônico', 'Manhã e noite'],
        ['Proteção', 'Protetor FPS 50 hidratante, no rosto, pescoço, colo e mãos.', '', 'Todas as manhãs'],
        ['Cuidados extras', 'Esfoliação suave com ácido lático ou PHA; máscara nutritiva ou de peptídeos.', '', '1 a 2x por semana (fora das noites de retinoide)'],
      ],
    },
  };

  const ICONE_GUIA = {
    'Limpeza': '<svg viewBox="0 0 24 24"><path d="M8 10h8v9a3 3 0 01-3 3h-2a3 3 0 01-3-3z"/><path d="M10 10V7h4v3"/><path d="M12 7V4h4"/><circle cx="17.5" cy="14" r="1.6"/><circle cx="19.5" cy="17.5" r="1.1"/></svg>',
    'Tonificação': '<svg viewBox="0 0 24 24"><path d="M9 3h6v3l1.5 2v12a2 2 0 01-2 2h-5a2 2 0 01-2-2V8L9 6z"/><path d="M7.5 12h9"/></svg>',
    'Tratamento': '<svg viewBox="0 0 24 24"><path d="M10 2h4v3h-4z"/><path d="M9 5h6l1 3v11a3 3 0 01-3 3h-2a3 3 0 01-3-3V8z"/><path d="M12 11.5c1.2 1.6 1.8 2.6 1.8 3.5a1.8 1.8 0 01-3.6 0c0-.9.6-1.9 1.8-3.5z"/></svg>',
    'Hidratação': '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="3"/><path d="M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2"/><path d="M8 15.5h8"/></svg>',
    'Proteção': '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1 16a2 2 0 01-2 2h-4a2 2 0 01-2-2z"/><circle cx="12" cy="11" r="2.2"/><path d="M12 6.8v1M12 14.2v1M8.6 11h1M14.4 11h1"/></svg>',
    'Cuidados extras': '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  };

  // Escolhe o guia pela avaliação da pele que está aberta para a paciente.
  function guiaAutomaticoDaPaciente(){
    let av = {};
    try{ if(typeof lerAvaliacaoDaTela === 'function') av = lerAvaliacaoDaTela() || {}; }catch(e){}
    const cond = (av.condicoes || []).join(' ');
    const tipo = String(av.tipoPele || '').toLowerCase();
    const glogau = String(av.glogau || '');
    if(/acne/i.test(cond)) return 'acneica';
    if(/manchas/i.test(cond)) return 'manchas';
    if(/\b(III|IV)\b/.test(glogau)) return 'madura';
    if(/sens[ií]vel/.test(tipo)) return 'sensivel';
    if(/oleosa/.test(tipo)) return 'oleosa';
    if(/seca/.test(tipo)) return 'seca';
    return '';
  }

  function renderGuiaPele(id){
    const g = GUIAS_PELE[id];
    if(!g) return '';
    const cards = g.etapas.map(([etapa, texto, ativos, quando], i) => `
      <div class="pdf-guia-etapa">
        <div class="pdf-guia-topo">
          <span class="pdf-resumo-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="pdf-resumo-icone">${ICONE_GUIA[etapa] || ''}</span>
          <span class="pdf-guia-nome">${escHTML(etapa)}</span>
        </div>
        <div class="pdf-guia-texto">${escHTML(texto)}</div>
        ${ativos ? `<div class="pdf-guia-ativos"><b>Ativos:</b> ${escHTML(ativos)}</div>` : ''}
        <div class="pdf-resumo-quando">${escHTML(quando)}</div>
      </div>`).join('');
    return `
      <div class="pdf-guia-titulo">Guia de cuidados: ${escHTML(g.nome)}</div>
      <p class="pdf-guia-intro">${escHTML(g.intro)}</p>
      <div class="pdf-guia-lembre"><b>Lembre-se:</b> ${escHTML(g.lembre)}</div>
      <div class="pdf-guia-grade">${cards}</div>
      <div class="pdf-guia-nota">Este guia explica cada etapa de forma geral. Os produtos e a frequência certos para você são os do seu plano acima.</div>`;
  }

  // Preenche o guia no PDF. O seletor começa em "Automático" a cada plano aberto.
  function preencherGuiaPdf(){
    const el = document.getElementById('pdfPlanoGuia');
    const sel = document.getElementById('pdfGuiaSelect');
    if(!el) return;
    const auto = guiaAutomaticoDaPaciente();
    if(sel){
      const optAuto = sel.querySelector('option[value="auto"]');
      if(optAuto) optAuto.textContent = auto ? 'Automático (' + GUIAS_PELE[auto].nome + ')' : 'Automático (sem avaliação)';
    }
    const escolha = sel ? sel.value : 'auto';
    const id = escolha === 'auto' ? auto : (escolha === 'nenhum' ? '' : escolha);
    el.innerHTML = renderGuiaPele(id);
  }

  (function(){
    const sel = document.getElementById('pdfGuiaSelect');
    if(sel) sel.addEventListener('change', preencherGuiaPdf);
  })();
