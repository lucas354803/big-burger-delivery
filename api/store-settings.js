import { supabaseFetch } from './_supabase.js';

const defaultConfig = {
  id: 1,
  loja_aberta: true,
  pedido_automatico: true,
  som_pedidos: true,
  tempo_entrega_padrao: 40,
  mensagem_fechado: 'Estamos fechados no momento. Volte no nosso horário de atendimento.'
};

const defaultHorarios = [
  { dia_semana: 0, nome_dia: 'Domingo', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 1, nome_dia: 'Segunda', abre: '18:30', fecha: '00:00', ativo: false },
  { dia_semana: 2, nome_dia: 'Terça', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 3, nome_dia: 'Quarta', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 4, nome_dia: 'Quinta', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 5, nome_dia: 'Sexta', abre: '18:30', fecha: '01:00', ativo: true },
  { dia_semana: 6, nome_dia: 'Sábado', abre: '18:30', fecha: '01:00', ativo: true }
];

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function minutos(h) {
  const [a, b] = String(h || '00:00').split(':').map(Number);
  return (a || 0) * 60 + (b || 0);
}

function agoraSaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.find(x => x.type === 'weekday')?.value] ?? 0;
  const hour = Number(parts.find(x => x.type === 'hour')?.value || 0);
  const minute = Number(parts.find(x => x.type === 'minute')?.value || 0);
  return { dia_semana: wd, minuto: hour * 60 + minute };
}

export function calcularAberto(config, horarios) {
  if (config?.loja_aberta === false) return { aberto: false, motivo: 'manual' };
  const agora = agoraSaoPaulo();
  const h = (horarios || []).find(x => Number(x.dia_semana) === agora.dia_semana);
  if (!h || h.ativo === false) return { aberto: false, motivo: 'fora_horario' };

  const ini = minutos(h.abre);
  const fim = minutos(h.fecha);
  const atual = agora.minuto;
  const aberto = fim <= ini ? (atual >= ini || atual <= fim) : (atual >= ini && atual <= fim);
  return { aberto, motivo: aberto ? 'aberto' : 'fora_horario', horario: h };
}

async function getSettings() {
  let config = defaultConfig;
  let horarios = defaultHorarios;

  try {
    const c = await supabaseFetch('loja_config?select=*&id=eq.1&limit=1', { headers: { Prefer: '' } });
    if (c?.[0]) config = { ...defaultConfig, ...c[0] };
  } catch (e) {
    // Mantém padrão para o cardápio não quebrar caso a tabela ainda não tenha sido criada.
  }

  try {
    const h = await supabaseFetch('horarios_funcionamento?select=*&order=dia_semana.asc', { headers: { Prefer: '' } });
    if (h?.length) horarios = h;
  } catch (e) {
    // Mantém padrão para o cardápio não quebrar caso a tabela ainda não tenha sido criada.
  }

  return { config, horarios, status: calcularAberto(config, horarios) };
}

export { getSettings };

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, ...(await getSettings()) });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Use GET ou POST' });
    }

    const body = parseBody(req);
    const config = body.config || {};
    const now = new Date().toISOString();

    const cleanConfig = {
      id: 1,
      loja_aberta: config.loja_aberta === true,
      pedido_automatico: config.pedido_automatico === true,
      som_pedidos: config.som_pedidos === true,
      tempo_entrega_padrao: Number(config.tempo_entrega_padrao || 40),
      mensagem_fechado: String(config.mensagem_fechado || defaultConfig.mensagem_fechado),
      updated_at: now
    };

    // Salva de forma reforçada: tenta UPDATE primeiro e, se a linha ainda não existir, faz INSERT/UPSERT.
    // Isso evita o problema de "salvar e voltar tudo ao padrão".
    let savedConfig = null;
    try {
      const patched = await supabaseFetch('loja_config?id=eq.1', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(cleanConfig)
      });
      if (Array.isArray(patched) && patched.length) savedConfig = patched[0];
    } catch (e) {
      // Continua para o upsert abaixo.
    }

    if (!savedConfig) {
      const upserted = await supabaseFetch('loja_config?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(cleanConfig)
      });
      savedConfig = Array.isArray(upserted) ? upserted[0] : upserted;
    }

    let savedHorarios = [];
    if (Array.isArray(body.horarios)) {
      const horariosPayload = body.horarios.map(h => ({
        dia_semana: Number(h.dia_semana),
        nome_dia: String(h.nome_dia || defaultHorarios[Number(h.dia_semana)]?.nome_dia || ''),
        abre: String(h.abre || '18:30'),
        fecha: String(h.fecha || '00:00'),
        ativo: h.ativo === true,
        updated_at: now
      }));

      for (const h of horariosPayload) {
        let saved = null;
        try {
          const patched = await supabaseFetch(`horarios_funcionamento?dia_semana=eq.${h.dia_semana}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(h)
          });
          if (Array.isArray(patched) && patched.length) saved = patched[0];
        } catch (e) {
          // Continua para upsert.
        }
        if (!saved) {
          const upserted = await supabaseFetch('horarios_funcionamento?on_conflict=dia_semana', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(h)
          });
          saved = Array.isArray(upserted) ? upserted[0] : upserted;
        }
        if (saved) savedHorarios.push(saved);
      }
    }

    const fresh = await getSettings();
    return res.status(200).json({
      ok: true,
      saved: true,
      config: fresh.config || savedConfig || cleanConfig,
      horarios: fresh.horarios?.length ? fresh.horarios : savedHorarios,
      status: fresh.status || calcularAberto(savedConfig || cleanConfig, savedHorarios)
    });
  } catch (e) {
    return res.status(e.status || 500).json({
      ok: false,
      error: e.message,
      detalhes: e.data || null,
      dica: 'Execute o arquivo supabase/corrigir_config_loja.sql no SQL Editor do Supabase e confira as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.'
    });
  }
}
