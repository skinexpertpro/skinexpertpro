// Supabase Edge Function: stripe-webhook
//
// Recebe os avisos do Stripe e mantém o plano de cada profissional em contas_plano.
//   checkout.session.completed      → liga a assinatura à conta (client_reference_id = id da profissional;
//                                     se faltar, procura a conta pelo e-mail do pagamento)
//   customer.subscription.created / updated / deleted → plano, status, período grátis, renovação, cancelamento
// O segredo de assinatura do webhook (whsec_...) fica na tabela config_servidor (só o servidor lê).
// verify_jwt = false: quem chama é o Stripe; a autenticidade é conferida pela assinatura do aviso.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PRODUTOS: Record<string, string> = {
  prod_VX14D3wQzmDXF8: 'essencial',
  prod_VX1DVXwpAGWEXv: 'studio',
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

// ---------- Conferir que o aviso veio mesmo do Stripe ----------
async function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string) {
  if (!cabecalho) return false;
  const partes = cabecalho.split(',').map((p) => p.trim().split('='));
  const t = partes.find((p) => p[0] === 't')?.[1];
  const v1 = partes.filter((p) => p[0] === 'v1').map((p) => p[1]);
  if (!t || !v1.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false; // aviso velho demais (10 min)
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`${t}.${corpo}`));
  const esperado = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return v1.some((v) => v.length === esperado.length && [...v].every((c, i) => c === esperado[i]));
}

const data = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);
const uuidValido = (s?: string | null) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

function periodoDo(recurring?: { interval?: string; interval_count?: number } | null) {
  if (!recurring) return null;
  if (recurring.interval === 'year') return 'anual';
  if (recurring.interval === 'month' && recurring.interval_count === 3) return 'trimestral';
  if (recurring.interval === 'month') return 'mensal';
  return `${recurring.interval_count || 1} ${recurring.interval}`;
}

// ---------- Passa os dados da assinatura para o plano da conta ----------
async function sincronizarConta(subscriptionId: string) {
  const { data: a } = await supabase.from('assinaturas_stripe').select('*').eq('subscription_id', subscriptionId).maybeSingle();
  if (!a || !a.profissional_id) return;
  const campos: Record<string, unknown> = {
    profissional_id: a.profissional_id,
    status: a.status,
    periodo: a.periodo,
    moeda: a.moeda,
    teste_ate: a.teste_ate,
    renova_em: a.renova_em,
    cancela_no_fim: a.cancela_no_fim,
    stripe_customer_id: a.customer_id,
    stripe_subscription_id: a.subscription_id,
    atualizado_em: new Date().toISOString(),
  };
  if (a.product_id && PRODUTOS[a.product_id]) campos.plano = PRODUTOS[a.product_id];
  // Uma assinatura antiga cancelada não apaga uma assinatura nova da mesma conta
  const { data: atual } = await supabase.from('contas_plano').select('stripe_subscription_id, status').eq('profissional_id', a.profissional_id).maybeSingle();
  if (atual && atual.stripe_subscription_id && atual.stripe_subscription_id !== a.subscription_id
      && ['canceled', 'incomplete_expired'].includes(a.status) && ['trialing', 'active', 'past_due'].includes(atual.status)) return;
  const { error } = await supabase.from('contas_plano').upsert(campos, { onConflict: 'profissional_id' });
  if (error) console.error('contas_plano:', error.message);
}

async function guardarAssinatura(sub: any) {
  const item = sub.items?.data?.[0] || {};
  const price = item.price || {};
  const linha: Record<string, unknown> = {
    subscription_id: sub.id,
    customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    status: sub.status,
    price_id: price.id || null,
    product_id: typeof price.product === 'string' ? price.product : price.product?.id || null,
    periodo: periodoDo(price.recurring),
    moeda: (price.currency || sub.currency || '').toUpperCase() || null,
    teste_ate: data(sub.trial_end),
    renova_em: data(sub.current_period_end ?? item.current_period_end ?? sub.cancel_at),
    cancela_no_fim: !!(sub.cancel_at_period_end || sub.cancel_at),
    atualizado_em: new Date().toISOString(),
  };
  // Se for uma assinatura nova da mesma cliente, herda a conta já ligada a ela
  const { data: existente } = await supabase.from('assinaturas_stripe').select('profissional_id').eq('subscription_id', sub.id).maybeSingle();
  if (!existente?.profissional_id && linha.customer_id) {
    const { data: outra } = await supabase.from('contas_plano').select('profissional_id').eq('stripe_customer_id', linha.customer_id).maybeSingle();
    if (outra?.profissional_id) linha.profissional_id = outra.profissional_id;
  }
  const { error } = await supabase.from('assinaturas_stripe').upsert(linha, { onConflict: 'subscription_id' });
  if (error) console.error('assinaturas_stripe:', error.message);
  await sincronizarConta(sub.id);
}

async function contaPeloEmail(email?: string | null) {
  if (!email) return null;
  const { data } = await supabase.rpc('conta_por_email', { p_email: email });
  return (data as string) || null;
}

async function checkoutConcluido(s: any) {
  if (s.mode !== 'subscription' || !s.subscription) return;
  const subscriptionId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id;
  const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
  let profissionalId = uuidValido(s.client_reference_id) ? s.client_reference_id : null;
  if (!profissionalId) profissionalId = await contaPeloEmail(s.customer_details?.email || s.customer_email);
  if (!profissionalId) { console.warn('Pagamento sem conta ligada:', subscriptionId, s.customer_details?.email); }

  const { data: existente } = await supabase.from('assinaturas_stripe').select('status').eq('subscription_id', subscriptionId).maybeSingle();
  const linha: Record<string, unknown> = { subscription_id: subscriptionId, customer_id: customerId, profissional_id: profissionalId, atualizado_em: new Date().toISOString() };
  if (!existente?.status) {
    // O aviso da assinatura ainda não chegou: libera já com o período grátis; o aviso seguinte completa os dados
    linha.status = 'trialing';
    linha.teste_ate = new Date(Date.now() + 14 * 86400000).toISOString();
    linha.moeda = (s.currency || '').toUpperCase() || null;
    const plano = s.metadata?.plano;
    if (plano) linha.product_id = Object.keys(PRODUTOS).find((k) => PRODUTOS[k] === plano) || null;
    linha.periodo = s.metadata?.periodo || null;
  }
  const { error } = await supabase.from('assinaturas_stripe').upsert(linha, { onConflict: 'subscription_id' });
  if (error) console.error('assinaturas_stripe:', error.message);
  await sincronizarConta(subscriptionId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return resposta({ ok: true });
  const corpo = await req.text();
  const { data: cfg } = await supabase.from('config_servidor').select('valor').eq('chave', 'stripe_webhook_secret').maybeSingle();
  if (!cfg?.valor || !(await assinaturaValida(corpo, req.headers.get('stripe-signature'), cfg.valor))) {
    return resposta({ error: 'assinatura inválida' }, 400);
  }
  let evento: any;
  try { evento = JSON.parse(corpo); } catch { return resposta({ error: 'JSON inválido' }, 400); }
  try {
    const obj = evento.data?.object;
    switch (evento.type) {
      case 'checkout.session.completed': await checkoutConcluido(obj); break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await guardarAssinatura(obj); break;
    }
    return resposta({ recebido: true });
  } catch (e) {
    console.error(e);
    return resposta({ error: 'erro ao processar' }, 500); // o Stripe tenta de novo
  }
});
