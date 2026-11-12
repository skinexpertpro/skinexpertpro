/* Skin Expert Pro — LGPD/RGPD: exportar e apagar os dados da paciente.
   Arquivo 15 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= LGPD — DIREITOS DA PACIENTE (exportar e apagar os dados) ================= */
  const LGPD_OCULTOS = new Set(['id', 'profissional_id', 'paciente_id', 'pacienteId', 'token', 'confirmacao_token', 'foto_path', 'foto_base64',
    'foto_url', 'agendamento_id', 'agendamentoId', 'google_event_id', 'comanda_id', 'conta_id', 'movimentoId', 'origem', 'duracao_minutos', 'tipo']);
  const LGPD_ROTULOS = {
    nome: 'Nome', email: 'E-mail', telefone_codigo: 'Código do país', telefone_numero: 'Telefone', data_nascimento: 'Data de nascimento',
    pais: 'País', status: 'Status', genero: 'Gênero', created_at: 'Registrado em', updated_at: 'Atualizado em',
    principal_queixa: 'Queixa principal', tratamentos_anteriores: 'Tratamentos anteriores', autopercepcao: 'Autopercepção da pele',
    integrativa: 'Avaliação integrativa', sistemica: 'Saúde', estilo_vida: 'Estilo de vida', skincare: 'Skincare', investimento: 'Investimento',
    observacoes: 'Observações', respondida_em: 'Respondida em', consentimento_em: 'Autorização dada em', consentimento_versao: 'Versão da autorização',
    consentimento_texto: 'Texto autorizado', confirmada_em: 'Conferida pela paciente em', fitzpatrick: 'Fototipo (Fitzpatrick)', baumann: 'Baumann',
    glogau: 'Glogau', hidratacao: 'Hidratação', integridade: 'Integridade', textura: 'Textura', poros: 'Poros', oleosidade: 'Oleosidade', acne: 'Acne',
    rosacea: 'Rosácea', discromias: 'Discromias', olheiras: 'Olheiras', data_avaliacao: 'Data da avaliação', objetivo: 'Objetivo',
    duracao_dias: 'Duração (dias)', rotina_manha: 'Rotina da manhã', rotina_noite: 'Rotina da noite', data_foto: 'Data da foto', etiqueta: 'Etiqueta',
    data: 'Data', hora: 'Hora', duracao_min: 'Duração (min)', servico_nome: 'Serviço', motivo: 'Motivo', codigo: 'Código', cliente: 'Cliente',
    servicos: 'Serviços', valor: 'Valor', saldo: 'Saldo', pagamento: 'Forma de pagamento', itens: 'Itens', pagamentos: 'Pagamentos',
    desconto: 'Desconto', subtotal: 'Subtotal', moeda: 'Moeda', presente: 'Presente', areas: 'Áreas', intensidade: 'Intensidade', grau: 'Grau',
    licoes: 'Lesões', subtipo: 'Subtipo', tipos: 'Tipos', preco: 'Preço', forma: 'Forma', em: 'Em', texto: 'Texto', modelo: 'Mensagem',
    paciente: 'Paciente', paciente_nome: 'Paciente', respondida: 'Respondida', manha: 'Manhã', noite: 'Noite', produto: 'Produto', passo: 'Passo',
  };
  function lgpdRotulo(k){
    if(LGPD_ROTULOS[k]) return LGPD_ROTULOS[k];
    if(typeof ROTULOS_ANAMNESE !== 'undefined' && ROTULOS_ANAMNESE[k]) return ROTULOS_ANAMNESE[k];
    const t = String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function lgpdData(v){
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if(!m) return null;
    if(!m[4]) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(v);
    if(isNaN(d)) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function lgpdVazio(v){
    if(v == null || v === '') return true;
    if(Array.isArray(v)) return v.every(lgpdVazio);
    if(typeof v === 'object') return Object.keys(v).filter(k => !LGPD_OCULTOS.has(k)).every(k => lgpdVazio(v[k]));
    return /^(selecionar|selecione|—)$/i.test(String(v).trim());
  }
  // Valor → HTML legível (listas, sub-campos, datas, Sim/Não)
  function lgpdValorHTML(v){
    if(typeof v === 'boolean') return v ? 'Sim' : 'Não';
    if(Array.isArray(v)){
      const itens = v.filter(x => !lgpdVazio(x));
      if(itens.every(x => typeof x !== 'object')) return escHTML(itens.join(', '));
      return '<ul>' + itens.map(x => '<li>' + lgpdValorHTML(x) + '</li>').join('') + '</ul>';
    }
    if(v && typeof v === 'object'){
      const ks = Object.keys(v).filter(k => !LGPD_OCULTOS.has(k) && !lgpdVazio(v[k]));
      return ks.map(k => `<span class="sub"><b>${escHTML(lgpdRotulo(k))}:</b> ${lgpdValorHTML(v[k])}</span>`).join(' ');
    }
    if(typeof v === 'string' && /^\s*[\[{]/.test(v)){ try{ return lgpdValorHTML(JSON.parse(v)); }catch(e){} }
    const d = typeof v === 'string' ? lgpdData(v) : null;
    return escHTML(d || String(v)).replace(/\n/g, '<br>');
  }
  function lgpdCamposHTML(obj, pular){
    const ks = Object.keys(obj || {}).filter(k => !LGPD_OCULTOS.has(k) && !(pular || []).includes(k) && !lgpdVazio(obj[k]));
    if(!ks.length) return '<p class="vazio">Sem informações preenchidas.</p>';
    return '<table>' + ks.map(k => `<tr><th>${escHTML(lgpdRotulo(k))}</th><td>${lgpdValorHTML(obj[k])}</td></tr>`).join('') + '</table>';
  }
  function lgpdSlug(t){ return String(t || 'paciente').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'paciente'; }
  function lgpdBaixar(nomeArquivo, conteudo, tipo){
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function lgpdBlobParaDataUrl(blob){
    return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(''); r.readAsDataURL(blob); });
  }

  // Junta TUDO o que existe sobre a paciente. avisos = partes que não puderam ser lidas.
  async function coletarDadosPaciente(p, opcoes){
    opcoes = opcoes || {};
    const out = { geradoEm: new Date().toISOString(), paciente: null, anamneses: [], avaliacoes: [], planos: [], fotos: [],
                  atendimentos: [], comandas: [], mensagens: [], lembretes: [], especificas: [], avisos: [] };
    const pid = String(p.id);
    out.mensagens = (mensagensHistorico || []).filter(h => h.pacienteId != null ? String(h.pacienteId) === pid : h.paciente === p.name)
      .map(h => ({ em: h.em, modelo: (() => { try{ return modeloPorId(h.modelo).titulo; }catch(e){ return h.modelo; } })(), texto: h.texto }));
    out.lembretes = ((lembretesEstado && lembretesEstado.manuais) || []).filter(l => String(l.pacienteId) === pid)
      .map(l => ({ data: l.data, texto: l.texto }));

    if(isPacienteReal(p)){
      const ler = async (rotulo, tabela, filtro) => {
        try{
          const { data, error } = await filtro(supabaseClient.from(tabela).select('*'));
          if(error){ out.avisos.push(rotulo + ' (' + error.message + ')'); return []; }
          return data || [];
        }catch(e){ out.avisos.push(rotulo); return []; }
      };
      const [cad, an, av, pl, fo, ag, co, esp] = await Promise.all([
        ler('cadastro', 'pacientes', q => q.eq('id', p.id)),
        ler('fichas de anamnese', 'anamneses', q => q.eq('paciente_id', p.id)),
        ler('avaliações', 'avaliacoes_cutaneas', q => q.eq('paciente_id', p.id)),
        ler('planos de skincare', 'planos_skincare', q => q.eq('paciente_id', p.id)),
        ler('fotos', 'fotos_evolucao', q => q.eq('paciente_id', p.id)),
        ler('atendimentos', 'agendamentos', q => q.eq('paciente_id', p.id)),
        ler('comandas', 'comandas', q => q.eq('paciente_id', pid)),
        ler('anamneses específicas', 'anamneses_especificas', q => q.eq('paciente_id', p.id)),
      ]);
      out.paciente = cad[0] || null;
      out.anamneses = an; out.avaliacoes = av; out.planos = pl; out.fotos = fo; out.atendimentos = ag;
      // tabela nova: se ainda não existir no banco, não conta como falha
      out.especificas = esp; out.avisos = out.avisos.filter(a => !/^anamneses específicas \(.*(does not exist|schema cache|anamneses_especificas)/i.test(a));
      const idsAg = ag.map(a => a.id).filter(Boolean);
      let co2 = [];
      if(idsAg.length) co2 = await ler('comandas da agenda', 'comandas', q => q.in('agendamento_id', idsAg));
      const vistas = new Set();
      out.comandas = co.concat(co2).filter(c => !vistas.has(c.id) && vistas.add(c.id));
      if(!out.paciente && !out.avisos.length) out.avisos.push('cadastro não encontrado');

      if(opcoes.comFotos){
        await Promise.all(out.fotos.map(async f => {
          try{
            if(f.foto_path){
              const { data: blob, error } = await supabaseClient.storage.from('fotos-evolucao').download(f.foto_path);
              if(error || !blob) throw error || new Error('sem arquivo');
              f._img = await lgpdBlobParaDataUrl(blob);
            } else if(f.foto_base64){ f._img = f.foto_base64; }
          }catch(e){ out.avisos.push('foto de ' + (lgpdData(f.data_foto) || 'data desconhecida')); }
        }));
      }
    } else {
      // Paciente de demonstração: só o que está na memória
      out.paciente = { nome: p.name, email: p.email, telefone_codigo: p.phoneCode, telefone_numero: p.phoneNumber,
                       data_nascimento: p.dataNascimento, pais: p.pais, status: p.status, foto_url: p.foto_url };
      out.anamneses = (demoAnamnesesPorPaciente[p.id] || []).slice();
      Object.keys(demoEspecificas[p.id] || {}).forEach(t => (demoEspecificas[p.id][t] || []).forEach(r => out.especificas.push({ ...r, tipo: t })));
      Object.keys(appointments || {}).forEach(key => (appointments[key] || []).forEach(a => {
        if(a.type !== 'block' && (String(a.pacienteId) === pid || (!a.pacienteId && a.label === p.name)))
          out.atendimentos.push({ id: a.id, data: key, hora: a.time, duracao_min: a.duration, servico_nome: a.servico, observacoes: a.observacoes, status: a.status });
      }));
      out.comandas = (comandasData || []).filter(c => String(c.pacienteId) === pid || (!c.pacienteId && c.cliente === p.name))
        .map(c => ({ id: c.id, codigo: c.codigo, data: c.dataISO, cliente: c.cliente, itens: c.itens, pagamentos: c.pagamentos,
                     valor: c.valor, saldo: c.saldo, status: c.status, agendamento_id: c.agendamentoId }));
    }
    out.atendimentos.sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.hora || '').localeCompare(String(b.hora || '')));
    return out;
  }
  function comandaTemPagamento(c){
    const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
    return pags.some(x => Number(x && x.valor) > 0) || (Number(c.valor) || 0) - (Number(c.saldo) || 0) > 0.004;
  }

  /* ---------- Relatório legível (HTML) ---------- */
  function relatorioPacienteHTML(d, p){
    const prof = (perfilProfissional && perfilProfissional.nome) || '';
    const nome = (d.paciente && d.paciente.nome) || p.name || 'Paciente';
    const agora = new Date();
    const sec = (titulo, n, corpo) => `<section><h2>${escHTML(titulo)}${n != null ? ` <small>(${n})</small>` : ''}</h2>${corpo}</section>`;
    const nada = '<p class="vazio">Nenhum registro.</p>';
    const fotoPerfil = d.paciente && /^data:image\//.test(d.paciente.foto_url || '') ? `<img class="perfil" src="${escHTML(d.paciente.foto_url)}" alt="">` : '';
    const lista = (arr, titulo, campoData, pular) => arr.length ? arr.map((x, i) =>
      `<div class="bloco"><h3>${escHTML(titulo)} ${arr.length > 1 ? i + 1 : ''}${x[campoData] || x.created_at ? ' — ' + escHTML(lgpdData(x[campoData] || x.created_at) || '') : ''}</h3>${lgpdCamposHTML(x, pular)}</div>`).join('') : nada;
    const fotos = d.fotos.length ? '<div class="fotos">' + d.fotos.map(f =>
      `<figure>${f._img ? `<img src="${escHTML(f._img)}" alt="">` : '<div class="semfoto">foto não disponível</div>'}<figcaption>${escHTML(lgpdData(f.data_foto) || '')}${f.etiqueta ? ' · ' + escHTML(f.etiqueta) : ''}${f.observacoes ? '<br>' + escHTML(f.observacoes) : ''}</figcaption></figure>`).join('') + '</div>' : nada;
    const tabela = (cab, linhas) => linhas.length ? `<table class="grade"><tr>${cab.map(c => `<th>${escHTML(c)}</th>`).join('')}</tr>${linhas.map(l => `<tr>${l.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>` : nada;
    const atend = tabela(['Data', 'Hora', 'Serviço', 'Situação', 'Observações'], d.atendimentos.map(a => [
      escHTML(lgpdData(a.data) || ''), escHTML(String(a.hora || '').slice(0, 5)), escHTML(a.servico_nome || '—'),
      escHTML(a.status === 'cancelado' ? 'Cancelado' : (a.status || 'Agendado')), escHTML(a.observacoes || '')]));
    const fmt = (v, m) => { try{ return escHTML(fmtMoeda(Number(v) || 0, m)); }catch(e){ return escHTML(String(v)); } };
    const comandas = tabela(['Data', 'Código', 'Itens', 'Valor', 'Pago', 'Situação'], d.comandas.map(c => {
      const itens = Array.isArray(c.itens) ? c.itens.map(i => i.nome).join(', ') : (c.servicos || '');
      return [escHTML(lgpdData(c.data) || ''), escHTML(c.codigo || ''), escHTML(itens), fmt(c.valor, c.moeda),
              fmt((Number(c.valor) || 0) - (Number(c.saldo) || 0), c.moeda), escHTML(c.status || '')];
    }));
    const msgs = tabela(['Enviada em', 'Mensagem', 'Texto'], d.mensagens.map(m => [escHTML(lgpdData(m.em) || ''), escHTML(m.modelo || ''), escHTML(m.texto || '').replace(/\n/g, '<br>')]));
    const lemb = tabela(['Data', 'Lembrete'], d.lembretes.map(l => [escHTML(lgpdData(l.data) || ''), escHTML(l.texto || '')]));
    return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dados de ${escHTML(nome)}</title>
<style>
  body{ font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:#1f2a30; background:#fff; max-width:860px; margin:0 auto; padding:28px 18px 60px; line-height:1.45; }
  header{ display:flex; gap:16px; align-items:center; border-bottom:2px solid #c9a46a; padding-bottom:14px; margin-bottom:8px; }
  h1{ font-size:22px; margin:0 0 4px; } h2{ font-size:17px; margin:28px 0 10px; color:#3a2f1e; } h2 small{ color:#888; font-weight:400; }
  h3{ font-size:14px; margin:14px 0 6px; } .meta{ font-size:13px; color:#555; margin:0; }
  .perfil{ width:64px; height:64px; border-radius:50%; object-fit:cover; }
  table{ width:100%; border-collapse:collapse; font-size:13px; } th, td{ text-align:left; vertical-align:top; padding:6px 8px; border-bottom:1px solid #eee; }
  table:not(.grade) th{ width:34%; color:#555; font-weight:600; } .grade th{ background:#f6f3ee; }
  td ul{ margin:0; padding-left:18px; } .sub{ display:inline-block; margin-right:10px; }
  .bloco{ border:1px solid #eee; border-radius:10px; padding:4px 12px 10px; margin-bottom:12px; break-inside:avoid; }
  .fotos{ display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:12px; }
  figure{ margin:0; break-inside:avoid; } figure img{ width:100%; border-radius:8px; display:block; } figcaption{ font-size:12px; color:#555; margin-top:4px; }
  .semfoto{ height:120px; background:#f3f3f3; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#888; }
  .vazio{ color:#888; font-size:13px; margin:4px 0; } .aviso{ background:#fff7e6; border:1px solid #f0d9a8; border-radius:8px; padding:8px 12px; font-size:13px; }
  .rodape{ margin-top:36px; font-size:12px; color:#666; border-top:1px solid #eee; padding-top:12px; }
  .imprimir{ position:fixed; right:16px; bottom:16px; background:#1f2a30; color:#fff; border:none; border-radius:10px; padding:11px 16px; font-weight:700; cursor:pointer; }
  @media print{ .imprimir{ display:none; } body{ padding:0; } }
</style></head><body>
<header>${fotoPerfil}<div><h1>Dados pessoais de ${escHTML(nome)}</h1>
<p class="meta">Gerado em ${escHTML(agora.toLocaleDateString('pt-BR'))} às ${escHTML(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}${prof ? ' por ' + escHTML(prof) : ''} · Skin Expert Pro</p></div></header>
<p class="meta">Este documento reúne todos os dados desta paciente guardados no sistema, em atendimento ao direito de acesso aos próprios dados (LGPD, art. 18; RGPD, art. 15).</p>
${d.avisos.length ? `<p class="aviso">Atenção: algumas partes não puderam ser lidas e podem estar incompletas: ${escHTML(d.avisos.join('; '))}.</p>` : ''}
${sec('Cadastro', null, d.paciente ? lgpdCamposHTML(d.paciente) : nada)}
${sec('Fichas de anamnese', d.anamneses.length, lista(d.anamneses, 'Ficha', 'respondida_em'))}
${sec('Avaliações cutâneas', d.avaliacoes.length, lista(d.avaliacoes, 'Avaliação', 'data_avaliacao'))}
${sec('Planos de skincare', d.planos.length, lista(d.planos, 'Plano', 'created_at'))}
${d.especificas.length ? sec('Anamneses específicas', d.especificas.length, d.especificas.map(r => `<div class="bloco"><h3>${escHTML((ESPECIALIDADES[r.tipo] || {}).titulo || r.tipo)} — ${escHTML(lgpdData(r.created_at) || '')}</h3><table>${espLinhas(r.tipo, r.dados || {}).map(([k, v]) => `<tr><th>${escHTML(k)}</th><td>${escHTML(v)}</td></tr>`).join('')}</table></div>`).join('')) : ''}
${sec('Fotos de evolução', d.fotos.length, fotos)}
${sec('Atendimentos', d.atendimentos.length, atend)}
${sec('Comandas', d.comandas.length, comandas)}
${sec('Mensagens enviadas pelo app', d.mensagens.length, msgs)}
${d.lembretes.length ? sec('Lembretes', d.lembretes.length, lemb) : ''}
<p class="rodape">Contém dados pessoais e de saúde. Guarde em local seguro e compartilhe somente com a própria paciente.</p>
<button class="imprimir" onclick="window.print()">Imprimir / salvar em PDF</button>
</body></html>`;
  }
  function jsonPacienteLimpo(d){
    const limpo = JSON.parse(JSON.stringify(d, (k, v) => (k === '_img' || k === 'token' || k === 'confirmacao_token' || k === 'foto_base64') ? undefined : v));
    return JSON.stringify({ formato: 'Skin Expert Pro — dados da paciente', versao: 1, ...limpo }, null, 2);
  }

  /* ---------- Janela "Exportar dados" ---------- */
  const modalExportarOverlay = document.getElementById('modalExportarOverlay');
  let exportarPaciente = null;
  function abrirExportarDados(p){
    p = p || currentPatient;
    if(!p){ showToast('Nenhuma paciente selecionada.'); return; }
    exportarPaciente = p;
    document.getElementById('expTitulo').textContent = 'Exportar dados de ' + (p.name || 'paciente');
    document.getElementById('expStatus').textContent = '';
    modalExportarOverlay.classList.add('open');
  }
  function fecharExportar(){ modalExportarOverlay.classList.remove('open'); }
  async function exportarDadosPaciente(formato){
    const p = exportarPaciente;
    if(!p) return;
    const botoes = [document.getElementById('expRelatorio'), document.getElementById('expJson')];
    const status = document.getElementById('expStatus');
    botoes.forEach(b => b.disabled = true);
    status.textContent = formato === 'html' ? 'Juntando os dados e as fotos…' : 'Juntando os dados…';
    try{
      const d = await coletarDadosPaciente(p, { comFotos: formato === 'html' });
      const base = 'dados-' + lgpdSlug(p.name) + '-' + dateKey(new Date());
      if(formato === 'html') lgpdBaixar(base + '.html', relatorioPacienteHTML(d, p), 'text/html;charset=utf-8');
      else lgpdBaixar(base + '.json', jsonPacienteLimpo(d), 'application/json;charset=utf-8');
      status.textContent = d.avisos.length
        ? 'Baixado, mas incompleto. Não foi possível ler: ' + d.avisos.join('; ') + '.'
        : 'Pronto! O arquivo foi baixado.';
    }catch(e){
      console.warn('Exportar:', e);
      status.textContent = 'Não foi possível gerar o arquivo: ' + (e && e.message || e);
    } finally {
      botoes.forEach(b => b.disabled = false);
    }
  }
  document.getElementById('btnExportarDadosPaciente').addEventListener('click', () => abrirExportarDados());
  document.getElementById('expRelatorio').addEventListener('click', () => exportarDadosPaciente('html'));
  document.getElementById('expJson').addEventListener('click', () => exportarDadosPaciente('json'));
  document.getElementById('expFechar').addEventListener('click', fecharExportar);
  modalExportarOverlay.addEventListener('click', (e) => { if(e.target === modalExportarOverlay) fecharExportar(); });

  /* ---------- Janela "Excluir cadastro e dados" ---------- */
  const modalApagarPacOverlay = document.getElementById('modalApagarPacOverlay');
  let apagarCtx = null; // { p, dados }
  const apgConfirma = document.getElementById('apgConfirma');
  const apgConfirmar = document.getElementById('apgConfirmar');
  function fecharApagarPac(){ modalApagarPacOverlay.classList.remove('open'); apagarCtx = null; }
  function plural(n, um, varios){ return n + ' ' + (n === 1 ? um : varios); }
  async function abrirApagarPaciente(){
    const p = currentPatient;
    if(!p){ showToast('Nenhuma paciente selecionada.'); return; }
    apagarCtx = { p, dados: null };
    document.getElementById('apgTitulo').textContent = 'Excluir ' + (p.name || 'paciente');
    document.getElementById('apgCorpo').innerHTML = '<p class="lgpd-texto">Verificando os dados da paciente…</p>';
    document.getElementById('apgConfirmaWrap').style.display = 'none';
    apgConfirma.value = ''; apgConfirmar.disabled = true; apgConfirmar.textContent = 'Apagar definitivamente';
    modalApagarPacOverlay.classList.add('open');

    const d = await coletarDadosPaciente(p);
    if(!apagarCtx || apagarCtx.p !== p) return; // fechou enquanto carregava
    apagarCtx.dados = d;
    const hoje = dateKey(new Date());
    const futuros = d.atendimentos.filter(a => String(a.data || '') >= hoje).length;
    const pagas = d.comandas.filter(comandaTemPagamento).length;
    const semPag = d.comandas.length - pagas;
    const apaga = [
      'Cadastro e foto de perfil',
      d.anamneses.length && plural(d.anamneses.length, 'ficha de anamnese', 'fichas de anamnese'),
      d.avaliacoes.length && plural(d.avaliacoes.length, 'avaliação cutânea', 'avaliações cutâneas'),
      d.especificas.length && plural(d.especificas.length, 'anamnese específica (harmonização, tricologia ou corporal)', 'anamneses específicas (harmonização, tricologia ou corporal)'),
      d.planos.length && plural(d.planos.length, 'plano de skincare', 'planos de skincare'),
      d.fotos.length && plural(d.fotos.length, 'foto de evolução', 'fotos de evolução'),
      d.atendimentos.length && (plural(d.atendimentos.length, 'atendimento da agenda', 'atendimentos da agenda') +
        (futuros ? ` (${futuros} ainda por vir — saem também do Google Agenda)` : '')),
      semPag && plural(semPag, 'comanda sem pagamento', 'comandas sem pagamento'),
      (d.mensagens.length || d.lembretes.length) && 'Histórico de mensagens e lembretes dela',
    ].filter(Boolean);
    document.getElementById('apgCorpo').innerHTML = `
      ${d.avisos.length ? `<p class="lgpd-texto" style="color:#a1561b;">Não consegui conferir tudo (${escHTML(d.avisos.join('; '))}). Mesmo assim, tudo o que for dela será apagado.</p>` : ''}
      <div class="lgpd-sub">Será apagado para sempre:</div>
      <ul class="lgpd-lista apaga">${apaga.map(t => `<li>${escHTML(t)}</li>`).join('')}</ul>
      ${pagas ? `<div class="lgpd-sub">Fica no Financeiro, sem o nome dela:</div>
      <ul class="lgpd-lista mantem"><li>${escHTML(plural(pagas, 'comanda com pagamento', 'comandas com pagamento'))} e os lançamentos do Controle Financeiro. Os valores continuam nos relatórios, mas aparecem como “Paciente removida”. A lei permite e exige guardar os registros financeiros.</li></ul>` : ''}
      <p class="lgpd-texto">Se a paciente pediu uma cópia dos dados, <a href="#" id="apgExportar">exporte antes de apagar</a>. Depois de apagar não tem como recuperar.</p>`;
    const linkExp = document.getElementById('apgExportar');
    if(linkExp) linkExp.addEventListener('click', (e) => { e.preventDefault(); abrirExportarDados(p); });
    document.getElementById('apgConfirmaWrap').style.display = 'block';
    try{ apgConfirma.focus(); }catch(e){}
  }
  apgConfirma.addEventListener('input', () => { apgConfirmar.disabled = !(apagarCtx && apagarCtx.dados) || apgConfirma.value.trim().toUpperCase() !== 'APAGAR'; });
  apgConfirma.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !apgConfirmar.disabled) apgConfirmar.click(); });

  async function apagarDadosPaciente(){
    if(!apagarCtx || !apagarCtx.dados) return;
    const { p, dados } = apagarCtx;
    const pid = String(p.id);
    apgConfirmar.disabled = true; apgConfirmar.textContent = 'Apagando…';
    let avisoFinal = '';

    if(isPacienteReal(p)){
      const usuario = await usuarioParaSalvar();
      if(!usuario){ apgConfirmar.textContent = 'Apagar definitivamente'; apgConfirmar.disabled = false; return; }
      const { data: res, error } = await supabaseClient.rpc('apagar_dados_paciente', { p_paciente: pid });
      if(error){
        const falta = /apagar_dados_paciente|function|schema cache|PGRST202/i.test((error.message || '') + ' ' + (error.code || ''));
        showToast(falta ? 'Falta rodar o arquivo lgpd-apagar-paciente.sql no Supabase. Nada foi apagado.' : 'Nada foi apagado: ' + error.message);
        apgConfirmar.textContent = 'Apagar definitivamente'; apgConfirmar.disabled = false;
        return;
      }
      // Arquivos das fotos (Storage): os registrados + qualquer um que tenha ficado na pasta dela
      const caminhos = new Set(dados.fotos.map(f => f.foto_path).filter(Boolean));
      try{
        const pasta = `${usuario.id}/${pid}`;
        const { data: lista } = await supabaseClient.storage.from('fotos-evolucao').list(pasta, { limit: 1000 });
        (lista || []).forEach(o => { if(o && o.name) caminhos.add(`${pasta}/${o.name}`); });
      }catch(e){}
      if(caminhos.size){
        try{
          const { error: e2 } = await supabaseClient.storage.from('fotos-evolucao').remove([...caminhos]);
          if(e2) avisoFinal = ' Atenção: as fotos não puderam ser apagadas (' + e2.message + ').';
        }catch(e){ avisoFinal = ' Atenção: as fotos não puderam ser apagadas.'; }
      }
      ((res && res.google_event_ids) || []).forEach(gid => {
        supabaseClient.functions.invoke('cancelar-google-agenda', { body: { googleEventId: gid } }).catch(() => {});
      });
    } else {
      // Demonstração: só na memória
      const idx = patients.findIndex(x => String(x.id) === pid);
      if(idx !== -1) patients.splice(idx, 1);
      delete demoAnamnesesPorPaciente[p.id];
      delete demoEspecificas[p.id];
      Object.keys(appointments || {}).forEach(key => {
        appointments[key] = (appointments[key] || []).filter(a => !(a.type !== 'block' && (String(a.pacienteId) === pid || (!a.pacienteId && a.label === p.name))));
      });
      comandasData = (comandasData || []).filter(c => {
        const dela = String(c.pacienteId) === pid || (!c.pacienteId && c.cliente === p.name);
        if(!dela) return true;
        if(!comandaTemPagamento(c)) return false;
        c.cliente = 'Paciente removida'; c.pacienteId = null; c.agendamentoId = null;
        return true;
      });
    }

    // Histórico de mensagens e lembretes dela (ficam nas configurações da profissional)
    const antesMsg = mensagensHistorico.length;
    mensagensHistorico = mensagensHistorico.filter(h => !(h.pacienteId != null ? String(h.pacienteId) === pid : h.paciente === p.name));
    if(mensagensHistorico.length !== antesMsg) salvarConfig('mensagens_historico', mensagensHistorico);
    if(lembretesEstado && Array.isArray(lembretesEstado.manuais)){
      const antesL = lembretesEstado.manuais.length;
      lembretesEstado.manuais = lembretesEstado.manuais.filter(l => String(l.pacienteId) !== pid);
      if(lembretesEstado.manuais.length !== antesL) salvarLembretes();
    }

    fecharApagarPac();
    currentPatient = null;
    if(isPacienteReal(p)){
      await Promise.all([loadPacientesFromSupabase(), loadAgendamentosFromSupabase(), loadComandasFromSupabase(),
        loadMovimentosFromSupabase(), loadContasFromSupabase()].map(x => Promise.resolve(x).catch(e => console.warn(e))));
    } else {
      renderPacientesTable();
      try{ renderCurrentView(); }catch(e){}
      try{ renderComandas(); }catch(e){}
    }
    try{ renderLembretes(); }catch(e){}
    try{ renderCentroMensagens(); }catch(e){}
    showToast('Cadastro e dados de ' + (p.name || 'paciente') + ' apagados.' + avisoFinal);
    document.getElementById('breadcrumbPacientes').click();
  }

  document.getElementById('btnExcluirCadastro').addEventListener('click', abrirApagarPaciente);
  apgConfirmar.addEventListener('click', apagarDadosPaciente);
  document.getElementById('apgCancelar').addEventListener('click', fecharApagarPac);
  modalApagarPacOverlay.addEventListener('click', (e) => { if(e.target === modalApagarPacOverlay) fecharApagarPac(); });
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(modalExportarOverlay.classList.contains('open')) fecharExportar();
    else if(modalApagarPacOverlay.classList.contains('open')) fecharApagarPac();
  });
