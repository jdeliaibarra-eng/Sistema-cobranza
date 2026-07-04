const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'deudas_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

// ==================== MÓDULO: DEUDAS (ya existía) ====================

app.get('/deudas', async (req, res) => {
  const result = await pool.query('SELECT * FROM deudas ORDER BY id');
  res.json(result.rows);
});

app.get('/deudas/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM deudas WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json(result.rows[0]);
});

app.post('/deudas', async (req, res) => {
  const campos = Object.keys(req.body);
  const valores = Object.values(req.body);
  if (campos.length === 0) return res.status(400).json({ error: 'Datos requeridos' });
  const placeholders = campos.map((_, i) => '$' + (i + 1)).join(', ');
  const sql = 'INSERT INTO deudas (' + campos.join(', ') + ') VALUES (' + placeholders + ') RETURNING *';
  const result = await pool.query(sql, valores);
  res.status(201).json(result.rows[0]);
});

app.put('/deudas/:id', async (req, res) => {
  const campos = Object.keys(req.body);
  const valores = Object.values(req.body);
  if (campos.length === 0) return res.status(400).json({ error: 'Datos requeridos' });
  const set = campos.map((c, i) => c + ' = $' + (i + 1)).join(', ');
  valores.push(req.params.id);
  const sql = 'UPDATE deudas SET ' + set + ' WHERE id = $' + valores.length + ' RETURNING *';
  const result = await pool.query(sql, valores);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json(result.rows[0]);
});

// Elimina una deuda junto con sus tickets y gestiones asociadas (integridad referencial)
app.delete('/deudas/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deuda = await client.query('SELECT * FROM deudas WHERE id = $1', [req.params.id]);
    if (deuda.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    await client.query(
      'DELETE FROM gestiones WHERE ticket_id IN (SELECT id FROM tickets WHERE deuda_id = $1)',
      [req.params.id]
    );
    await client.query('DELETE FROM tickets WHERE deuda_id = $1', [req.params.id]);
    const result = await client.query('DELETE FROM deudas WHERE id = $1 RETURNING *', [req.params.id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Eliminado correctamente (junto con tickets y gestiones asociadas)', registro: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'No se pudo eliminar la deuda', detalle: err.message });
  } finally {
    client.release();
  }
});

// ==================== MÓDULO: CÁLCULO DE INTERESES (RF-003) ====================
// Calcula interés corriente + moratorio de una deuda específica

app.get('/deudas/:id/interes', async (req, res) => {
  const result = await pool.query('SELECT * FROM deudas WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

  const deuda = result.rows[0];
  const hoy = new Date();
  const vencimiento = new Date(deuda.fecha_vencimiento);
  const diasAtraso = Math.max(0, Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24)));

  const monto = parseFloat(deuda.monto);
  const tasaCorriente = parseFloat(deuda.tasa_interes_corriente);
  const tasaMoratoria = parseFloat(deuda.tasa_interes_moratorio);

  const interesCorriente = monto * tasaCorriente * diasAtraso;
  const interesMoratorio = diasAtraso > 0 ? monto * tasaMoratoria * diasAtraso : 0;
  const montoActualizado = monto + interesCorriente + interesMoratorio;

  // RF-004: determinar tipo de cobranza según días de atraso
  let tipoCobranza = 'preventiva';
  if (diasAtraso > 60) tipoCobranza = 'judicial';
  else if (diasAtraso > 15) tipoCobranza = 'intensiva';

  res.json({
    deuda_id: deuda.id,
    cliente: deuda.cliente,
    monto_original: monto,
    dias_atraso: diasAtraso,
    interes_corriente: interesCorriente.toFixed(2),
    interes_moratorio: interesMoratorio.toFixed(2),
    monto_actualizado: montoActualizado.toFixed(2),
    tipo_cobranza_sugerido: tipoCobranza
  });
});

// ==================== MÓDULO: OPERADORES ====================

app.get('/operadores', async (req, res) => {
  const result = await pool.query('SELECT * FROM operadores ORDER BY id');
  res.json(result.rows);
});

app.post('/operadores', async (req, res) => {
  const { nombre, disponible, carga_actual } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const result = await pool.query(
    'INSERT INTO operadores (nombre, disponible, carga_actual) VALUES ($1, $2, $3) RETURNING *',
    [nombre, disponible ?? true, carga_actual ?? 0]
  );
  res.status(201).json(result.rows[0]);
});

app.put('/operadores/:id', async (req, res) => {
  const campos = Object.keys(req.body);
  const valores = Object.values(req.body);
  if (campos.length === 0) return res.status(400).json({ error: 'Datos requeridos' });
  const set = campos.map((c, i) => c + ' = $' + (i + 1)).join(', ');
  valores.push(req.params.id);
  const sql = 'UPDATE operadores SET ' + set + ' WHERE id = $' + valores.length + ' RETURNING *';
  const result = await pool.query(sql, valores);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json(result.rows[0]);
});

// Elimina un operador; los tickets que tenía asignados quedan sin operador (operador_id = NULL)
app.delete('/operadores/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const operador = await client.query('SELECT * FROM operadores WHERE id = $1', [req.params.id]);
    if (operador.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    await client.query('UPDATE tickets SET operador_id = NULL WHERE operador_id = $1', [req.params.id]);
    const result = await client.query('DELETE FROM operadores WHERE id = $1 RETURNING *', [req.params.id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Operador eliminado (sus tickets quedaron sin asignar)', registro: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'No se pudo eliminar el operador', detalle: err.message });
  } finally {
    client.release();
  }
});

// ==================== MÓDULO: FABRICACIÓN Y ASIGNACIÓN DE TICKETS (RF-005 a RF-008) ====================

app.get('/tickets', async (req, res) => {
  const result = await pool.query(`
    SELECT t.*, d.cliente, d.monto, o.nombre AS operador_nombre
    FROM tickets t
    JOIN deudas d ON t.deuda_id = d.id
    LEFT JOIN operadores o ON t.operador_id = o.id
    ORDER BY t.id
  `);
  res.json(result.rows);
});

// RF-005, RF-006, RF-007, RF-008, RNR-002, RNR-003: generar ticket SOLO si hay operador disponible
app.post('/tickets', async (req, res) => {
  const { deuda_id, prioridad } = req.body;
  if (!deuda_id) return res.status(400).json({ error: 'deuda_id requerido' });

  // Verificar que la deuda existe
  const deuda = await pool.query('SELECT * FROM deudas WHERE id = $1', [deuda_id]);
  if (deuda.rows.length === 0) return res.status(404).json({ error: 'Deuda no encontrada' });

  // RF-006 / RNR-002: buscar operador disponible con menor carga
  const operador = await pool.query(
    'SELECT * FROM operadores WHERE disponible = true ORDER BY carga_actual ASC LIMIT 1'
  );
  if (operador.rows.length === 0) {
    return res.status(400).json({ error: 'No hay operadores disponibles. No se puede generar el ticket.' });
  }

  const operadorAsignado = operador.rows[0];

  // Crear el ticket ya asignado (Fabricación + Asignación en un solo paso, simplificado)
  const nuevoTicket = await pool.query(
    'INSERT INTO tickets (deuda_id, operador_id, prioridad, estado) VALUES ($1, $2, $3, $4) RETURNING *',
    [deuda_id, operadorAsignado.id, prioridad || 'media', 'abierto']
  );

  // Aumentar la carga del operador asignado
  await pool.query('UPDATE operadores SET carga_actual = carga_actual + 1 WHERE id = $1', [operadorAsignado.id]);

  res.status(201).json(nuevoTicket.rows[0]);
});

app.put('/tickets/:id', async (req, res) => {
  const campos = Object.keys(req.body);
  const valores = Object.values(req.body);
  if (campos.length === 0) return res.status(400).json({ error: 'Datos requeridos' });
  const set = campos.map((c, i) => c + ' = $' + (i + 1)).join(', ');
  valores.push(req.params.id);
  const sql = 'UPDATE tickets SET ' + set + ' WHERE id = $' + valores.length + ' RETURNING *';
  const result = await pool.query(sql, valores);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json(result.rows[0]);
});

// Elimina un ticket junto con las gestiones registradas sobre él
app.delete('/tickets/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ticket = await client.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (ticket.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    await client.query('DELETE FROM gestiones WHERE ticket_id = $1', [req.params.id]);
    const result = await client.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [req.params.id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Ticket eliminado (junto con sus gestiones asociadas)', registro: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'No se pudo eliminar el ticket', detalle: err.message });
  } finally {
    client.release();
  }
});

// ==================== MÓDULO: HOSTIGAMIENTO / GESTIONES (RF-009 a RF-013) ====================

app.get('/gestiones', async (req, res) => {
  const result = await pool.query(`
    SELECT g.*, t.deuda_id
    FROM gestiones g
    JOIN tickets t ON g.ticket_id = t.id
    ORDER BY g.id
  `);
  res.json(result.rows);
});

// RF-009 a RF-013: registrar una acción de cobranza (llamada, correo, sms_whatsapp, carta_judicial)
app.post('/gestiones', async (req, res) => {
  const { ticket_id, canal, resultado, observaciones } = req.body;
  if (!ticket_id || !canal || !resultado) {
    return res.status(400).json({ error: 'ticket_id, canal y resultado son requeridos' });
  }

  // RNR-003: verificar que el ticket exista antes de registrar la gestión
  const ticket = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticket_id]);
  if (ticket.rows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

  const nuevaGestion = await pool.query(
    'INSERT INTO gestiones (ticket_id, canal, resultado, observaciones) VALUES ($1, $2, $3, $4) RETURNING *',
    [ticket_id, canal, resultado, observaciones || null]
  );

  // Si el resultado fue positivo, cerramos el ticket automáticamente
  if (resultado === 'promesa_pago' || resultado === 'pagado') {
    await pool.query('UPDATE tickets SET estado = $1 WHERE id = $2', ['cerrado', ticket_id]);
  }

  res.status(201).json(nuevaGestion.rows[0]);
});

// Elimina un registro de gestión individual (corrección de errores de digitación)
app.delete('/gestiones/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM gestiones WHERE id = $1 RETURNING *', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ mensaje: 'Gestión eliminada correctamente', registro: result.rows[0] });
});

// Historial completo de gestiones de una deuda específica (RUS-002)
app.get('/deudas/:id/historial', async (req, res) => {
  const result = await pool.query(`
    SELECT g.*
    FROM gestiones g
    JOIN tickets t ON g.ticket_id = t.id
    WHERE t.deuda_id = $1
    ORDER BY g.fecha_gestion
  `, [req.params.id]);
  res.json(result.rows);
});

// Servir la interfaz web en la raíz (http://localhost:3000)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));