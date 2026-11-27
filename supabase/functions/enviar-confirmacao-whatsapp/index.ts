// Supabase Edge Function: enviar-confirmacao-whatsapp (slug no Supabase: swift-function)
//
// O que faz: recebe { agendamentoId }, confere que o atendimento é da profissional logada,
// busca as credenciais de WhatsApp DELA (integracoes_whatsapp) e envia a confirmação pela
// Meta Cloud API. Hoje nenhuma profissional usa essa integração (o cartão fica oculto no app).
//
// Segurança (27/11/2026): só a dona do atendimento pode pedir o envio.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    const { agendamentoId } = await req.json();
    if (!agendamentoId) {
      return new Response(JSON.stringify({ error: 'agendamentoId é obrigatório' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Busca o agendamento (só se for da profissional logada) + paciente.
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome, telefone), profissional_id, data, hora')
      .eq('id', agendamentoId)
      .eq('profissional_id', userData.user.id)
      .maybeSingle();

    if (agendamentoError || !agendamento) {
      return new Response(JSON.stringify({ error: 'Agendamento não encontrado' }), { status: 404, headers: corsHeaders });
    }

    const telefonePaciente = agendamento.pacientes?.telefone;
    const nomePaciente = agendamento.pacientes?.nome || 'Cliente';

    if (!telefonePaciente) {
      return new Response(JSON.stringify({ error: 'Cliente sem telefone cadastrado' }), { status: 400, headers: corsHeaders });
    }

    // 2. Credenciais de WhatsApp da própria profissional.
    const { data: integracao, error: integracaoError } = await supabase
      .from('integracoes_whatsapp')
      .select('phone_number_id, access_token, ativo')
      .eq('profissional_id', agendamento.profissional_id)
      .maybeSingle();

    if (integracaoError || !integracao || !integracao.ativo || !integracao.phone_number_id || !integracao.access_token) {
      return new Response(
        JSON.stringify({ error: 'Profissional não configurou o WhatsApp em Configurações > Integração com WhatsApp.' }),
        { status: 422, headers: corsHeaders }
      );
    }

    // 3. Nome da profissional para personalizar a mensagem.
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nome')
      .eq('id', agendamento.profissional_id)
      .maybeSingle();

    const nomeProfissional = perfil?.nome || 'sua profissional';
    const mensagem =
      `Olá, ${nomePaciente}! Seu atendimento com ${nomeProfissional} está confirmado para ${agendamento.data} às ${agendamento.hora}. ` +
      `Qualquer imprevisto, é só responder esta mensagem.`;

    // 4. Envia via Meta Cloud API, usando o número/token DA PROFISSIONAL.
    const resposta = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(integracao.phone_number_id)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integracao.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefonePaciente,
          type: 'text',
          text: { body: mensagem },
        }),
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      console.error('Erro da Meta Cloud API:', resultado);
      return new Response(JSON.stringify({ error: 'Erro ao enviar via WhatsApp' }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ sucesso: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro inesperado ao enviar confirmação.' }), { status: 500, headers: corsHeaders });
  }
});
