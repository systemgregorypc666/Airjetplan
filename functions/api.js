// Cloudflare Pages Function: Backend de Airjetplan
export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. OBTENER AERONAVES (GET)
  if (request.method === 'GET') {
    const data = await env.AIRJETPLAN_KV.get('aircraft_list');
    let aircrafts = data ? JSON.parse(data) : [];

    // Por seguridad, si la petición no incluye clave de admin, limpiamos los datos de contacto privados del vendedor
    const url = new URL(request.url);
    const isAdmin = url.searchParams.get('adminKey') === 'SystemGregory2026';

    if (!isAdmin) {
      aircrafts = aircrafts.map(item => {
        const publicItem = { ...item };
        delete publicItem.sellerName;
        delete publicItem.sellerPhone;
        delete publicItem.sellerEmail;
        return publicItem;
      });
    }

    return new Response(JSON.stringify(aircrafts), { headers: corsHeaders });
  }

  // 2. REGISTRAR O APROBAR AERONAVE (POST)
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const currentData = await env.AIRJETPLAN_KV.get('aircraft_list');
      let aircrafts = currentData ? JSON.parse(currentData) : [];

      if (body.action === 'add') {
        const newAircraft = {
          id: 'AIR-' + Date.now(),
          title: body.title,
          category: body.category,
          price: body.price,
          currency: body.currency || 'USD',
          year: body.year,
          smoh: body.smoh,
          location: body.location,
          image: body.image,
          // Datos Privados del Propietario (Solo visibles para el Admin)
          sellerName: body.sellerName || 'No indicado',
          sellerPhone: body.sellerPhone || 'No indicado',
          sellerEmail: body.sellerEmail || 'No indicado',
          status: 'pendiente',
          createdAt: new Date().toISOString()
        };
        aircrafts.push(newAircraft);
        await env.AIRJETPLAN_KV.put('aircraft_list', JSON.stringify(aircrafts));
        return new Response(JSON.stringify({ success: true, message: 'Aeronave registrada como pendiente. Un broker la revisará.' }), { headers: corsHeaders });
      }

      if (body.action === 'approve') {
        if (body.adminKey !== 'SystemGregory2026') {
          return new Response(JSON.stringify({ success: false, message: 'Clave de administrador incorrecta.' }), { status: 403, headers: corsHeaders });
        }

        aircrafts = aircrafts.map(item => {
          if (item.id === body.id) {
            item.status = 'aprobado';
          }
          return item;
        });
        await env.AIRJETPLAN_KV.put('aircraft_list', JSON.stringify(aircrafts));
        return new Response(JSON.stringify({ success: true, message: 'Aeronave aprobada en el catálogo público.' }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: false, message: 'Acción no válida.' }), { status: 400, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response('Método no permitido', { status: 405 });
}
