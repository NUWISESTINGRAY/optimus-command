import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function callAgent(systemPrompt: string, history: { role: string; content: string }[]) {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      max_tokens: 400,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { room_id, prompt, mode = 'round-robin', target_agent } = await req.json();
    if (!room_id || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'bad input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: room } = await admin.from('jwba_rooms').select('*').eq('id', room_id).single();
    if (!room || room.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: members } = await admin.from('jwba_room_members').select('*').eq('room_id', room_id).is('left_at', null);
    const agentMembers = (members ?? []).filter((m: any) => m.role === 'agent' && m.agent_codename);
    if (agentMembers.length === 0) {
      return new Response(JSON.stringify({ error: 'no agents in room' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (agentMembers.length > 5) {
      return new Response(JSON.stringify({ error: 'too many agents (max 5)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Save user message
    await admin.from('jwba_room_messages').insert({ room_id, sender_kind: 'user', content: prompt });

    // Load recent history (last 30)
    const { data: history } = await admin.from('jwba_room_messages').select('*').eq('room_id', room_id).order('created_at', { ascending: true }).limit(30);
    const baseHistory = (history ?? []).map((m: any) => ({
      role: m.sender_kind === 'user' ? 'user' : 'assistant',
      content: m.sender_kind === 'agent' ? `[${m.agent_codename}] ${m.content}` : m.content,
    }));

    const { data: agentsMeta } = await admin.from('jwba_agents').select('*').in('codename', agentMembers.map((m: any) => m.agent_codename));
    const metaByCode = new Map<string, any>((agentsMeta ?? []).map((a: any) => [a.codename, a]));

    let respondingCodenames: string[];
    if (mode === 'handoff' && target_agent) {
      respondingCodenames = [target_agent];
    } else if (mode === 'broadcast') {
      respondingCodenames = agentMembers.map((m: any) => m.agent_codename);
    } else {
      // round-robin: pick the agent who has spoken least recently (or first)
      const lastSpoke: Record<string, number> = {};
      (history ?? []).forEach((m: any, idx: number) => {
        if (m.sender_kind === 'agent' && m.agent_codename) lastSpoke[m.agent_codename] = idx;
      });
      const sorted = [...agentMembers].sort((a: any, b: any) =>
        (lastSpoke[a.agent_codename] ?? -1) - (lastSpoke[b.agent_codename] ?? -1)
      );
      respondingCodenames = [sorted[0].agent_codename];
    }

    // Mark agents working
    await admin.from('jwba_agents').update({ status: 'in-room' }).in('codename', respondingCodenames);

    const replies: any[] = [];
    await Promise.all(
      respondingCodenames.map(async (code) => {
        const meta = metaByCode.get(code);
        const spec = meta?.spec ?? {};
        const sys = spec.system ?? `You are ${meta?.display_name ?? code}, an agent in a multi-agent meeting room. Other participants: ${agentMembers.map((m: any) => m.agent_codename).filter((c: string) => c !== code).join(', ') || 'none'}. Respond concisely in your own voice. Do not prefix your reply with your name.`;
        try {
          const content = await callAgent(sys, baseHistory);
          const { data: ins } = await admin.from('jwba_room_messages').insert({ room_id, sender_kind: 'agent', agent_codename: code, content }).select().single();
          replies.push(ins);
        } catch (e) {
          await admin.from('jwba_room_messages').insert({ room_id, sender_kind: 'agent', agent_codename: code, content: `(error: ${e instanceof Error ? e.message : 'unknown'})` });
        }
      })
    );

    await admin.from('jwba_agents').update({ status: 'idle' }).in('codename', respondingCodenames);

    return new Response(JSON.stringify({ replies }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('room-turn error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});