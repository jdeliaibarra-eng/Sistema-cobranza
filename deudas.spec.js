const { test, expect } = require('@playwright/test');
const API = 'http://localhost:3000';
let deudaId, operadorId, ticketId;

test.describe('SISTEMA DE COBRANZA — Grupo 2 (Suite completa)', () => {

  test('TC-01 — POST /operadores: crear operador', async ({ request }) => {
    const res = await request.post(API + '/operadores', { data: { nombre: 'Ana Torres', disponible: true } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    operadorId = body.id;
  });

  test('TC-02 — GET /operadores: listar operadores', async ({ request }) => {
    const res = await request.get(API + '/operadores');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('TC-03 — POST /deudas: crear deuda', async ({ request }) => {
    const res = await request.post(API + '/deudas', {
      data: {
        cliente: 'Empresa ABC S.A.C.',
        monto: 15000.5,
        fecha_vencimiento: '2026-01-01',
        estado: 'mora',
        descripcion: 'Cuota de préstamo vencida'
      }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    deudaId = body.id;
  });

  test('TC-04 — GET /deudas: listar deudas', async ({ request }) => {
    const res = await request.get(API + '/deudas');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('TC-05 — GET /deudas/:id: obtener deuda por ID', async ({ request }) => {
    const res = await request.get(API + '/deudas/' + deudaId);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', deudaId);
  });

  test('TC-06 — POST /deudas vacío debe retornar 400', async ({ request }) => {
    const res = await request.post(API + '/deudas', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('TC-07 — GET /deudas/:id/interes: calcular interés', async ({ request }) => {
    const res = await request.get(API + '/deudas/' + deudaId + '/interes');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('monto_actualizado');
    expect(body).toHaveProperty('tipo_cobranza_sugerido');
  });

  test('TC-08 — GET interés con ID inexistente debe retornar 404', async ({ request }) => {
    const res = await request.get(API + '/deudas/999999/interes');
    expect(res.status()).toBe(404);
  });

  test('TC-09 — POST /tickets: generar ticket con operador disponible', async ({ request }) => {
    const res = await request.post(API + '/tickets', { data: { deuda_id: deudaId, prioridad: 'alta' } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('operador_id');
    ticketId = body.id;
  });

  test('TC-10 — GET /tickets: listar tickets con datos de deuda y operador', async ({ request }) => {
    const res = await request.get(API + '/tickets');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const encontrado = body.find(t => t.id === ticketId);
    expect(encontrado).toHaveProperty('operador_nombre');
  });

  test('TC-11 — POST /tickets con deuda_id inexistente debe retornar 404', async ({ request }) => {
    const res = await request.post(API + '/tickets', { data: { deuda_id: 999999 } });
    expect(res.status()).toBe(404);
  });

  test('TC-12 — POST /gestiones: registrar gestión con resultado promesa_pago', async ({ request }) => {
    const res = await request.post(API + '/gestiones', {
      data: { ticket_id: ticketId, canal: 'llamada', resultado: 'promesa_pago', observaciones: 'Cliente promete pagar en 5 días' }
    });
    expect(res.status()).toBe(201);
  });

  test('TC-13 — Verificar que el ticket se cerró automáticamente', async ({ request }) => {
    const res = await request.get(API + '/tickets');
    const body = await res.json();
    const ticket = body.find(t => t.id === ticketId);
    expect(ticket.estado).toBe('cerrado');
  });

  test('TC-14 — POST /gestiones con ticket_id inexistente debe retornar 404', async ({ request }) => {
    const res = await request.post(API + '/gestiones', { data: { ticket_id: 999999, canal: 'correo', resultado: 'contactado' } });
    expect(res.status()).toBe(404);
  });

  test('TC-15 — GET historial de gestiones de la deuda', async ({ request }) => {
    const res = await request.get(API + '/deudas/' + deudaId + '/historial');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThan(0);
  });

});


// ==================== SUITE 2: VALOR DE FRONTERA, BUCLES Y RUTAS INDEPENDIENTES ====================

function fechaHaceNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

test.describe('PRUEBAS AVANZADAS — Valor de Frontera, Bucles y Rutas Independientes', () => {

  test('VF-01 — 14 días de atraso → preventiva', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 14', monto: 1000, fecha_vencimiento: fechaHaceNDias(14), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('preventiva');
  });

  test('VF-02 — 15 días de atraso (límite exacto) → preventiva', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 15', monto: 1000, fecha_vencimiento: fechaHaceNDias(15), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('preventiva');
  });

  test('VF-03 — 16 días de atraso (justo encima) → intensiva', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 16', monto: 1000, fecha_vencimiento: fechaHaceNDias(16), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('intensiva');
  });

  test('VF-04 — 59 días de atraso → intensiva', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 59', monto: 1000, fecha_vencimiento: fechaHaceNDias(59), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('intensiva');
  });

  test('VF-05 — 60 días de atraso (límite exacto) → intensiva', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 60', monto: 1000, fecha_vencimiento: fechaHaceNDias(60), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('intensiva');
  });

  test('VF-06 — 61 días de atraso (justo encima) → judicial', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 61', monto: 1000, fecha_vencimiento: fechaHaceNDias(61), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('judicial');
  });

  test('VF-07 — Fecha futura → interés moratorio = 0', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente Futuro', monto: 1000, fecha_vencimiento: fechaHaceNDias(-5), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(parseFloat(body.interes_moratorio)).toBe(0);
  });

  test('VF-08 — 0 días de atraso (vence hoy) → preventiva, interés = 0', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente Hoy', monto: 1000, fecha_vencimiento: fechaHaceNDias(0), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(body.tipo_cobranza_sugerido).toBe('preventiva');
    expect(parseFloat(body.interes_moratorio)).toBe(0);
  });

  test('VF-09 — 1 día de atraso → interés > 0', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'VF Cliente 1dia', monto: 1000, fecha_vencimiento: fechaHaceNDias(1), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();
    expect(parseFloat(body.interes_moratorio)).toBeGreaterThan(0);
  });

  test('PB-01 — 0 iteraciones: body vacío → 400', async ({ request }) => {
    const res = await request.post(API + '/deudas', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('PB-02 — 3 iteraciones: campos obligatorios mínimos', async ({ request }) => {
    const res = await request.post(API + '/deudas', { data: { cliente: 'PB Cliente Min', monto: 500, fecha_vencimiento: fechaHaceNDias(5) } });
    expect(res.status()).toBe(201);
  });

  test('PB-03 — 6 iteraciones: todos los campos posibles', async ({ request }) => {
    const res = await request.post(API + '/deudas', {
      data: { cliente: 'PB Cliente Completo', monto: 800, fecha_vencimiento: fechaHaceNDias(3), estado: 'mora', descripcion: 'Prueba de bucle', calificacion_crediticia: 'alta' }
    });
    expect(res.status()).toBe(201);
  });

  test('RI-03 — POST /tickets sin operadores disponibles → 400', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'RI3 Cliente', monto: 700, fecha_vencimiento: fechaHaceNDias(10) } });
    const { id: deudaTemp } = await d.json();

    const opsRes = await request.get(API + '/operadores');
    const operadores = await opsRes.json();
    const habilitados = operadores.filter(o => o.disponible);

    for (const o of habilitados) {
      await request.put(API + `/operadores/${o.id}`, { data: { disponible: false } });
    }

    const res = await request.post(API + '/tickets', { data: { deuda_id: deudaTemp } });
    expect(res.status()).toBe(400);

    for (const o of habilitados) {
      await request.put(API + `/operadores/${o.id}`, { data: { disponible: true } });
    }
  });

});



// ==================== SUITE 3: FLUJO DE DATOS Y LOS 5 TIPOS DE ERROR DE CAJA NEGRA ====================

test.describe('PRUEBAS DE FLUJO DE DATOS (DEF/USE) — variable diasAtraso', () => {

  test('DF-01 — Una sola definición de diasAtraso debe producir salidas consistentes en sus 4 usos', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'DF Cliente 20dias', monto: 2000, fecha_vencimiento: fechaHaceNDias(20), estado: 'mora' } });
    const { id } = await d.json();
    const res = await request.get(API + `/deudas/${id}/interes`);
    const body = await res.json();

    expect(parseFloat(body.interes_corriente)).toBeGreaterThan(0);
    expect(parseFloat(body.interes_moratorio)).toBeGreaterThan(0);
    expect(body.tipo_cobranza_sugerido).not.toBe('judicial');
    expect(body.tipo_cobranza_sugerido).toBe('intensiva');
    expect(body.dias_atraso).toBe(20);
  });

});

test.describe('LOS 5 TIPOS DE ERROR DE CAJA NEGRA (pág. 51 del material)', () => {

  test('EF-01 — Función incorrecta o faltante: cierre automático de ticket', async ({ request }) => {
    await request.post(API + '/operadores', { data: { nombre: 'Operador EF01', disponible: true } });
    const d = await request.post(API + '/deudas', { data: { cliente: 'EF01 Cliente', monto: 500, fecha_vencimiento: fechaHaceNDias(5) } });
    const { id: deudaId2 } = await d.json();
    const t = await request.post(API + '/tickets', { data: { deuda_id: deudaId2 } });
    const { id: ticketId2 } = await t.json();
    await request.post(API + '/gestiones', { data: { ticket_id: ticketId2, canal: 'correo', resultado: 'promesa_pago' } });

    const res = await request.get(API + '/tickets');
    const body = await res.json();
    const ticket = body.find(t => t.id === ticketId2);
    expect(ticket.estado).toBe('cerrado');
  });

  test('EF-02 — Error de interfaz: fecha con formato inválido', async ({ request }) => {
    const res = await request.post(API + '/deudas', {
      data: { cliente: 'EF02 Cliente', monto: 500, fecha_vencimiento: '31-31-2026', estado: 'mora' }
    });
    console.log('Status recibido con fecha inválida:', res.status());
    expect(res.status()).not.toBe(201);
  });

  test('EF-03 — Error en datos/BD: integridad del JOIN operador-ticket', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'EF03 Cliente', monto: 500, fecha_vencimiento: fechaHaceNDias(5) } });
    const { id: deudaId3 } = await d.json();
    const t = await request.post(API + '/tickets', { data: { deuda_id: deudaId3 } });
    const ticketBody = await t.json();

    const opsRes = await request.get(API + '/operadores');
    const operadores = await opsRes.json();
    const operadorReal = operadores.find(o => o.id === ticketBody.operador_id);

    const res = await request.get(API + '/tickets');
    const body = await res.json();
    const ticket = body.find(tk => tk.id === ticketBody.id);
    expect(ticket.operador_nombre).toBe(operadorReal.nombre);
  });

  test('EF-04 — Error de rendimiento: GET /deudas responde en menos de 1 segundo', async ({ request }) => {
    const inicio = Date.now();
    await request.get(API + '/deudas');
    const duracion = Date.now() - inicio;
    console.log('Tiempo de respuesta:', duracion, 'ms');
    expect(duracion).toBeLessThan(1000);
  });

  test('EF-05 — Error de inicio/cierre: el servidor responde inmediatamente', async ({ request }) => {
    const res = await request.get(API + '/deudas');
    expect(res.status()).toBe(200);
  });

});


// ==================== COMPLEJIDAD CICLOMÁTICA — POST /tickets (V(G) = 4) ====================
// Las 4 rutas independientes que cubren toda la lógica de decisión del endpoint

test.describe('COMPLEJIDAD CICLOMÁTICA — POST /tickets (V(G) = 4)', () => {

  test('CC-01 — Ruta 1 (1-2-3-11): falta el campo deuda_id → retorna 400', async ({ request }) => {
    const res = await request.post(API + '/tickets', { data: { prioridad: 'alta' } });
    expect(res.status()).toBe(400);
  });

  test('CC-02 — Ruta 2 (1-2-4-5-6-11): deuda_id no existe en la BD → retorna 404', async ({ request }) => {
    const res = await request.post(API + '/tickets', { data: { deuda_id: 999999 } });
    expect(res.status()).toBe(404);
  });

  test('CC-03 — Ruta 3 (1-2-4-5-7-8-9-11): sin operadores disponibles → retorna 400', async ({ request }) => {
    const d = await request.post(API + '/deudas', { data: { cliente: 'CC03 Cliente', monto: 700, fecha_vencimiento: '2026-01-01' } });
    const { id: deudaId2 } = await d.json();

    const opsRes = await request.get(API + '/operadores');
    const operadores = await opsRes.json();
    const habilitados = operadores.filter(o => o.disponible);

    for (const o of habilitados) {
      await request.put(API + `/operadores/${o.id}`, { data: { disponible: false } });
    }

    const res = await request.post(API + '/tickets', { data: { deuda_id: deudaId2 } });
    expect(res.status()).toBe(400);

    for (const o of habilitados) {
      await request.put(API + `/operadores/${o.id}`, { data: { disponible: true } });
    }
  });

  test('CC-04 — Ruta 4 (1-2-4-5-7-8-10-11): todo válido → ticket creado con 201', async ({ request }) => {
    await request.post(API + '/operadores', { data: { nombre: 'Operador CC04', disponible: true } });
    const d = await request.post(API + '/deudas', { data: { cliente: 'CC04 Cliente', monto: 700, fecha_vencimiento: '2026-01-01' } });
    const { id: deudaId3 } = await d.json();

    const res = await request.post(API + '/tickets', { data: { deuda_id: deudaId3 } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('operador_id');
  });

});