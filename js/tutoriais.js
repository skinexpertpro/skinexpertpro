/* Skin Expert Pro — Educacional › Tutoriais (perguntas e respostas).

   COMO EDITAR
   - Cada tutorial é um item da lista TUTORIAIS abaixo: { id, categoria, pergunta, resposta, video }.
   - "resposta" aceita HTML simples: <p>, <ol>, <ul>, <li>, <b>.
   - "video": cole o link do YouTube (ex.: https://www.youtube.com/watch?v=XXXX ou https://youtu.be/XXXX)
     ou do Vimeo. Deixe '' enquanto não houver vídeo: nada aparece no lugar.
   - Para abrir um tutorial de outra tela: abrirTutorial('id-do-tutorial'). */

const TUTORIAIS = [
  /* ---------------- Primeiros passos ---------------- */
  {
    id: 'primeiro-agendamento',
    categoria: 'Primeiros passos',
    pergunta: 'Como faço meu primeiro agendamento?',
    video: '',
    resposta: `
      <ol>
        <li>Abra a <b>Agenda</b> e clique em <b>Novo Atendimento</b>. Se preferir, clique direto num horário livre da grade.</li>
        <li>Em <b>Paciente</b>, digite o nome. Se ela ainda não estiver cadastrada, escolha a opção para adicionar e preencha nome e telefone com o código do país.</li>
        <li>Escolha o <b>serviço</b> (pode ser mais de um), a <b>data</b>, o <b>horário</b> e a <b>duração</b>.</li>
        <li>Se quiser, escreva uma observação. Com <b>Enviar confirmação por WhatsApp</b> marcado, o WhatsApp abre com a mensagem pronta para a paciente.</li>
        <li>Clique em <b>Agendar</b>.</li>
      </ol>
      <p>Para mudar só o horário depois, arraste o atendimento na grade. Para editar ou cancelar, clique nele.</p>`,
  },
  {
    id: 'cadastrar-paciente',
    categoria: 'Primeiros passos',
    pergunta: 'Como cadastro uma paciente?',
    video: '',
    resposta: `
      <ol>
        <li>Abra <b>Pacientes</b> e clique em <b>Novo Paciente</b>.</li>
        <li>Preencha o <b>nome completo</b> e o <b>telefone / WhatsApp</b> com o código do país. Esses dois são obrigatórios.</li>
        <li>Se souber, informe o <b>país de residência</b> e a <b>data de nascimento</b>. O país de residência define a moeda dos preços dessa paciente.</li>
      </ol>
      <p>Depois é só abrir a ficha para completar os dados e preencher a anamnese. Também dá para cadastrar a paciente na hora de marcar, pelo próprio Novo Atendimento.</p>`,
  },
  {
    id: 'horarios-atendimento',
    categoria: 'Primeiros passos',
    pergunta: 'Como configuro meus horários de atendimento?',
    video: '',
    resposta: `
      <ol>
        <li>Abra <b>Meu Negócio</b> › <b>Horários de Atendimento</b> e clique em <b>Novo Horário</b>.</li>
        <li>Dê um nome (por exemplo, "Horário Geral") e informe, para cada dia, a <b>entrada</b> e a <b>saída</b>. O intervalo de almoço é opcional.</li>
        <li>Marque <b>Fechado</b> nos dias em que você não atende.</li>
      </ol>
      <p>A Agenda usa esses horários para abrir no começo do seu dia. Se você estiver num estúdio, as colegas veem riscado o período fora do seu expediente.</p>`,
  },
  {
    id: 'bloquear-horario',
    categoria: 'Primeiros passos',
    pergunta: 'Como bloqueio um horário (almoço, folga, curso)?',
    video: '',
    resposta: `
      <ol>
        <li>Na <b>Agenda</b>, clique em <b>Bloquear Horários</b>.</li>
        <li>Escreva o motivo, se quiser (por exemplo, "Almoço"), e escolha data, horário e duração.</li>
        <li>Salve. O horário fica bloqueado e ninguém marca nele.</li>
      </ol>
      <p>Para tirar o bloqueio, clique nele e escolha <b>Remover bloqueio</b>.</p>`,
  },
  {
    id: 'remarcar-cancelar',
    categoria: 'Primeiros passos',
    pergunta: 'Como remarco ou cancelo um atendimento?',
    video: '',
    resposta: `
      <ul>
        <li><b>Mudar só o horário:</b> arraste o atendimento para o novo horário na grade.</li>
        <li><b>Mudar outros dados:</b> clique no atendimento e escolha <b>Editar</b>.</li>
        <li><b>Cancelar:</b> clique no atendimento e escolha <b>Cancelar atendimento</b>. Ele sai da agenda, mas fica guardado no histórico.</li>
      </ul>`,
  },

  /* ---------------- Trabalhar em parceria ---------------- */
  {
    id: 'estudio-ou-conexao',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Estúdio ou conexão: o que serve para mim?',
    video: '',
    resposta: `
      <p>As duas são formas de trabalhar com outras profissionais. Em qualquer uma, <b>suas clientes, fichas e financeiro continuam só seus</b>. Dá para usar as duas ao mesmo tempo.</p>
      <p><b>Estúdio</b> é para quem atende <b>no mesmo espaço</b>. Por exemplo: você e mais duas profissionais alugam juntas uma sala e precisam organizar quem usa o quê.</p>
      <ul>
        <li>Só a titular paga, no plano Studio. São até 3 profissionais no total.</li>
        <li>Vocês veem a agenda umas das outras, com serviço e horário, mas sem o nome da cliente.</li>
        <li>Tem salas: compartilhada ou separadas. O app não deixa marcar duas pessoas na mesma sala.</li>
        <li>Para entrar, a titular manda o <b>código de convite do estúdio</b>.</li>
      </ul>
      <p><b>Conexão</b> é para parceiras que atendem <b>em lugares diferentes</b>. Por exemplo: você faz limpeza de pele e quer indicar clientes para uma colega de confiança que faz micropigmentação.</p>
      <ul>
        <li>Cada uma paga o próprio plano. Funciona já no Essencial, com até 2 conexões.</li>
        <li>Na Agenda, vocês veem só quando a outra está <b>Ocupada</b>, sem serviço.</li>
        <li>Não tem salas.</li>
        <li>Para conectar, vocês trocam o <b>código de conexão</b> pessoal de cada uma.</li>
      </ul>
      <p>Nos dois casos, vocês podem <b>indicar clientes</b> uma para a outra.</p>`,
  },
  {
    id: 'criar-estudio',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Como crio meu estúdio?',
    video: '',
    resposta: `
      <p>Criar um estúdio faz parte do <b>plano Studio</b>. Quem cria é a titular.</p>
      <ol>
        <li>Abra <b>Meu Negócio</b> › <b>Parcerias</b> e vá em <b>Criar meu estúdio</b>.</li>
        <li>Dê um nome ao estúdio (por exemplo, "Estúdio Glow").</li>
        <li>Escolha como é o espaço: <b>sala compartilhada</b> ou <b>salas separadas</b>. Se forem separadas, dê nome a cada sala (até 3).</li>
        <li>Clique em <b>Criar estúdio</b>. O app gera na hora o código de convite.</li>
      </ol>
      <p>O nome, o tipo de espaço e as salas podem ser mudados depois em <b>Editar estúdio</b>.</p>`,
  },
  {
    id: 'convidar-estudio',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Como convido profissionais para o meu estúdio?',
    video: '',
    resposta: `
      <ol>
        <li>Em <b>Meu Negócio</b> › <b>Parcerias</b>, no cartão do seu estúdio, clique em <b>Copiar mensagem</b>.</li>
        <li>Cole a mensagem no WhatsApp da profissional. Ela já explica o passo a passo e leva o código.</li>
        <li>Ela cria a conta dela e digita o código. Pronto: ela aparece na sua lista de profissionais.</li>
      </ol>
      <p>O código vale por <b>7 dias</b>. Se vencer, ou se você quiser que o código antigo pare de funcionar, clique em <b>Gerar outro código</b>. Quem já entrou continua no estúdio.</p>
      <p>Para tirar alguém, clique em <b>Remover</b>. A conta, as clientes e o financeiro dela continuam com ela.</p>`,
  },
  {
    id: 'entrar-estudio',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Recebi um código de convite. Como entro no estúdio?',
    video: '',
    resposta: `
      <ol>
        <li>Se ainda não tem, crie a sua conta no Skin Expert Pro, com o seu e-mail e a sua senha.</li>
        <li>Abra <b>Meu Negócio</b> › <b>Parcerias</b> e, em <b>Entrar num estúdio</b>, digite o código (formato XXXX-XXXX).</li>
        <li>Clique em <b>Entrar no estúdio</b>.</li>
      </ol>
      <p>O código de convite é diferente do código de conexão: ele vem sempre da titular do estúdio. Você pode participar de até <b>2 estúdios</b>. Para sair, use <b>Sair do estúdio</b> no cartão dele.</p>`,
  },
  {
    id: 'salas',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Sala compartilhada ou salas separadas: qual escolher?',
    video: '',
    resposta: `
      <ul>
        <li><b>Sala compartilhada:</b> o estúdio tem um espaço só. Cabe um atendimento por vez. Na Agenda, aparece "Sala ocupada" quando outra profissional está atendendo.</li>
        <li><b>Salas separadas:</b> cada atendimento fica numa sala. Ao marcar, o app sugere a primeira sala livre e marca as ocupadas. O botão <b>Por sala</b>, na Agenda, mostra uma coluna para cada sala.</li>
      </ul>
      <p>Bloqueios, como o almoço, não ocupam sala. Se alguém tentar marcar numa sala ocupada, o app avisa e não salva.</p>`,
  },
  {
    id: 'dois-estudios',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Atendo em dois estúdios. Como funciona?',
    video: '',
    resposta: `
      <p>A sua agenda continua sendo uma só, então nunca há dois atendimentos no mesmo horário.</p>
      <ul>
        <li>No <b>Novo Atendimento</b>, aparece o campo <b>Local</b>. O app sugere o estúdio pelo dia da semana, e você pode trocar. Também há a opção "Fora do estúdio".</li>
        <li>No topo da Agenda, escolha qual estúdio quer ver.</li>
        <li>Em cada estúdio, as colegas veem os horários que você tem no outro só como <b>Indisponível</b>, sem serviço nem local.</li>
      </ul>`,
  },
  {
    id: 'conectar-parceira',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Como me conecto com uma parceira?',
    video: '',
    resposta: `
      <ol>
        <li>Em <b>Meu Negócio</b> › <b>Parcerias</b>, veja o seu <b>código de conexão</b> e mande para a parceira.</li>
        <li>Ela digita esse código em <b>Código de conexão da parceira</b>, na conta dela, e envia o pedido. Ou o contrário: você digita o código dela.</li>
        <li>Quem recebe o pedido clica em <b>Aceitar</b>. A conexão começa a valer nesse momento.</li>
      </ol>
      <p>Cada profissional pode ter até <b>2 conexões</b>. Para desfazer, clique em <b>Desfazer</b>. As clientes que já foram indicadas continuam com quem recebeu.</p>`,
  },
  {
    id: 'indicar-cliente',
    categoria: 'Trabalhar em parceria',
    pergunta: 'Como indico uma cliente para uma colega?',
    video: '',
    resposta: `
      <ol>
        <li>Abra a ficha da paciente, na aba <b>Dados</b>, e clique em <b>Indicar para colega</b>.</li>
        <li>Escolha a colega (do seu estúdio ou das suas conexões).</li>
        <li>Confirme que a cliente <b>autorizou</b> passar os dados dela. O app guarda a data dessa confirmação.</li>
        <li>Clique em <b>Indicar</b>.</li>
      </ol>
      <p>Vai só o cadastro: nome, telefone, e-mail, país de residência e data de nascimento. Anamnese, recomendações, histórico, fotos e financeiro <b>nunca</b> vão. A colega recebe uma cópia, e cada uma cuida da própria ficha dali em diante. Se a cliente já estiver na lista dela, o app avisa e não cria uma repetida.</p>`,
  },
  {
    id: 'quem-ve-o-que',
    categoria: 'Trabalhar em parceria',
    pergunta: 'O que as minhas parceiras conseguem ver?',
    video: '',
    resposta: `
      <ul>
        <li><b>Colegas de estúdio</b> veem na Agenda o serviço, o horário e a sala dos seus atendimentos naquele estúdio. Isso vale também para a titular.</li>
        <li><b>Conexões</b> veem só quando você está ocupada.</li>
        <li><b>Ninguém</b> vê o nome das suas clientes, as fichas, as anamneses, as fotos ou o seu financeiro. A única exceção é quando você mesma indica uma cliente, e aí vai só o cadastro.</li>
      </ul>`,
  },
];

(function(){
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const T = { busca: '', categoria: 'Todas', aberto: null };

  // Link do YouTube/Vimeo -> player. O player é criado direto pelo navegador (não por texto),
  // porque a proteção do app (seguranca-tema.js) remove qualquer <iframe> escrito em HTML.
  function enderecoDoPlayer(url){
    let m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if(m) return 'https://www.youtube-nocookie.com/embed/' + m[1];
    m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if(m) return 'https://player.vimeo.com/video/' + m[1];
    return null;
  }
  function videoHtml(url){
    if(!url) return '';
    if(enderecoDoPlayer(url)) return `<div class="tut-video" data-video="${esc(url)}"></div>`;
    return `<p><a class="tut-video-link" href="${esc(url)}" target="_blank" rel="noopener">Assistir ao vídeo</a></p>`;
  }
  function montarPlayers(raiz){
    raiz.querySelectorAll('.tut-video[data-video]').forEach(box => {
      const src = enderecoDoPlayer(box.dataset.video); if(!src || box.firstChild) return;
      const f = document.createElement('iframe');
      f.src = src; f.title = 'Vídeo do tutorial'; f.loading = 'lazy';
      f.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      box.appendChild(f);
    });
  }

  const categorias = () => ['Todas', ...new Set(TUTORIAIS.map(t => t.categoria))];

  function filtrados(){
    const q = semAcento(T.busca.trim());
    return TUTORIAIS.filter(t => (T.categoria === 'Todas' || t.categoria === T.categoria)
      && (!q || semAcento(t.pergunta + ' ' + t.resposta.replace(/<[^>]+>/g, ' ')).includes(q)));
  }

  function desenhar(){
    const el = document.getElementById('view-tutoriais'); if(!el) return;
    if(!el.dataset.montado){
      el.dataset.montado = '1';
      el.innerHTML = `<div class="content-tutoriais">
        <div class="tut-topo">
          <div class="search-input tut-busca">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="tutBusca" placeholder="Procure sua dúvida: agendamento, estúdio, conexão…" aria-label="Procurar tutorial">
          </div>
          <div class="fin-tabs tut-cats" id="tutCats" role="tablist"></div>
        </div>
        <div id="tutLista" class="tut-lista"></div>
        <p class="tut-rodape">Não achou sua dúvida? Escreva para <b>contato@skinexpertpro.com</b>.</p>
      </div>`;
      el.querySelector('#tutBusca').addEventListener('input', e => { T.busca = e.target.value; desenharLista(); });
      el.querySelector('#tutCats').addEventListener('click', e => {
        const b = e.target.closest('[data-cat]'); if(!b) return;
        T.categoria = b.dataset.cat; desenharLista();
      });
      el.querySelector('#tutLista').addEventListener('click', e => {
        const b = e.target.closest('[data-tut]'); if(!b) return;
        T.aberto = T.aberto === b.dataset.tut ? null : b.dataset.tut;
        desenharLista();
      });
    }
    desenharLista();
  }

  function desenharLista(){
    const cats = document.getElementById('tutCats'); const lista = document.getElementById('tutLista');
    if(!cats || !lista) return;
    cats.innerHTML = categorias().map(c => `<button type="button" class="fin-tab ${c === T.categoria ? 'active' : ''}" data-cat="${esc(c)}" role="tab" aria-selected="${c === T.categoria}">${esc(c)}</button>`).join('');
    const itens = filtrados();
    if(!itens.length){ lista.innerHTML = `<div class="tut-vazio">Nenhum tutorial encontrado para "${esc(T.busca)}". Tente outra palavra.</div>`; return; }
    const grupos = [...new Set(itens.map(t => t.categoria))];
    lista.innerHTML = grupos.map(g => `
      <section class="tut-grupo" aria-label="${esc(g)}">
        <h2>${esc(g)}</h2>
        <div class="tut-itens">
          ${itens.filter(t => t.categoria === g).map(t => {
            const aberto = T.aberto === t.id;
            return `<article class="tut-item ${aberto ? 'aberto' : ''}" id="tut-${esc(t.id)}">
              <button type="button" class="tut-pergunta" data-tut="${esc(t.id)}" aria-expanded="${aberto}">
                <span>${esc(t.pergunta)}</span>
                ${t.video ? '<span class="tut-tem-video">Vídeo</span>' : ''}
                <svg class="tut-seta" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              ${aberto ? `<div class="tut-resposta">${videoHtml(t.video)}${t.resposta}</div>` : ''}
            </article>`;
          }).join('')}
        </div>
      </section>`).join('');
    montarPlayers(lista);
  }

  // Abre a aba Tutoriais já com um tutorial aberto (usado por outras telas).
  window.abrirTutorial = function(id){
    T.busca = ''; T.categoria = 'Todas'; T.aberto = id || null;
    const busca = document.getElementById('tutBusca'); if(busca) busca.value = '';
    const nav = document.querySelector('.nav-item[data-view="tutoriais"]');
    if(nav) nav.click();
    desenhar();
    if(id) setTimeout(() => document.getElementById('tut-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  document.querySelector('.nav-item[data-view="tutoriais"]')?.addEventListener('click', desenhar);
})();
