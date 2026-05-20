import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userId = userData.user.id;

    const { room_id, target_page_id } = await req.json();
    const { data: room } = await admin.from('jwba_rooms').select('*').eq('id', room_id).single();
    if (!room || room.user_id !== userId) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: msgs } = await admin.from('jwba_room_messages').select('*').eq('room_id', room_id).order('created_at', { ascending: true });

    // Find max sort_order on target page
    const { data: existing } = await admin.from('jwba_blocks').select('sort_order').eq('page_id', target_page_id).order('sort_order', { ascending: false }).limit(1);
    const baseSort = (existing?.[0]?.sort_order ?? 0) + 1;

    const { data: parent } = await admin
      .from('jwba_blocks')
      .insert({ page_id: target_page_id, sort_order: baseSort, content: `Meeting: ${room.title}`, block_type: 'meeting', created_by: userId })
      .select()
      .single();

    if (parent && msgs) {
      const childRows = msgs.map((m: any, i: number) => ({
        page_id: target_page_id,
        parent_id: parent.id,
        sort_order: i + 1,
        content: m.content,
        block_type: m.sender_kind === 'agent' ? 'agent' : 'text',
        agent_codename: m.agent_codename,
        created_by: userId,
      }));
      if (childRows.length) await admin.from('jwba_blocks').insert(childRows);
    }

    await admin.from('jwba_rooms').update({ status: 'closed', saved_block_id: parent?.id, closed_at: new Date().toISOString() }).eq('id', room_id);

    return new Response(JSON.stringify({ saved_block_id: parent?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});