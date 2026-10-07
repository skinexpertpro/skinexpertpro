/* Skin Expert Pro — Registro da Paciente: dados, avaliação cutânea e fotos de evolução.
   Arquivo 3 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= REGISTRO DE PACIENTE MODULE ================= */
  let currentPatient = null;

  const patientPhotoDefaultIcon = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function setPatientPhotoCircle(url, initials, color, bg){
    const circle = document.getElementById('patientPhotoCircle');
    const inner = document.getElementById('patientPhotoInner');
    circle.classList.toggle('has-photo', !!url);
    if(url){
      inner.style.background = '';
      inner.style.color = '';
      inner.innerHTML = `<img src="${url}" alt="Foto da paciente">`;
    } else if(initials){
      inner.style.background = bg || 'var(--tag-bg)';
      inner.style.color = color || 'var(--tag-text)';
      inner.innerHTML = `<span style="font-weight:700; font-size:26px;">${initials}</span>`;
    } else {
      inner.style.background = '';
      inner.style.color = '';
      inner.innerHTML = patientPhotoDefaultIcon;
    }
  }

  document.getElementById('patientPhotoCircle').addEventListener('click', () => {
    document.getElementById('patientPhotoInput').click();
  });

  document.getElementById('patientPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file || !currentPatient) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setPatientPhotoCircle(dataUrl);
        currentPatient.foto_url = dataUrl;

        if(isPacienteReal(currentPatient)){
          const { error } = await supabaseClient.from('pacientes').update({ foto_url: dataUrl }).eq('id', currentPatient.id);
          if(error){ showToast('Não foi possível salvar a foto: ' + error.message); return; }
          await loadPacientesFromSupabase();
        } else {
          renderPacientesTable();
        }
        showToast('Foto atualizada!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Busca a moeda de investimento definida na anamnese clínica mais recente da paciente,
  // para usar como referência de preço no Plano de SkinCare.
  async function carregarMoedaAnamnese(patient){
    if(!patient || !String(patient.id).includes('-')) return; // pula pacientes de demonstração
    try{
      const { data, error } = await supabaseClient
        .from('anamneses')
        .select('investimento_moeda')
        .eq('paciente_id', patient.id)
        .order('respondida_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if(!error && data && data.investimento_moeda) patient.moedaAnamnese = data.investimento_moeda;
    } catch(e){ /* mantém a moeda padrão em caso de falha */ }
  }

  /* ---------- Troca de paciente: nada da paciente anterior pode ficar nos formulários ----------
     Antes, Anamnese Clínica, Avaliação Cutânea e Plano de SkinCare eram preenchidos na tela
     e nunca limpos: ao abrir outra paciente, os dados da anterior continuavam lá (e podiam
     ser salvos na ficha errada). */
  function limparFormulariosDaPaciente(){
    ['panel-anamnese', 'panel-avaliacao', 'panel-planoskincare'].forEach(id => {
      const painel = document.getElementById(id);
      if(!painel) return;
      painel.querySelectorAll('input, textarea, select').forEach(el => {
        if(el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked;
        else if(el.tagName === 'SELECT'){
          let algum = false;
          Array.from(el.options).forEach(o => { o.selected = o.defaultSelected; algum = algum || o.defaultSelected; });
          if(!algum) el.selectedIndex = 0;
        }
        else if(!['button', 'submit', 'hidden', 'file'].includes(el.type)) el.value = el.defaultValue;
      });
    });
    // Anamnese: produtos de skincare e perguntas da integrativa
    ['skincareAtualContainer', 'skincareParadoContainer'].forEach(id => { const c = document.getElementById(id); if(c) c.innerHTML = ''; });
    const perguntas = document.getElementById('questionsContainer');
    if(perguntas){ perguntas.innerHTML = ''; addQuestionRow(); }
    const moedaInv = document.getElementById('paInvestimentoMoeda');
    if(moedaInv) moedaInv.dispatchEvent(new Event('change')); // refaz as faixas de investimento
    // Avaliação: cartões e chips marcados, seções abertas, Baumann
    document.querySelectorAll('#panel-avaliacao .selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('#panel-avaliacao .switch input[data-toggle-target]').forEach(inp => {
      const alvo = document.getElementById(inp.dataset.toggleTarget);
      if(alvo) alvo.classList.toggle('hidden', !inp.checked);
    });
    updateBaumannResult();
    const aviso = document.getElementById('avUltimaAviso');
    if(aviso) aviso.style.display = 'none';
    // Plano de SkinCare: rotina montada e filtros do assistente
    routineEntries.splice(0, routineEntries.length);
    skcAtivosDesejados.clear();
    document.querySelectorAll('#panel-planoskincare .chip.selected').forEach(el => el.classList.remove('selected'));
    try{ renderSkcAtivosDesejadosChips(); }catch(e){}
    try{ renderSkcProdutosEncontrados(); }catch(e){}
    renderJornada();
    updateSkincareMeta();
  }

  // Coloca no formulário a última avaliação cutânea salva DESTA paciente (para consultar/atualizar).
  let seqAvaliacaoCarregada = 0;
  async function carregarUltimaAvaliacao(p){
    const minhaVez = ++seqAvaliacaoCarregada;
    if(!isPacienteReal(p)) return;
    let av = null;
    try{
      const { data, error } = await supabaseClient.from('avaliacoes_cutaneas').select('*')
        .eq('paciente_id', p.id).order('data_avaliacao', { ascending: false }).limit(1);
      if(error || !data || !data.length) return;
      av = data[0];
    }catch(e){ return; }
    // se nesse meio tempo abriu outra paciente, não preenche
    if(minhaVez !== seqAvaliacaoCarregada || !currentPatient || String(currentPatient.id) !== String(p.id)) return;

    const marcar = (grupo, valor) => {
      if(valor == null || valor === '') return;
      const el = Array.from(document.querySelectorAll(`#panel-avaliacao [data-group="${grupo}"]`)).find(x => x.dataset.value === String(valor));
      if(el) el.classList.add('selected');
    };
    const marcarChips = (grupo, lista) => (lista || []).forEach(txt => {
      const el = Array.from(document.querySelectorAll(`#panel-avaliacao .chip[data-chip-group="${grupo}"]`)).find(c => (c.dataset.valor || c.textContent.trim()) === txt);
      if(el) el.classList.add('selected');
    });
    const ligar = (alvoId, ligado) => {
      const inp = document.querySelector(`#panel-avaliacao [data-toggle-target="${alvoId}"]`);
      if(!inp) return;
      inp.checked = !!ligado;
      const alvo = document.getElementById(alvoId);
      if(alvo) alvo.classList.toggle('hidden', !inp.checked);
    };
    const marcarPorTexto = (seletor, textos) => {
      const lista = Array.isArray(textos) ? textos : (textos ? [textos] : []);
      document.querySelectorAll(seletor).forEach(inp => {
        const item = inp.closest('.checkbox-item');
        if(item && lista.includes(item.textContent.trim())) inp.checked = true;
      });
    };

    marcar('fitzpatrick', av.fitzpatrick);
    const letras = String(av.baumann || '');
    ['oleosidade', 'sensibilidade', 'pigmentacao', 'envelhecimento'].forEach((g, i) => marcar(g, letras[i]));
    marcar('glogau', av.glogau);
    marcar('hidratacao', av.hidratacao);
    marcarPorTexto('#panel-avaliacao .av-integridade', av.integridade);
    marcarPorTexto('#panel-avaliacao input[name="textura"]', av.textura);
    marcarPorTexto('#panel-avaliacao input[name="poros"]', av.poros);
    const ole = av.oleosidade || {}, acne = av.acne || {}, ros = av.rosacea || {}, dis = av.discromias || {}, olh = av.olheiras || {};
    ligar('oleosidadeBody', ole.presente); marcarChips('areas-oleosas', ole.areas); marcar('intensidade-oleosidade', ole.intensidade);
    ligar('acneBody', acne.presente); marcar('grau-acne', acne.grau); marcarChips('licoes-acne', acne.licoes);
    ligar('rosaceaBody', ros.presente); marcar('rosacea-subtipo', ros.subtipo);
    ligar('discromiasBody', dis.presente); marcarChips('discromias', dis.tipos);
    ligar('olheirasBody', olh.presente); marcar('olheiras-tipo', olh.tipo);
    document.getElementById('avObservacoes').value = av.observacoes || '';
    updateBaumannResult();
    updateSkincareMeta();

    let aviso = document.getElementById('avUltimaAviso');
    if(!aviso){
      aviso = document.createElement('div');
      aviso.id = 'avUltimaAviso';
      aviso.className = 'comanda-aviso';
      document.getElementById('panel-avaliacao').prepend(aviso);
    }
    const dt = av.data_avaliacao ? new Date(av.data_avaliacao) : null;
    aviso.textContent = `Mostrando a última avaliação de ${p.name}${dt && !isNaN(dt) ? ' (' + dt.toLocaleDateString('pt-BR') + ')' : ''}. Ao salvar, uma nova avaliação é registrada no histórico.`;
    aviso.style.display = 'block';
  }

  function openPatientRegistro(patientId, tab){
    const p = patients.find(x => x.id === patientId);
    if(!p) return;
    pushNavHistory();
    const trocouDePaciente = !currentPatient || String(currentPatient.id) !== String(p.id);
    currentPatient = p;
    if(trocouDePaciente){
      limparFormulariosDaPaciente();
      try{ limparEspecificas(); }catch(e){}
      carregarUltimaAvaliacao(p);
    }
    carregarMoedaAnamnese(p);

    document.getElementById('regBreadcrumbName').textContent = p.name;
    document.getElementById('regNome').value = p.name || '';
    document.getElementById('regStatus').value = p.status || 'Ativo';
    document.getElementById('regEmail').value = p.email || '';
    document.getElementById('regPhoneCode').value = p.phoneCode || '';
    document.getElementById('regPhoneNumber').value = p.phoneNumber || '';
    document.getElementById('regDataNascimento').value = p.dataNascimento || '';
    document.getElementById('regPais').value = p.pais || '';
    setPatientPhotoCircle(p.foto_url || '', initialsFromName(p.name), p.color, p.bg);
    atualizarHeaderPaciente(p);

    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavForRegistro = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavForRegistro) pacientesNavForRegistro.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-registro-paciente').classList.add('active');
    pageTitle.textContent = 'Registro de Paciente';
    pageSubtitle.style.display = 'none';

    switchRegistroTab(tab || 'dados');
  }

  function switchRegistroTab(tabName){
    if(ehCelular() && ['planoskincare', 'recomendacoes'].includes(tabName)) tabName = 'dados'; // no celular essas abas ficam só no computador
    document.querySelectorAll('.registro-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.registro-panel').forEach(p => p.classList.remove('active'));
    const tabEl = document.querySelector(`.registro-tab[data-tab="${tabName}"]`);
    if(tabEl) tabEl.classList.add('active');
    const panel = document.getElementById('panel-' + tabName);
    if(panel){ panel.classList.add('active'); }
    else { document.getElementById('panel-placeholder').classList.add('active'); }
    if(tabName === 'planoskincare'){ updateSkincareMeta(); atualizarProdutosSeAntigo(); }
    if(tabName === 'fotos') renderFotosEvolucao();
    if(typeof ESPECIALIDADES !== 'undefined' && ESPECIALIDADES[tabName]){
      if(!areasAtuacao[tabName]){ switchRegistroTab('dados'); return; }
      carregarEspecifica(tabName);
    }
    if(tabName === 'historico'){
      renderAnamnesesRespondidas().then(updateHistoricoCountBadge);
      renderPlanosSkincareHistorico().then(updateHistoricoCountBadge);
      renderAvaliacoesHistorico().then(updateHistoricoCountBadge);
    }
  }

  document.querySelectorAll('.registro-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if(tab.dataset.soon){ showToast('Esta aba estará disponível em breve'); return; }
      switchRegistroTab(tab.dataset.tab);
    });
  });

  document.getElementById('breadcrumbPacientes').addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-pacientes').classList.add('active');
    const pacientesNav = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNav) pacientesNav.classList.add('active');
    pageTitle.textContent = 'Pacientes';
    pageSubtitle.textContent = 'Gerencie a lista de pacientes da clínica';
    pageSubtitle.style.display = 'block';
  });

  document.getElementById('btnSalvarAlteracoes').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }

    const nome = document.getElementById('regNome').value.trim();
    const status = document.getElementById('regStatus').value;
    const email = document.getElementById('regEmail').value.trim();
    const phoneCode = document.getElementById('regPhoneCode').value;
    const phoneNumber = document.getElementById('regPhoneNumber').value.trim();
    const dataNascimento = document.getElementById('regDataNascimento').value;
    const pais = document.getElementById('regPais').value.trim();

    if(!nome){ showToast('O nome completo é obrigatório.'); return; }
    if(!phoneNumber){ showToast('O telefone / WhatsApp é obrigatório.'); return; }
    if(!phoneCode){ showToast('Selecione o código do país do telefone.'); document.getElementById('regPhoneCode').focus(); return; }

    const duplicada = encontrarPacienteDuplicado(nome, phoneNumber, currentPatient.id);
    if(duplicada){ showToast('Já existe uma paciente cadastrada com esse nome e telefone: ' + duplicada.name); return; }

    if(isPacienteReal(currentPatient)){
      const { error } = await supabaseClient.from('pacientes').update({
        nome, status, email,
        telefone_codigo: phoneCode, telefone_numero: phoneNumber,
        data_nascimento: dataNascimento || null, pais: pais || null,
      }).eq('id', currentPatient.id);

      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
      await loadPacientesFromSupabase();
    } else {
      Object.assign(currentPatient, {
        name: nome, status, email, phoneCode, phoneNumber,
        phone: [phoneCode, phoneNumber].filter(Boolean).join(' '),
        dataNascimento, pais, age: calcularIdade(dataNascimento),
      });
      renderPacientesTable();
    }

    document.getElementById('regBreadcrumbName').textContent = nome;
    showToast('Dados salvos com sucesso!');
  });
  // Excluir cadastro e Exportar dados (LGPD): ver o bloco "LGPD — DIREITOS DA PACIENTE" mais abaixo.

  document.getElementById('btnGerarLinkPaciente').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Selecione uma paciente primeiro.'); return; }
    const { data: userData } = await supabaseClient.auth.getUser();
    if(!userData || !userData.user){ showToast('Faça login com uma conta real (fora do modo demonstração) para gerar o link.'); return; }

    const { data, error } = await supabaseClient
      .from('links_anamnese')
      .insert({ paciente_id: currentPatient.id, paciente_nome: currentPatient.name, profissional_id: userData.user.id })
      .select()
      .single();

    if(error){ showToast('Não foi possível gerar o link: ' + error.message); return; }

    const link = window.location.origin + window.location.pathname + '?anamnese=' + data.token;
    document.getElementById('linkGeradoInput').value = link;
    document.getElementById('modalLinkGeradoOverlay').classList.add('open');
  });

  document.getElementById('modalLinkGeradoFechar').addEventListener('click', () => {
    document.getElementById('modalLinkGeradoOverlay').classList.remove('open');
  });
  document.getElementById('btnCopiarLinkGerado').addEventListener('click', () => {
    const input = document.getElementById('linkGeradoInput');
    input.select();
    input.setSelectionRange(0, 99999);
    let copiado = false;
    try {
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(input.value);
        copiado = true;
      }
    } catch(e){ /* segue para o fallback abaixo */ }
    if(!copiado){
      try { copiado = document.execCommand('copy'); } catch(e){ copiado = false; }
    }
    showToast(copiado ? 'Link copiado!' : 'Não foi possível copiar automaticamente — selecione e copie manualmente.');
  });
  let salvandoAnamnese = false;
  document.getElementById('paConsentimentoTexto').textContent = DECLARACAO_ANAMNESE + '\n\n' + CONSENTIMENTO_TEXTO;
  document.getElementById('paConsentimentoVer').addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.getElementById('paConsentimentoTexto');
    t.style.display = t.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btnSalvarAnamnese').addEventListener('click', async () => {
    if(salvandoAnamnese) return; // clique duplo não grava duas vezes
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }
    salvandoAnamnese = true;
    const btnSalvarAn = document.getElementById('btnSalvarAnamnese');
    btnSalvarAn.disabled = true;
    try{

    const principalQueixa = document.getElementById('paPrincipalQueixa').value.trim();
    if(!principalQueixa){ showToast('Preencha a Principal Queixa — esse campo é obrigatório.'); return; }
    // Link para a paciente confirmar: a janela do WhatsApp abre já no clique (senão o navegador bloqueia)
    const querConfirmacao = document.getElementById('paEnviarConfirmacao').checked && isPacienteReal(currentPatient);
    const pacienteConf = currentPatient;
    let janelaConf = null, janelaUsada = false;
    if(querConfirmacao && numeroWhatsappDaPaciente(pacienteConf)){
      janelaConf = window.open('', '_blank');
      if(janelaConf){ try{ janelaConf.opener = null; janelaConf.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Abrindo o WhatsApp…</p>'); }catch(e){} }
    }
    const tokenConf = querConfirmacao ? (crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))) : null;
    try{

    const autopercepcao = Array.from(document.querySelectorAll('.pa-autopercepcao:checked'))
      .map(el => el.closest('.checkbox-item').textContent.trim());

    const integrativa = Array.from(document.querySelectorAll('#questionsContainer .question-row'))
      .map(row => {
        const inputs = row.querySelectorAll('input[type="text"]');
        const pergunta = inputs[0] ? inputs[0].value.trim() : '';
        const resposta = inputs[1] ? inputs[1].value.trim() : '';
        return pergunta ? `${pergunta}: ${resposta || '—'}` : '';
      })
      .filter(Boolean)
      .join(' | ');

    function resumoProductRow(row){
      const [nome, marca] = Array.from(row.querySelectorAll('input')).map(i => i.value.trim());
      const periodos = Array.from(row.querySelectorAll('.product-period-btn.on')).map(b => b.dataset.periodo === 'manha' ? 'Manhã' : 'Noite');
      const partes = [nome, marca].filter(Boolean);
      if(periodos.length) partes.push(periodos.join(' e '));
      return partes.join(' - ');
    }
    const skincareAtual = Array.from(document.querySelectorAll('#skincareAtualContainer .product-row'))
      .map(resumoProductRow).filter(Boolean).join('; ');
    const skincareParado = Array.from(document.querySelectorAll('#skincareParadoContainer .product-row'))
      .map(resumoProductRow).filter(Boolean).join('; ');

    const payload = {
      paciente_id: currentPatient.id,
      ...(tokenConf ? { confirmacao_token: tokenConf } : {}),
      principal_queixa: principalQueixa,
      tratamentos_anteriores: document.getElementById('paTratamentosAnteriores').value.trim(),
      autopercepcao,
      integrativa,
      sistemica: {
        medicamentos: document.getElementById('paMedicamentos').value.trim(),
        alergias: document.getElementById('paAlergias').value,
        alergia_tipo: document.getElementById('paAlergiaTipo').value.trim(),
        gestante: document.getElementById('paGestante').value,
        lactante: document.getElementById('paLactante').value,
        diabetica: document.getElementById('paDiabetico').value,
        diabetica_tipo: document.getElementById('paDiabeticoTipo').value,
        tireoide: document.getElementById('paTireoide').value,
        tireoide_tipo: document.getElementById('paTireoideTipo').value,
        hipertensao: document.getElementById('paHipertensao').value,
        hipotensao: document.getElementById('paHipotensao').value,
        cardiopatologia: document.getElementById('paCardiopatologia').value,
        epilepsia: document.getElementById('paEpilepsia').value,
        trombose: document.getElementById('paTrombose').value,
        insuficiencia_renal: document.getElementById('paInsuficienciaRenal').value,
        hepatite: document.getElementById('paHepatite').value,
        sop: document.getElementById('paSOP').value,
        oncologicos: document.getElementById('paOncologicos').value,
        bariatrico: document.getElementById('paBariatrico').value,
        ansiedade: document.getElementById('paAnsiedade').value,
        depressao: document.getElementById('paDepressao').value,
        dermatite: document.getElementById('paDermatite').value,
        dermatite_frequencia: document.getElementById('paDermatiteFrequencia').value.trim(),
        asma: document.getElementById('paAsma').value,
        asma_frequencia: document.getElementById('paAsmaFrequencia').value.trim(),
        outras_doencas: document.getElementById('paOutrasDoencas').value.trim(),
      },
      estilo_vida: {
        atividade_fisica: document.getElementById('paAtividadeFisica').value,
        alimentacao: document.getElementById('paAlimentacao').value,
        agua: document.getElementById('paAgua').value,
        sono: document.getElementById('paSono').value,
        sol: document.getElementById('paSol').value,
        tabagista: document.getElementById('paTabagista').value,
        alcool: document.getElementById('paAlcool').value,
        alcool_frequencia: document.getElementById('paAlcoolFrequencia').value.trim(),
        evacuacao: document.getElementById('paEvacuacao').value,
        habito_urinario: document.getElementById('paHabitoUrinario').value,
        frequencia_menstrual: document.getElementById('paFrequenciaMenstrual').value,
      },
      skincare: {
        atual: skincareAtual,
        parado: skincareParado,
        regularidade: document.getElementById('paRegularidade').value,
        como_gostaria: document.getElementById('paComoGostaria').value,
      },
      investimento: document.getElementById('paInvestimento').value,
      investimento_moeda: document.getElementById('paInvestimentoMoeda').value,
      observacoes: document.getElementById('paObservacoes').value.trim(),
    };

    if(currentPatient) currentPatient.moedaAnamnese = payload.investimento_moeda;

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }
      payload.profissional_id = userData.user.id;

      const { error, consentimentoNaoGravado } = await inserirAnamneseComConsentimento(payload);
      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
      if(consentimentoNaoGravado){
        setTimeout(() => showToast('Anamnese salva, mas o link de confirmação não foi criado: rode o arquivo consentimento.sql no Supabase.'), 2600);
      } else if(tokenConf){
        const texto = msgDoModelo('confirmar_anamnese', { paciente: pacienteConf, link: linkConfirmacaoAnamnese(tokenConf) });
        const url = linkWhatsapp(pacienteConf, texto);
        if(url && janelaConf){ janelaConf.location.href = url; janelaUsada = true; try{ registrarEnvio(pacienteConf, 'confirmar_anamnese', texto); }catch(e){} }
        else setTimeout(() => showToast(url ? 'Anamnese salva. Envie o link de confirmação pela aba Histórico.' : 'Anamnese salva. A paciente não tem telefone cadastrado: envie o link pela aba Histórico.'), 2600);
      }
    } else {
      payload.respondida_em = new Date().toISOString();
      payload.token = null;
      if(!demoAnamnesesPorPaciente[currentPatient.id]) demoAnamnesesPorPaciente[currentPatient.id] = [];
      demoAnamnesesPorPaciente[currentPatient.id].unshift(payload);
    }

    renderAnamnesesRespondidas().then(updateHistoricoCountBadge);
    atualizarHeaderPaciente(currentPatient);
    showToast(janelaUsada ? 'Anamnese salva! Envie o link no WhatsApp para a paciente confirmar.' : 'Anamnese salva com sucesso!');
    } finally {
      if(janelaConf && !janelaUsada){ try{ janelaConf.close(); }catch(e){} }
    }
    } finally {
      salvandoAnamnese = false;
      btnSalvarAn.disabled = false;
    }
  });

  /* Anamnese Integrativa - dynamic questions */
  /* ---------- Investimento Confortável: faixas por moeda ---------- */
  const faixasInvestimentoPorMoeda = {
    BRL: ['Selecionar...', 'Até R$ 200', 'R$ 200 - R$ 500', 'Acima de R$ 500'],
    USD: ['Selecionar...', 'Até $ 40', '$ 40 - $ 100', 'Acima de $ 100'],
    EUR: ['Selecionar...', 'Até € 40', '€ 40 - € 90', 'Acima de € 90'],
  };

  function popularFaixasInvestimento(moedaSelectId, faixaSelectId){
    const moedaSelect = document.getElementById(moedaSelectId);
    const faixaSelect = document.getElementById(faixaSelectId);
    function atualizar(){
      const faixas = faixasInvestimentoPorMoeda[moedaSelect.value] || faixasInvestimentoPorMoeda.BRL;
      faixaSelect.innerHTML = faixas.map(f => `<option>${f}</option>`).join('');
    }
    moedaSelect.addEventListener('change', atualizar);
    atualizar();
  }
  popularFaixasInvestimento('paInvestimentoMoeda', 'paInvestimento');
  popularFaixasInvestimento('pubInvestimentoMoeda', 'pubInvestimento');

  function addQuestionRow(){
    const container = document.getElementById('questionsContainer');
    const row = document.createElement('div');
    row.className = 'question-row';
    row.innerHTML = `
      <div class="question-row-top">
        <input type="text" placeholder="Digite a pergunta...">
        <label class="switch"><input type="checkbox" checked><span class="switch-slider"></span></label>
        <button class="icon-btn trash" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>
      <div class="question-row-answer"><input type="text" placeholder="Resposta..."></div>
    `;
    row.querySelector('.icon-btn.trash').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }
  document.getElementById('btnNovaPergunta').addEventListener('click', addQuestionRow);
  addQuestionRow();

  /* Skincare product rows */
  function addProductRow(containerId){
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
      <input type="text" placeholder="Nome">
      <input type="text" placeholder="Marca">
      <div class="product-period-toggle">
        <button type="button" class="product-period-btn" data-periodo="manha">☀ Manhã</button>
        <button type="button" class="product-period-btn" data-periodo="noite">🌙 Noite</button>
      </div>
      <button class="icon-btn trash" title="Remover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    `;
    row.querySelectorAll('.product-period-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('on'));
    });
    row.querySelector('.icon-btn.trash').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }
  document.getElementById('btnAddSkincareAtual').addEventListener('click', () => addProductRow('skincareAtualContainer'));
  document.getElementById('btnAddSkincareParado').addEventListener('click', () => addProductRow('skincareParadoContainer'));

  /* ================= AVALIAÇÃO CUTÂNEA MODULE ================= */
  // single-select scale cards / baumann options (grouped by data-group)
  document.querySelectorAll('#panel-avaliacao .scale-card, #panel-avaliacao .baumann-option').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.dataset.group;
      document.querySelectorAll(`#panel-avaliacao [data-group="${group}"]`).forEach(sibling => sibling.classList.remove('selected'));
      el.classList.add('selected');
      updateBaumannResult();
    });
  });


  /* Escala de Glogau: fotos de peles claras (Fitzpatrick I–III ou sem fototipo) ou negras (IV–VI) */
  const GLOGAU_FOTOS = {"clara": ["avaliacao/glogau-clara-1.jpg", "avaliacao/glogau-clara-2.jpg", "avaliacao/glogau-clara-3.jpg", "avaliacao/glogau-clara-4.jpg", "avaliacao/glogau-clara-5.jpg"], "negra": ["avaliacao/glogau-negra-1.jpg", "avaliacao/glogau-negra-2.jpg", "avaliacao/glogau-negra-3.jpg", "avaliacao/glogau-negra-4.jpg", "avaliacao/glogau-negra-5.jpg"]};
  const GLOGAU_DESC = {"clara": ["Sinais mínimos de envelhecimento. Pele lisa, sem rugas visíveis, apenas alterações sutis de textura e luminosidade.", "Linhas finas iniciais, especialmente na região periorbicular. Leve irregularidade na textura da pele, com pequenas alterações de pigmentação e perda discreta de firmeza.", "Rugas mais evidentes, perda de elasticidade e início de flacidez. Manchas senis mais frequentes e textura menos uniforme.", "Rugas profundas, flacidez moderada a acentuada, manchas pigmentares mais visíveis e alterações estruturais significativas da pele.", "Rugas profundas e generalizadas, flacidez acentuada, lentigos e alterações pigmentares extensas, com perda significativa da estrutura e densidade da pele."], "negra": ["Sinais mínimos de envelhecimento. Pele lisa, com leve perda de viço e elasticidade. Podem surgir as primeiras alterações pigmentares discretas.", "Linhas finas iniciais, especialmente na região periorbicular. Leve irregularidade na textura da pele, com pequenas manchas pigmentares e perda discreta de firmeza.", "Rugas mais evidentes, perda de elasticidade, flacidez leve e manchas pigmentares mais frequentes. O contorno facial pode começar a perder definição.", "Rugas profundas, flacidez acentuada, manchas pigmentares mais visíveis e alterações estruturais significativas da pele. A textura se torna mais irregular e espessa.", "Rugas profundas e generalizadas, flacidez intensa, lentigos e alterações pigmentares extensas. A pele apresenta aspecto mais fino, com perda significativa de volume e firmeza."]};
  let glogauTomAtual = 'clara';
  function atualizarFotosGlogau(){
    const fitz = document.querySelector('#panel-avaliacao .scale-card.selected[data-group="fitzpatrick"]');
    const tom = fitz && ['IV', 'V', 'VI'].includes(fitz.dataset.value) ? 'negra' : 'clara';
    const aviso = document.getElementById('glogauTomAviso');
    if(aviso) aviso.textContent = fitz ? '· imagens para fototipo ' + fitz.dataset.value : '· escolha o fototipo acima para ver as imagens do tom de pele';
    if(tom === glogauTomAtual) return;
    glogauTomAtual = tom;
    document.querySelectorAll('#panel-avaliacao .scale-card[data-group="glogau"]').forEach((card, i) => {
      const img = card.querySelector('.glogau-foto'); if(img) img.src = GLOGAU_FOTOS[tom][i];
      const d = card.querySelector('.sc-desc'); if(d) d.textContent = GLOGAU_DESC[tom][i];
    });
  }
  function updateBaumannResult(){
    try{ atualizarFotosGlogau(); }catch(e){}
    const groups = ['oleosidade','sensibilidade','pigmentacao','envelhecimento'];
    let code = '';
    for(const g of groups){
      const sel = document.querySelector(`#panel-avaliacao .baumann-option.selected[data-group="${g}"]`);
      if(!sel){ code = null; break; }
      code += sel.dataset.value;
    }
    document.getElementById('baumannResult').textContent = code || '—';
  }

  // multi-select chips
  document.querySelectorAll('#panel-avaliacao .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });

  // toggle switches that reveal/hide a detail section
  document.querySelectorAll('#panel-avaliacao .switch input[data-toggle-target]').forEach(input => {
    input.addEventListener('change', () => {
      const target = document.getElementById(input.dataset.toggleTarget);
      if(target) target.classList.toggle('hidden', !input.checked);
    });
  });

  function getGroupValue(group){
    const el = document.querySelector(`#panel-avaliacao [data-group="${group}"].selected`);
    return el ? el.dataset.value : null;
  }
  function getChipGroupValues(group){
    return Array.from(document.querySelectorAll(`#panel-avaliacao .chip.selected[data-chip-group="${group}"]`)).map(c => (c.dataset.valor || c.textContent.trim()));
  }
  function getRadioLabel(name){
    const el = document.querySelector(`#panel-avaliacao input[name="${name}"]:checked`);
    return el ? el.closest('.checkbox-item').textContent.trim() : null;
  }
  function isToggleOn(targetId){
    const el = document.querySelector(`#panel-avaliacao [data-toggle-target="${targetId}"]`);
    return el ? el.checked : false;
  }

  document.getElementById('btnSalvarAvaliacao').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }

    const payload = {
      paciente_id: currentPatient.id,
      fitzpatrick: getGroupValue('fitzpatrick'),
      baumann: (() => { const t = document.getElementById('baumannResult').textContent; return t !== '—' ? t : null; })(),
      glogau: getGroupValue('glogau'),
      hidratacao: getGroupValue('hidratacao'),
      integridade: Array.from(document.querySelectorAll('.av-integridade:checked')).map(el => el.closest('.checkbox-item').textContent.trim()),
      textura: getRadioLabel('textura'),
      poros: getRadioLabel('poros'),
      oleosidade: {
        presente: isToggleOn('oleosidadeBody'),
        areas: getChipGroupValues('areas-oleosas'),
        intensidade: getGroupValue('intensidade-oleosidade'),
      },
      acne: {
        presente: isToggleOn('acneBody'),
        grau: getGroupValue('grau-acne'),
        licoes: getChipGroupValues('licoes-acne'),
      },
      rosacea: {
        presente: isToggleOn('rosaceaBody'),
        subtipo: getGroupValue('rosacea-subtipo'),
      },
      discromias: {
        presente: isToggleOn('discromiasBody'),
        tipos: getChipGroupValues('discromias'),
      },
      olheiras: {
        presente: isToggleOn('olheirasBody'),
        tipo: getGroupValue('olheiras-tipo'),
      },
      observacoes: document.getElementById('avObservacoes').value.trim(),
    };

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }
      payload.profissional_id = userData.user.id;

      const { error } = await supabaseClient.from('avaliacoes_cutaneas').insert(payload);
      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
      renderAvaliacoesHistorico().then(updateHistoricoCountBadge);
    }

    showToast('Avaliação cutânea salva com sucesso!');
  });

  async function renderAvaliacoesHistorico(){
    const container = document.getElementById('avaliacoesHistoricoContainer');
    container.innerHTML = '';
    if(!isPacienteReal(currentPatient)) return;

    const { data, error } = await supabaseClient
      .from('avaliacoes_cutaneas')
      .select('*')
      .eq('paciente_id', currentPatient.id)
      .order('data_avaliacao', { ascending: false });

    if(error || !data || data.length === 0) return;

    data.forEach(av => {
      const dt = new Date(av.data_avaliacao);
      const dataFormatada = `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`;
      const ole = av.oleosidade || {};
      const acne = av.acne || {};
      const rosacea = av.rosacea || {};
      const discromias = av.discromias || {};
      const olheiras = av.olheiras || {};

      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = `
        <summary>
          <div class="historico-entry-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </div>
          <div>
            <div class="historico-entry-title">Avaliação Cutânea</div>
            <div class="historico-entry-date">${dataFormatada}</div>
          </div>
          <div class="historico-entry-spacer"></div>
          <svg class="historico-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div class="historico-entry-body">
          <div class="toggle-subtitle">Classificação Estrutural</div>
          <div class="rotina-summary-item">Fototipo (Fitzpatrick): ${av.fitzpatrick || '—'}</div>
          <div class="rotina-summary-item">Sistema Baumann: ${av.baumann || '—'}</div>
          <div class="rotina-summary-item">Escala de Glogau: ${av.glogau || '—'}</div>
          <div class="toggle-subtitle">Hidratação</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${av.hidratacao || '—'}</div>
          <div class="toggle-subtitle">Integridade e Sensibilidade</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${(av.integridade || []).join(', ') || 'Nenhum item marcado.'}</div>
          <div class="toggle-subtitle">Textura e Poros</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">Textura: ${av.textura || '—'} · Poros: ${av.poros || '—'}</div>
          <div class="toggle-subtitle">Oleosidade</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${ole.presente ? `Áreas: ${(ole.areas||[]).join(', ') || '—'} · Intensidade: ${ole.intensidade || '—'}` : 'Não relatada'}</div>
          <div class="toggle-subtitle">Acne</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${acne.presente ? `Grau: ${acne.grau || '—'} · Lesões: ${(acne.licoes||[]).join(', ') || '—'}` : 'Não relatada'}</div>
          <div class="toggle-subtitle">Rosácea</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${rosacea.presente ? `Subtipo: ${rosacea.subtipo || '—'}` : 'Não relatada'}</div>
          <div class="toggle-subtitle">Discromias</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${discromias.presente ? (discromias.tipos||[]).join(', ') || '—' : 'Não relatadas'}</div>
          <div class="toggle-subtitle">Olheiras</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${olheiras.presente ? `Tipo: ${olheiras.tipo || '—'}` : 'Não relatadas'}</div>
          ${av.observacoes ? `<div class="toggle-subtitle">Observações Clínicas</div><div class="rotina-summary-item" style="border:none;">${av.observacoes}</div>` : ''}
        </div>
      `;
      container.appendChild(details);
    });
  }

  /* ================= FOTOS DE EVOLUÇÃO MODULE ================= */
  function resizeImageFile(file, maxSize){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > h && w > maxSize){ h = Math.round(h * maxSize / w); w = maxSize; }
          else if(h > maxSize){ w = Math.round(w * maxSize / h); h = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Igual ao resizeImageFile, mas devolve um Blob (usado no upload real pro Storage)
  function resizeImageFileToBlob(file, maxSize){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > h && w > maxSize){ h = Math.round(h * maxSize / w); w = maxSize; }
          else if(h > maxSize){ w = Math.round(w * maxSize / h); h = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if(blob) resolve(blob); else reject(new Error('Falha ao gerar imagem'));
          }, 'image/jpeg', 0.82);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const fotosEvolucaoDemo = []; // fallback local para pacientes de demonstração

  document.getElementById('btnAdicionarFotoEvolucao').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }
    const fileInput = document.getElementById('fotoEvolucaoInput');
    const file = fileInput.files[0];
    if(!file){ showToast('Selecione uma foto primeiro.'); return; }

    const dataFoto = document.getElementById('fotoEvolucaoData').value || new Date().toISOString().slice(0,10);
    const etiqueta = document.getElementById('fotoEvolucaoEtiqueta').value.trim();
    const observacoes = document.getElementById('fotoEvolucaoObs').value.trim();

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }

      // Paciente real: a foto vai pro Supabase Storage (bucket fotos-evolucao),
      // não fica mais salva em base64 dentro da tabela.
      let blob;
      try {
        blob = await resizeImageFileToBlob(file, 900);
      } catch(e) {
        showToast('Não foi possível processar a imagem.');
        return;
      }

      const fotoPath = `${userData.user.id}/${currentPatient.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabaseClient.storage
        .from('fotos-evolucao')
        .upload(fotoPath, blob, { contentType: 'image/jpeg' });
      if(uploadError){ showToast('Erro ao enviar a foto: ' + uploadError.message); return; }

      const { error } = await supabaseClient.from('fotos_evolucao').insert({
        paciente_id: currentPatient.id,
        profissional_id: userData.user.id,
        data_foto: dataFoto,
        etiqueta: etiqueta || null,
        observacoes: observacoes || null,
        foto_path: fotoPath,
      });
      if(error){
        // se salvar a linha falhar, remove o arquivo órfão do Storage
        await supabaseClient.storage.from('fotos-evolucao').remove([fotoPath]);
        showToast('Erro ao salvar: ' + error.message);
        return;
      }
    } else {
      // Paciente de demonstração: continua só em memória, sem ir pro banco/Storage
      let fotoDataUrl;
      try {
        fotoDataUrl = await resizeImageFile(file, 900);
      } catch(e) {
        showToast('Não foi possível processar a imagem.');
        return;
      }
      fotosEvolucaoDemo.push({ id: 'demo-' + Date.now(), data_foto: dataFoto, etiqueta, observacoes, foto_url: fotoDataUrl });
    }

    fileInput.value = '';
    document.getElementById('fotoEvolucaoEtiqueta').value = '';
    document.getElementById('fotoEvolucaoObs').value = '';
    showToast('Foto de evolução adicionada!');
    renderFotosEvolucao();
  });

  async function renderFotosEvolucao(){
    const grid = document.getElementById('fotosEvolucaoGrid');
    const vazio = document.getElementById('fotosEvolucaoVazio');
    grid.innerHTML = '';
    if(!currentPatient){ vazio.style.display = 'block'; return; }

    let fotos = [];
    if(isPacienteReal(currentPatient)){
      const { data, error } = await supabaseClient
        .from('fotos_evolucao')
        .select('*')
        .eq('paciente_id', currentPatient.id)
        .order('data_foto', { ascending: false });
      if(!error && data){
        // Bucket é privado: gera uma URL assinada (temporária) pra cada foto na hora de exibir
        fotos = await Promise.all(data.map(async (f) => {
          if(f.foto_path){
            const { data: signed } = await supabaseClient.storage
              .from('fotos-evolucao')
              .createSignedUrl(f.foto_path, 3600);
            return { ...f, foto_url: signed ? signed.signedUrl : '' };
          }
          // compatibilidade com fotos antigas que ainda estejam em base64
          return { ...f, foto_url: f.foto_base64 || '' };
        }));
      }
    } else {
      fotos = fotosEvolucaoDemo.slice().sort((a,b) => b.data_foto.localeCompare(a.data_foto));
    }

    vazio.style.display = fotos.length === 0 ? 'block' : 'none';

    fotos.forEach(f => {
      const dt = new Date(f.data_foto + 'T00:00:00');
      const dataFormatada = `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`;
      const card = document.createElement('div');
      card.className = 'foto-evolucao-card';
      card.innerHTML = `
        <button class="foto-evolucao-remove" title="Remover">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img src="${f.foto_url}" alt="Foto de evolução">
        <div class="foto-evolucao-card-info">
          <div class="foto-evolucao-card-data">${dataFormatada}</div>
          ${f.etiqueta ? `<div class="foto-evolucao-card-etiqueta">${f.etiqueta}</div>` : ''}
        </div>
      `;
      card.querySelector('img').addEventListener('click', () => openFotoEvolucaoLightbox(f, dataFormatada));
      card.querySelector('.foto-evolucao-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(isPacienteReal(currentPatient)){
          if(f.foto_path){
            await supabaseClient.storage.from('fotos-evolucao').remove([f.foto_path]);
          }
          await supabaseClient.from('fotos_evolucao').delete().eq('id', f.id);
        } else {
          const idx = fotosEvolucaoDemo.findIndex(x => x.id === f.id);
          if(idx > -1) fotosEvolucaoDemo.splice(idx, 1);
        }
        renderFotosEvolucao();
      });
      grid.appendChild(card);
    });
  }

  function openFotoEvolucaoLightbox(f, dataFormatada){
    const box = document.createElement('div');
    box.className = 'foto-evolucao-lightbox';
    box.innerHTML = `
      <button class="foto-evolucao-lightbox-close">&times;</button>
      <img src="${f.foto_url}" alt="Foto de evolução">
      <div class="foto-evolucao-lightbox-info">
        <div style="font-weight:700;">${dataFormatada}${f.etiqueta ? ' · ' + f.etiqueta : ''}</div>
        ${f.observacoes ? `<div style="margin-top:4px; opacity:.85; max-width:500px;">${f.observacoes}</div>` : ''}
      </div>
    `;
    box.addEventListener('click', (e) => { if(e.target === box) box.remove(); });
    box.querySelector('.foto-evolucao-lightbox-close').addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }
