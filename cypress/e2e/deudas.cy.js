const API = 'http://localhost:3000';
let deudaId, operadorId, ticketId;

describe('SISTEMA DE COBRANZA', () => {

  // ---------- MÓDULO OPERADORES ----------
  it('TC-01 — POST /operadores: crear operador', () => {
    cy.request('POST', API + '/operadores', { nombre: 'Ana Torres', disponible: true }).then(res => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('id');
      operadorId = res.body.id;
    });
  });

  it('TC-02 — GET /operadores: listar operadores', () => {
    cy.request('GET', API + '/operadores').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
    });
  });

  // ---------- MÓDULO DEUDAS ----------
  it('TC-03 — POST /deudas: crear deuda', () => {
    cy.request('POST', API + '/deudas', {
      cliente: 'Empresa ABC S.A.C.',
      monto: 15000.5,
      fecha_vencimiento: '2026-01-01',
      estado: 'mora',
      descripcion: 'Cuota de préstamo vencida'
    }).then(res => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('id');
      deudaId = res.body.id;
    });
  });

  it('TC-04 — GET /deudas: listar deudas', () => {
    cy.request('GET', API + '/deudas').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
    });
  });

  it('TC-05 — GET /deudas/:id: obtener deuda por ID', () => {
    cy.request('GET', API + '/deudas/' + deudaId).then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('id', deudaId);
    });
  });

  it('TC-06 — POST /deudas datos incompletos debe retornar 400', () => {
    cy.request({ method: 'POST', url: API + '/deudas', body: {}, failOnStatusCode: false }).then(res => {
      expect(res.status).to.eq(400);
    });
  });

  // ---------- MÓDULO CÁLCULO DE INTERÉS ----------
  it('TC-07 — GET /deudas/:id/interes: calcular interés', () => {
    cy.request('GET', API + '/deudas/' + deudaId + '/interes').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('monto_actualizado');
      expect(res.body).to.have.property('tipo_cobranza_sugerido');
    });
  });

  it('TC-08 — GET /deudas/:id/interes con ID inexistente debe retornar 404', () => {
    cy.request({ method: 'GET', url: API + '/deudas/999999/interes', failOnStatusCode: false }).then(res => {
      expect(res.status).to.eq(404);
    });
  });

  // ---------- MÓDULO TICKETS ----------
  it('TC-09 — POST /tickets: generar ticket con operador disponible', () => {
    cy.request('POST', API + '/tickets', { deuda_id: deudaId, prioridad: 'alta' }).then(res => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('operador_id');
      ticketId = res.body.id;
    });
  });

  it('TC-10 — GET /tickets: listar tickets con datos de deuda y operador', () => {
    cy.request('GET', API + '/tickets').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
      const encontrado = res.body.find(t => t.id === ticketId);
      expect(encontrado).to.have.property('operador_nombre');
    });
  });

  it('TC-11 — POST /tickets con deuda_id inexistente debe retornar 404', () => {
    cy.request({ method: 'POST', url: API + '/tickets', body: { deuda_id: 999999 }, failOnStatusCode: false }).then(res => {
      expect(res.status).to.eq(404);
    });
  });

  // ---------- MÓDULO GESTIONES (HOSTIGAMIENTO) ----------
  it('TC-12 — POST /gestiones: registrar gestión con resultado "promesa_pago"', () => {
    cy.request('POST', API + '/gestiones', {
      ticket_id: ticketId,
      canal: 'llamada',
      resultado: 'promesa_pago',
      observaciones: 'Cliente promete pagar en 5 días'
    }).then(res => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('id');
    });
  });

  it('TC-13 — Verificar que el ticket se cerró automáticamente tras promesa_pago', () => {
    cy.request('GET', API + '/tickets').then(res => {
      const ticket = res.body.find(t => t.id === ticketId);
      expect(ticket.estado).to.eq('cerrado');
    });
  });

  it('TC-14 — POST /gestiones con ticket_id inexistente debe retornar 404', () => {
    cy.request({ method: 'POST', url: API + '/gestiones', body: { ticket_id: 999999, canal: 'correo', resultado: 'contactado' }, failOnStatusCode: false }).then(res => {
      expect(res.status).to.eq(404);
    });
  });

  it('TC-15 — GET /deudas/:id/historial: consultar historial de gestiones', () => {
    cy.request('GET', API + '/deudas/' + deudaId + '/historial').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
    });
  });

});

// ==================== SUITE 2: VALOR DE FRONTERA, BUCLES Y RUTAS INDEPENDIENTES ====================

function fechaHaceNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('PRUEBAS AVANZADAS — Valor de Frontera, Bucles y Rutas Independientes', () => {

  // ---------- VALOR DE FRONTERA: frontera en 15 días (preventiva/intensiva) ----------
  it('VF-01 — 14 días de atraso → tipo_cobranza = preventiva', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 14', monto: 1000, fecha_vencimiento: fechaHaceNDias(14), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(res.body.tipo_cobranza_sugerido).to.eq('preventiva'));
  });

  it('VF-02 — 15 días de atraso (límite exacto) → tipo_cobranza = preventiva', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 15', monto: 1000, fecha_vencimiento: fechaHaceNDias(15), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(res.body.tipo_cobranza_sugerido).to.eq('preventiva'));
  });

  it('VF-03 — 16 días de atraso (justo encima) → tipo_cobranza = intensiva', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 16', monto: 1000, fecha_vencimiento: fechaHaceNDias(16), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(res.body.tipo_cobranza_sugerido).to.eq('intensiva'));
  });

  // ---------- VALOR DE FRONTERA: frontera en 60 días (intensiva/judicial) ----------
  it('VF-04 — 59 días de atraso → tipo_cobranza = intensiva', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 59', monto: 1000, fecha_vencimiento: fechaHaceNDias(59), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(res.body.tipo_cobranza_sugerido).to.eq('intensiva'));
  });

  it('VF-05 — 60 días de atraso (límite exacto) → tipo_cobranza = intensiva', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 60', monto: 1000, fecha_vencimiento: fechaHaceNDias(60), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(res.body.tipo_cobranza_sugerido).to.eq('intensiva'));
  });

  it('VF-06 — 61 días de atraso (justo encima) → tipo_cobranza = judicial', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 61', monto: 1000, fecha_vencimiento: fechaHaceNDias(61), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(res.body.tipo_cobranza_sugerido).to.eq('judicial'));
  });

  // ---------- VALOR DE FRONTERA: mínimo absoluto (deuda al día / futura) ----------
  it('VF-07 — Fecha de vencimiento futura → interés moratorio = 0 (protegido por Math.max)', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente Futuro', monto: 1000, fecha_vencimiento: fechaHaceNDias(-5), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(parseFloat(res.body.interes_moratorio)).to.eq(0));
  });

  it('VF-08 — 0 días de atraso (vence hoy) → tipo_cobranza = preventiva, interés = 0', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente Hoy', monto: 1000, fecha_vencimiento: fechaHaceNDias(0), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => {
        expect(res.body.tipo_cobranza_sugerido).to.eq('preventiva');
        expect(parseFloat(res.body.interes_moratorio)).to.eq(0);
      });
  });

  it('VF-09 — 1 día de atraso (justo encima del mínimo) → interés > 0', () => {
    cy.request('POST', API + '/deudas', { cliente: 'VF Cliente 1dia', monto: 1000, fecha_vencimiento: fechaHaceNDias(1), estado: 'mora' })
      .then(res => cy.request('GET', API + `/deudas/${res.body.id}/interes`))
      .then(res => expect(parseFloat(res.body.interes_moratorio)).to.be.greaterThan(0));
  });

  // ---------- PRUEBAS DE BUCLES: iteraciones del map() en la construcción del INSERT ----------
  it('PB-01 — 0 iteraciones: body vacío no entra al bucle map(), corta antes con 400', () => {
    cy.request({ method: 'POST', url: API + '/deudas', body: {}, failOnStatusCode: false })
      .then(res => expect(res.status).to.eq(400));
  });

  it('PB-02 — 3 iteraciones: solo los campos obligatorios mínimos', () => {
    cy.request('POST', API + '/deudas', { cliente: 'PB Cliente Min', monto: 500, fecha_vencimiento: fechaHaceNDias(5) })
      .then(res => expect(res.status).to.eq(201));
  });

  it('PB-03 — 6 iteraciones: todos los campos posibles de la deuda', () => {
    cy.request('POST', API + '/deudas', {
      cliente: 'PB Cliente Completo', monto: 800, fecha_vencimiento: fechaHaceNDias(3),
      estado: 'mora', descripcion: 'Prueba de bucle con todos los campos', calificacion_crediticia: 'alta'
    }).then(res => expect(res.status).to.eq(201));
  });

  // ---------- RUTA INDEPENDIENTE 3: generar ticket SIN operadores disponibles ----------
  it('RI-03 — POST /tickets sin operadores disponibles debe retornar 400', () => {
    cy.request('POST', API + '/deudas', { cliente: 'RI3 Cliente', monto: 700, fecha_vencimiento: fechaHaceNDias(10) }).then(deuda => {
      const deudaTemp = deuda.body.id;
      cy.request('GET', API + '/operadores').then(res => {
        const habilitados = res.body.filter(o => o.disponible);
        habilitados.forEach(o => cy.request('PUT', API + `/operadores/${o.id}`, { disponible: false }));
        cy.request({ method: 'POST', url: API + '/tickets', body: { deuda_id: deudaTemp }, failOnStatusCode: false }).then(res2 => {
          expect(res2.status).to.eq(400);
          // Restaurar operadores para no romper otras pruebas
          habilitados.forEach(o => cy.request('PUT', API + `/operadores/${o.id}`, { disponible: true }));
        });
      });
    });
  });

});


// ==================== SUITE 3: FLUJO DE DATOS Y LOS 5 TIPOS DE ERROR DE CAJA NEGRA ====================

describe('PRUEBAS DE FLUJO DE DATOS (DEF/USE) — variable diasAtraso', () => {

  it('DF-01 — Una sola definición de diasAtraso debe producir salidas consistentes en sus 4 usos', () => {
    // diasAtraso = 20 → cae en la clase "intensiva" (15 < 20 <= 60)
    cy.request('POST', API + '/deudas', {
      cliente: 'DF Cliente 20dias', monto: 2000, fecha_vencimiento: fechaHaceNDias(20), estado: 'mora'
    }).then(deuda => {
      cy.request('GET', API + `/deudas/${deuda.body.id}/interes`).then(res => {
        // USE en línea 4: interés corriente debe ser > 0 (mismo diasAtraso)
        expect(parseFloat(res.body.interes_corriente)).to.be.greaterThan(0);
        // USE en línea 5: interés moratorio debe ser > 0 (mismo diasAtraso)
        expect(parseFloat(res.body.interes_moratorio)).to.be.greaterThan(0);
        // USE en línea 6 (¿>60?): debe ser falso → no es judicial
        expect(res.body.tipo_cobranza_sugerido).to.not.eq('judicial');
        // USE en línea 7 (¿>15?): debe ser verdadero → es intensiva
        expect(res.body.tipo_cobranza_sugerido).to.eq('intensiva');
        // Los días de atraso reportados deben coincidir con la definición original
        expect(res.body.dias_atraso).to.eq(20);
      });
    });
  });

});

describe('LOS 5 TIPOS DE ERROR DE CAJA NEGRA ', () => {

  it('EF-01 — Función incorrecta o faltante: el cierre automático de ticket debe ejecutarse', () => {
    cy.request('POST', API + '/operadores', { nombre: 'Operador EF01', disponible: true }).then(() => {
      cy.request('POST', API + '/deudas', { cliente: 'EF01 Cliente', monto: 500, fecha_vencimiento: fechaHaceNDias(5) }).then(deuda => {
        cy.request('POST', API + '/tickets', { deuda_id: deuda.body.id }).then(ticket => {
          cy.request('POST', API + '/gestiones', { ticket_id: ticket.body.id, canal: 'correo', resultado: 'promesa_pago' }).then(() => {
            cy.request('GET', API + '/tickets').then(res => {
              const t = res.body.find(t => t.id === ticket.body.id);
              expect(t.estado).to.eq('cerrado'); // La función de cierre automático SÍ existe y funciona
            });
          });
        });
      });
    });
  });

  it('EF-02 — Error de interfaz: fecha con formato inválido no debe crear un registro corrupto silenciosamente', () => {
    cy.request({
      method: 'POST', url: API + '/deudas',
      body: { cliente: 'EF02 Cliente', monto: 500, fecha_vencimiento: '31-31-2026', estado: 'mora' },
      failOnStatusCode: false
    }).then(res => {
      // Documentamos el comportamiento real: el sistema NO valida el formato de fecha
      // Se espera que falle (400/500) en vez de aceptarlo silenciosamente como 201
      cy.log('Status recibido con fecha inválida: ' + res.status);
      expect(res.status).to.not.eq(201);
    });
  });

  it('EF-03 — Error en datos/BD: el operador mostrado en el ticket debe coincidir con el operador real asignado', () => {
    cy.request('POST', API + '/deudas', { cliente: 'EF03 Cliente', monto: 500, fecha_vencimiento: fechaHaceNDias(5) }).then(deuda => {
      cy.request('POST', API + '/tickets', { deuda_id: deuda.body.id }).then(ticket => {
        cy.request('GET', API + '/operadores').then(ops => {
          const operadorReal = ops.body.find(o => o.id === ticket.body.operador_id);
          cy.request('GET', API + '/tickets').then(res => {
            const t = res.body.find(t => t.id === ticket.body.id);
            expect(t.operador_nombre).to.eq(operadorReal.nombre); // Integridad del JOIN
          });
        });
      });
    });
  });

  it('EF-04 — Error de comportamiento/rendimiento: GET /deudas debe responder en menos de 1 segundo', () => {
    const inicio = Date.now();
    cy.request('GET', API + '/deudas').then(() => {
      const duracion = Date.now() - inicio;
      cy.log('Tiempo de respuesta: ' + duracion + 'ms');
      expect(duracion).to.be.lessThan(1000);
    });
  });

  it('EF-05 — Error de inicio/cierre: el servidor debe responder inmediatamente sin necesitar "calentamiento"', () => {
    cy.request('GET', API + '/deudas').then(res => {
      expect(res.status).to.eq(200);
    });
  });

});