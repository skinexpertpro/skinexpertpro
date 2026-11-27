// Supabase Edge Function: sincronizar-google-agenda
//
// Deploy:
//   Function name: sincronizar-google-agenda
//   Secrets necessários (os mesmos já cadastrados para o google-agenda-callback):
//     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//
// O que faz: recebe { agendamentoId }, confere que o atendimento é da profissional logada,
// busca a integração dela, renova o access_token se necessário (usando o refresh_token) e cria
// um evento correspondente na Google Agenda dela.
//
// Segurança (27/11/2026): só a dona do atendimento pode pedir a sincronização.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function renovarAccessToken(refreshToken: string) {
  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    const e = new Error('Não foi possível renovar o token do Google: ' + JSON.stringify(dados)) as Error & { invalidGrant?: boolean };
    e.invalidGrant = dados && dados.error === 'invalid_grant';
    throw e;
  }
  return dados; // { access_token, expires_in, ... }
}

// Soma minutos a uma data/hora "local" (sem fuso) e devolve no mesmo formato "AAAA-MM-DDTHH:MM:SS".
function somarMinutos(dataLocal: string, minutos: number) {
  const [d, h] = dataLocal.split('T');
  const [a, m, dia] = d.split('-').map(Number);
  const [hh, mm, ss] = h.split(':').map(Number);
  const t = new Date(Date.UTC(a, m - 1, dia, hh, mm, ss || 0) + minutos * 60000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}T${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Quem está pedindo? (a profissional logada, pelo token que o site envia)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: corsHeaders });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: corsHeaders });
    }

    const { agendamentoId, fuso } = await req.json();
    // Fuso horário da profissional (vem do navegador dela). Sem ele, usa o de Portugal.
    const timeZone = (typeof fuso === 'string' && /^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(fuso)) ? fuso : 'Europe/Lisbon';
    if (!agendamentoId) {
      return new Response(JSON.stringify({ error: 'agendamentoId é obrigatório' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome)')
      .eq('id', agendamentoId)
      .eq('profissional_id', userData.user.id) // só atendimentos da própria profissional
      .maybeSingle();

    if (agendamentoError || !agendamento) {
      return new Response(JSON.stringify({ error: 'Agendamento não encontrado' }), { status: 404, headers: corsHeaders });
    }

    const { data: integracao, error: integracaoError } = await supabase
      .from('integracoes_google_agenda')
      .select('access_token, refresh_token, token_expira_em, calendar_id, ativo')
      .eq('profissional_id', agendamento.profissional_id)
      .maybeSingle();

    if (integracaoError || !integracao || !integracao.ativo || !integracao.refresh_token) {
      // Profissional não conectou a Google Agenda — não é um erro, só não há nada a fazer.
      return new Response(JSON.stringify({ sincronizado: false, motivo: 'Google Agenda não conectada' }), { status: 200, headers: corsHeaders });
    }

    // Renova o access_token se estiver expirado (ou perto de expirar).
    let accessToken = integracao.access_token;
    const expiraEm = integracao.token_expira_em ? new Date(integracao.token_expira_em).getTime() : 0;
    if (!accessToken || Date.now() > expiraEm - 60_000) {
      let renovado;
      try {
        renovado = await renovarAccessToken(integracao.refresh_token);
      } catch (e) {
        if ((e as { invalidGrant?: boolean }).invalidGrant) {
          // A autorização do Google expirou ou foi retirada: marca como desconectada,
          // para o app pedir que a profissional conecte de novo.
          console.error('invalid_grant para', agendamento.profissional_id);
          await supabase.from('integracoes_google_agenda').update({ ativo: false }).eq('profissional_id', agendamento.profissional_id);
          return new Response(JSON.stringify({ error: 'invalid_grant', mensagem: 'A conexão com a Google Agenda expirou. Conecte de novo em Configurações.' }), { status: 401, headers: corsHeaders });
        }
        throw e;
      }
      accessToken = renovado.access_token;
      await supabase.from('integracoes_google_agenda').update({
        access_token: accessToken,
        token_expira_em: new Date(Date.now() + (renovado.expires_in || 3600) * 1000).toISOString(),
      }).eq('profissional_id', agendamento.profissional_id);
    }

    const nomePaciente = agendamento.pacientes?.nome || agendamento.motivo || 'Atendimento';
    const titulo = agendamento.tipo === 'block'
      ? ('Horário bloqueado' + (agendamento.motivo ? ' — ' + agendamento.motivo : ''))
      : ('Atendimento — ' + nomePaciente + (agendamento.servico_nome ? ' (' + agendamento.servico_nome + ')' : ''));

    // A coluna "hora" pode vir como "14:15" ou já como "14:15:00" — normaliza antes de montar a data.
    const horaNormalizada = (agendamento.hora || '00:00:00').length === 5
      ? agendamento.hora + ':00'
      : agendamento.hora;
    // Data e hora no fuso da profissional (antes ia como UTC e o evento podia cair em outro horário).
    const inicioLocal = `${String(agendamento.data).slice(0, 10)}T${horaNormalizada.slice(0, 8)}`;
    const fimLocal = somarMinutos(inicioLocal, Number(agendamento.duracao_min || agendamento.duracao_minutos || 60));

    const calendarId = encodeURIComponent(integracao.calendar_id || 'primary');
    // Se esse atendimento já tem um evento criado antes (ex: foi reagendado), atualiza (PATCH)
    // esse mesmo evento em vez de criar um duplicado.
    const jaTemEvento = !!agendamento.google_event_id;
    const url = jaTemEvento
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(agendamento.google_event_id)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    const resposta = await fetch(url, {
      method: jaTemEvento ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: titulo,
        start: { dateTime: inicioLocal, timeZone },
        end: { dateTime: fimLocal, timeZone },
        extendedProperties: { private: { skinexpertpro_agendamento_id: agendamentoId } },
      }),
    });

    let evento = await resposta.json();

    // Se o evento que tínhamos guardado foi apagado direto na Google Agenda, o PATCH falha (404).
    // Nesse caso, cria um novo evento no lugar.
    if (!resposta.ok && jaTemEvento && resposta.status === 404) {
      const respostaCriar = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: titulo,
            start: { dateTime: inicioLocal, timeZone },
            end: { dateTime: fimLocal, timeZone },
            extendedProperties: { private: { skinexpertpro_agendamento_id: agendamentoId } },
          }),
        }
      );
      evento = await respostaCriar.json();
      if (!respostaCriar.ok) {
        console.error('Erro da Google Calendar API:', evento);
        return new Response(JSON.stringify({ error: 'Erro ao criar evento na Google Agenda', detalhe: evento }), { status: 502, headers: corsHeaders });
      }
    } else if (!resposta.ok) {
      console.error('Erro da Google Calendar API:', evento);
      return new Response(JSON.stringify({ error: 'Erro ao sincronizar evento na Google Agenda', detalhe: evento }), { status: 502, headers: corsHeaders });
    }

    // Guarda o id do evento para permitir editar/cancelar depois.
    if (evento.id !== agendamento.google_event_id) {
      await supabase.from('agendamentos').update({ google_event_id: evento.id }).eq('id', agendamentoId);
    }

    return new Response(JSON.stringify({ sincronizado: true, eventoId: evento.id }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro inesperado ao sincronizar com a Google Agenda.' }), { status: 500, headers: corsHeaders });
  }
});
