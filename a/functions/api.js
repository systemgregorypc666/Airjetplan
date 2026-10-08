// Cloudflare Pages Function: Backend de Airjetplan
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Cabeceras CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. OBTENER TODAS LAS AERONAVES (GET)
  if (request.method === 'GET') {
    const data = await env.AIRJETPLAN_KV.get('aircraft_list');
    const aircrafts = data ? JSON.parse(data) : [];
    return new Response(JSON.stringify(aircrafts), { headers: corsHeaders });
  }

  // 2. PUBLICAR NUEVA AERONAVE O APROBAR (POST)
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const currentData = await env.AIRJETPLAN_KV.get('aircraft_list');
      let aircrafts = currentData ? JSON.parse(currentData) : [];

      if (body.action === 'add') {
        // Nueva aeronave enviada por un usuario (Pendiente por defecto)
        const newAircraft = {
          id: 'AIR-' + Date.now(),
          title: body.title,
          category: body.category,
          price: body.price,
          currency: body.currency || 'USD',
          year: body.year,
          ttaf: body.ttaf,
          smoh: body.smoh,
          avionics: body.avionics,
          location: body.location,
          contact: body.contact,
          status: 'pendiente', // Requiere tu aprobación
          createdAt: new Date().toISOString()
        };
        aircrafts.push(newAircraft);
        await env.AIRJETPLAN_KV.put('aircraft_list', JSON.stringify(aircrafts));
        return new Response(JSON.stringify({ success: true, message: 'Aeronave enviada para revisión.' }), { headers: corsHeaders });
      }

      if (body.action === 'approve') {
        // Validación de clave de administrador
        if (body.adminKey !== 'SystemGregory2026') {
          return new Response(JSON.stringify({ success: false, message: 'Clave no válida.' }), { status: 403, headers: corsHeaders });
        }
        
        aircrafts = aircrafts.map(item => {
          if (item.id === body.id) {
            item.status = 'aprobado';
          }
          return item;
        });
        await env.AIRJETPLAN_KV.put('aircraft_list', JSON.stringify(aircrafts));
        return new Response(JSON.stringify({ success: true, message: 'Aeronave aprobada públicamente.' }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: false, message: 'Acción no reconocida.' }), { status: 400, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response('Método no permitido', { status: 405 });
}
