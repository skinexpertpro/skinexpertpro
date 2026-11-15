/* Skin Expert Pro — Assinatura (Stripe).
   - Ao entrar, o app pergunta ao banco (minha_assinatura) se a conta está liberada:
     cortesia, assinatura em período grátis/ativa/com pagamento pendente, ou profissional de um estúdio Studio ativo.
   - Sem acesso: mostra a tela "Escolha o seu plano" (14 dias grátis, cartão no início). O botão leva ao
     link de pagamento do Stripe com o id da conta (client_reference_id) e o e-mail já preenchidos.
   - Na volta do pagamento (?assinatura=ok) espera o aviso do Stripe chegar (função stripe-webhook) e libera.
   - Configurações › Minha Assinatura mostra a situação do plano.
   Carregado depois de login.js. */

  const LINKS_PAGAMENTO = {
    EUR: {
      essencial: { mensal: 'https://buy.stripe.com/3cI4gze2jblpeJq9ipdEs01', trimestral: 'https://buy.stripe.com/fZu7sL5vNfBF1WE66ddEs02', anual: 'https://buy.stripe.com/14A8wP0btgFJbxecuBdEs03' },
      studio:    { mensal: 'https://buy.stripe.com/bJe9AT3nF75944M2U1dEs07', trimestral: 'https://buy.stripe.com/8x2dR9aQ7ahl6cU8eldEs08', anual: 'https://buy.stripe.com/6oUdR9cYfahlgRy0LTdEs09' },
    },
    BRL: {
      essencial: { mensal: 'https://buy.stripe.com/7sY00j7DVgFJgRy1PXdEs04', trimestral: 'https://buy.stripe.com/eVq6oH7DV759bxe66ddEs05', anual: 'https://buy.stripe.com/5kQ9AT0bt4X18l2529dEs06' },
      studio:    { mensal: 'https://buy.stripe.com/5kQ14n9M3blp1WEgKRdEs0a', trimestral: 'https://buy.stripe.com/7sYdR9aQ70GL1WE1PXdEs0b', anual: 'https://buy.stripe.com/cNi14n6zR4X1fNufGNdEs0c' },
    },
  };
  const PRECO_MENSAL = { EUR: { essencial: 19, studio: 39 }, BRL: { essencial: 69, studio: 119 } };
  const FATOR = { mensal: { meses: 1, desc: 1 }, trimestral: { meses: 3, desc: 0.95 }, anual: { meses: 12, desc: 0.9 } };
  const NOME_PLANO = { essencial: 'Essencial', studio: 'Studio', expert: 'Expert' };
  const NOME_PERIODO = { mensal: 'Mensal', trimestral: 'Trimestral', anual: 'Anual' };

  let assinaturaAtual = null;

  /* ---------- Plano escolhido no site (vem na URL e sobrevive à confirmação do e-mail) ---------- */
  const CHAVE_ESCOLHA = 'sep_plano_escolhido';
  (function lerEscolhaDaUrl(){
    const q = new URLSearchParams(location.search);
    const plano = q.get('plano'), periodo = q.get('periodo'), moeda = (q.get('moeda') || '').toUpperCase();
    const p = { m: 'mensal', t: 'trimestral', a: 'anual' }[periodo] || periodo;
    if(plano && LINKS_PAGAMENTO.EUR[plano]){
      try{ localStorage.setItem(CHAVE_ESCOLHA, JSON.stringify({ plano, periodo: FATOR[p] ? p : 'mensal', moeda: LINKS_PAGAMENTO[moeda] ? moeda : null })); }catch(e){}
    }
    if(q.get('cadastro') === '1'){ try{ setAuthMode('signup'); }catch(e){} }
    ['plano', 'periodo', 'moeda', 'cadastro'].forEach(k => q.delete(k));
    if(plano || q.toString() !== new URLSearchParams(location.search).toString()){
      history.replaceState({}, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
    }
  })();
  function escolhaGuardada(){ try{ return JSON.parse(localStorage.getItem(CHAVE_ESCOLHA) || 'null'); }catch(e){ return null; } }
  function moedaPadrao(){
    let fuso = '';
    try{ fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
    return /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha)/.test(fuso) ? 'BRL' : 'EUR';
  }

  function fmtValor(v, moeda){
    const n = Math.round(v * 100) / 100;
    const txt = n.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
    return moeda === 'BRL' ? 'R$ ' + txt : txt + ' €';
  }
  function dataCurtaBR(iso){ try{ return new Date(iso).toLocaleDateString('pt-BR'); }catch(e){ return ''; } }

  /* ---------- Banco ---------- */
  async function lerAssinatura(){
    const { data, error } = await supabaseClient.rpc('minha_assinatura');
    if(error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  /* ---------- Tela "Escolha o seu plano" ---------- */
  const estadoTela = { moeda: 'EUR', periodo: 'mensal' };
  function telaPlanos(){
    let tela = document.getElementById('telaPlanos');
    if(tela) return tela;
    tela = document.createElement('div');
    tela.id = 'telaPlanos';
    tela.className = 'tela-planos';
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    tela.setAttribute('aria-labelledby', 'telaPlanosTitulo');
    document.body.appendChild(tela);
    return tela;
  }
  function mostrarTelaPlanos(a){
    const tela = telaPlanos();
    const escolha = escolhaGuardada();
    estadoTela.moeda = (escolha && escolha.moeda) || estadoTela.moeda || moedaPadrao();
    if(escolha && escolha.periodo) estadoTela.periodo = escolha.periodo;
    const terminou = a && ['canceled', 'unpaid', 'incomplete_expired', 'paused'].includes(a.status);
    tela.innerHTML = `
      <div class="tp-caixa">
        <div class="tp-topo">
          <div class="brand-logo tp-logo"></div>
          <h1 id="telaPlanosTitulo">${terminou ? 'A sua assinatura terminou' : 'Escolha o seu plano'}</h1>
          <p class="tp-sub">${terminou
            ? 'Para continuar usando o Skin Expert Pro, escolha um plano. Os seus dados continuam guardados.'
            : '<strong>14 dias grátis.</strong> Você cadastra o cartão agora e só é cobrada no 15º dia. Cancele quando quiser antes disso, sem custo.'}</p>
        </div>
        <div class="tp-opcoes">
          <div class="tp-alternar" role="group" aria-label="Moeda">
            <button type="button" data-moeda="EUR">€ Euro</button><button type="button" data-moeda="BRL">R$ Real</button>
          </div>
          <div class="tp-alternar" role="group" aria-label="Período">
            <button type="button" data-periodo="mensal">Mensal</button><button type="button" data-periodo="trimestral">Trimestral</button><button type="button" data-periodo="anual">Anual</button>
          </div>
        </div>
        <div class="tp-cartoes" id="tpCartoes"></div>
        <p class="tp-nota">Valores sem impostos: o IVA/impostos aplicáveis ao seu país são calculados no pagamento. O pagamento é feito com segurança pelo Stripe.</p>
        <div class="tp-rodape">
          ${a && a.tem_stripe ? '<button type="button" class="tp-link" id="tpPortal">Ver recibos e cartão</button>' : ''}
          <a class="tp-link" href="mailto:contato@skinexpertpro.com">Dúvidas? contato@skinexpertpro.com</a>
          <button type="button" class="tp-link" id="tpSair">Sair da conta</button>
        </div>
      </div>`;
    tela.querySelectorAll('[data-moeda]').forEach(b => b.addEventListener('click', () => { estadoTela.moeda = b.dataset.moeda; desenharCartoes(escolha); }));
    tela.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => { estadoTela.periodo = b.dataset.periodo; desenharCartoes(escolha); }));
    tela.querySelector('#tpSair').addEventListener('click', async () => { try{ await supabaseClient.auth.signOut(); }catch(e){} location.reload(); });
    tela.querySelector('#tpPortal')?.addEventListener('click', () => document.getElementById('btnGerenciarAssinatura')?.click());
    desenharCartoes(escolha);
    tela.classList.add('aberta');
    document.body.classList.add('com-tela-planos');
  }
  function desenharCartoes(escolha){
    const { moeda, periodo } = estadoTela;
    document.querySelectorAll('#telaPlanos [data-moeda]').forEach(b => b.classList.toggle('ativo', b.dataset.moeda === moeda));
    document.querySelectorAll('#telaPlanos [data-periodo]').forEach(b => b.classList.toggle('ativo', b.dataset.periodo === periodo));
    const f = FATOR[periodo];
    const cartao = (plano, destaque, titulo, itens) => {
      const total = PRECO_MENSAL[moeda][plano] * f.meses * f.desc;
      const porMes = PRECO_MENSAL[moeda][plano] * f.desc;
      const escolhido = escolha && escolha.plano === plano;
      return `<div class="tp-cartao${destaque ? ' destaque' : ''}${escolhido ? ' escolhido' : ''}">
        ${escolhido ? '<span class="tp-selo">Você escolheu</span>' : destaque ? '<span class="tp-selo">Para atender em dupla ou trio</span>' : ''}
        <h2>${NOME_PLANO[plano]}</h2>
        <p class="tp-desc">${titulo}</p>
        <div class="tp-preco">${fmtValor(total, moeda)}<span>/${periodo === 'mensal' ? 'mês' : periodo === 'trimestral' ? 'trimestre' : 'ano'}</span></div>
        <div class="tp-pormes">${periodo === 'mensal' ? '&nbsp;' : 'equivale a ' + fmtValor(porMes, moeda) + '/mês'}</div>
        <ul>${itens.map(i => `<li>${i}</li>`).join('')}</ul>
        <button type="button" class="tp-botao" data-assinar="${plano}">Começar 14 dias grátis</button>
      </div>`;
    };
    document.getElementById('tpCartoes').innerHTML =
      cartao('essencial', false, 'Para quem atende sozinha.', [
        'Pacientes, anamnese e avaliação cutânea', 'Planos de SkinCare com PDF para a paciente', 'Agenda com Google Agenda',
        'Comandas, pacotes e financeiro', 'Termos de consentimento com assinatura digital', 'Até 2 conexões com colegas',
      ]) +
      cartao('studio', true, 'Para quem divide o espaço com até 3 profissionais.', [
        'Tudo do Essencial', 'Estúdio com até 3 profissionais', 'Agenda com uma coluna por profissional',
        'Salas compartilhadas ou separadas', 'Pacientes e financeiro de cada uma, sempre privados', 'Uma assinatura para o estúdio',
      ]) +
      `<div class="tp-cartao tp-embreve"><h2>Expert</h2><p class="tp-desc">O mais completo, com área educacional.</p><div class="tp-preco tp-preco-breve">Em breve</div></div>`;
    document.querySelectorAll('#tpCartoes [data-assinar]').forEach(b => b.addEventListener('click', () => irParaPagamento(b.dataset.assinar)));
  }
  async function irParaPagamento(plano){
    const link = LINKS_PAGAMENTO[estadoTela.moeda][plano][estadoTela.periodo];
    let user = null;
    try{ user = (await supabaseClient.auth.getUser()).data.user; }catch(e){}
    if(!user){ showToast('Entre na sua conta para assinar.'); return; }
    try{ localStorage.removeItem(CHAVE_ESCOLHA); }catch(e){}
    const q = new URLSearchParams({ client_reference_id: user.id, prefilled_email: user.email || '', locale: 'pt-BR' });
    location.href = link + '?' + q.toString();
  }
  function fecharTelaPlanos(){
    const tela = document.getElementById('telaPlanos');
    if(tela) tela.classList.remove('aberta');
    document.body.classList.remove('com-tela-planos');
  }

  /* ---------- Volta do pagamento: espera a confirmação do Stripe ---------- */
  async function aguardarConfirmacao(){
    const tela = telaPlanos();
    tela.innerHTML = `<div class="tp-caixa tp-confirmando"><div class="tp-giro"></div><h1 id="telaPlanosTitulo">Confirmando a sua assinatura…</h1><p class="tp-sub">Só um instante, estamos recebendo a confirmação do Stripe.</p></div>`;
    tela.classList.add('aberta');
    document.body.classList.add('com-tela-planos');
    for(let i = 0; i < 25; i++){
      await new Promise(r => setTimeout(r, i ? 2000 : 800));
      try{
        const a = await lerAssinatura();
        if(a && a.liberado){
          assinaturaAtual = a;
          fecharTelaPlanos();
          preencherCartaoAssinatura();
          showToast(a.status === 'trialing' ? 'Assinatura confirmada! Aproveite os seus 14 dias grátis.' : 'Assinatura confirmada!');
          return true;
        }
      }catch(e){}
    }
    tela.innerHTML = `<div class="tp-caixa tp-confirmando"><h1 id="telaPlanosTitulo">A confirmação está demorando</h1>
      <p class="tp-sub">O seu pagamento foi enviado, mas a confirmação ainda não chegou. Atualize a página em alguns minutos. Se continuar assim, escreva para contato@skinexpertpro.com.</p>
      <button type="button" class="tp-botao" onclick="location.reload()">Atualizar</button></div>`;
    return false;
  }

  /* ---------- Entrada no app ---------- */
  async function verificarAssinatura(){
    if(typeof modoDemonstracao !== 'undefined' && modoDemonstracao) return;
    const q = new URLSearchParams(location.search);
    const voltouDoPagamento = q.get('assinatura') === 'ok';
    if(voltouDoPagamento){ q.delete('assinatura'); history.replaceState({}, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash); }
    let a = null;
    try{ a = await lerAssinatura(); }
    catch(e){ console.warn('Assinatura:', e); return; } // sem resposta do banco: não trava o app
    assinaturaAtual = a;
    preencherCartaoAssinatura();
    if(a.liberado){ fecharTelaPlanos(); return; }
    if(voltouDoPagamento){ await aguardarConfirmacao(); return; }
    mostrarTelaPlanos(a);
  }

  /* ---------- Configurações › Minha Assinatura ---------- */
  function preencherCartaoAssinatura(){
    const el = document.getElementById('assinaturaStatus');
    const btn = document.getElementById('btnGerenciarAssinatura');
    const a = assinaturaAtual;
    if(!el || !a) return;
    let txt = '';
    const plano = `<strong>Plano ${NOME_PLANO[a.plano] || a.plano}${a.periodo ? ' · ' + (NOME_PERIODO[a.periodo] || a.periodo) : ''}</strong>`;
    if(a.cortesia) txt = `${plano} · acesso liberado (cortesia)`;
    else if(a.via_estudio) txt = '<strong>Acesso pelo estúdio</strong> · a assinatura Studio é da titular do estúdio';
    else if(a.status === 'trialing') txt = `${plano} · período grátis até ${dataCurtaBR(a.teste_ate)}${a.cancela_no_fim ? ' · cancelada, não será cobrada' : ' · primeira cobrança nesse dia'}`;
    else if(a.status === 'active') txt = a.cancela_no_fim ? `${plano} · cancelada, acesso até ${dataCurtaBR(a.renova_em)}` : `${plano} · próxima cobrança em ${dataCurtaBR(a.renova_em)}`;
    else if(a.status === 'past_due') txt = `${plano} · <span style="color:var(--block-red);">pagamento pendente: atualize o cartão</span>`;
    else txt = 'Sem assinatura ativa';
    el.innerHTML = 'Situação: ' + txt;
    if(btn) btn.style.display = (a.cortesia && !a.tem_stripe) || (a.via_estudio && !a.tem_stripe) ? 'none' : '';
  }
