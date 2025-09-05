import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
    }
    const { action, id, key } = JSON.parse(event.body || '{}')
    const ADMIN_KEY = process.env.ADMIN_KEY
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

    if (!ADMIN_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) }
    }
    if (!key || key !== ADMIN_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (!id || !['approve','reject'].includes(action)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    if (action === 'approve') {
      const { error } = await supabase.from('submissions').update({ approved: true }).eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('submissions').delete().eq('id', id)
      if (error) throw error
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) }
  }
}
