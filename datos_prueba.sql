-- ============================================
-- DATOS DE PRUEBA - Sistema de Cobranza (Grupo 2)
-- ============================================

-- 1. OPERADORES
INSERT INTO public.operadores (nombre, disponible, carga_actual) VALUES
('Ana Torres', true, 2),
('Luis Ramírez', true, 0),
('Carla Mendoza', false, 5),
('Jorge Salinas', true, 1),
('Patricia Vega', true, 3);

-- 2. DEUDAS
INSERT INTO public.deudas (cliente, monto, fecha_vencimiento, estado, descripcion, calificacion_crediticia, tasa_interes_corriente, tasa_interes_moratorio, tipo_cobranza) VALUES
('María López', 2500.00, '2026-05-10', 'mora', 'Préstamo personal', 'baja', 0.00090, 0.00180, 'judicial'),
('Pedro Gómez', 850.50, '2026-06-01', 'mora', 'Tarjeta de crédito', 'media', 0.00080, 0.00150, 'intensiva'),
('Sofía Ramírez', 4200.00, '2026-06-15', 'mora', 'Crédito vehicular', 'alta', 0.00070, 0.00130, 'preventiva'),
('Carlos Fernández', 1200.00, '2026-04-20', 'mora', 'Préstamo personal', 'baja', 0.00095, 0.00190, 'judicial'),
('Lucía Herrera', 320.00, '2026-06-25', 'mora', 'Tarjeta de crédito', 'media', 0.00080, 0.00150, 'preventiva'),
('Diego Castro', 6100.00, '2026-03-30', 'mora', 'Crédito hipotecario', 'alta', 0.00060, 0.00120, 'judicial'),
('Valeria Suárez', 980.00, '2026-06-28', 'mora', 'Tarjeta de crédito', 'media', 0.00080, 0.00150, 'intensiva'),
('Andrés Paredes', 1750.00, '2026-05-05', 'mora', 'Préstamo personal', 'baja', 0.00090, 0.00180, 'judicial'),
('Elena Rojas', 430.00, '2026-06-30', 'al_dia', 'Tarjeta de crédito', 'media', 0.00080, 0.00150, 'preventiva'),
('Fernando Quispe', 2900.00, '2026-05-22', 'mora', 'Crédito vehicular', 'media', 0.00080, 0.00150, 'intensiva');

-- 3. TICKETS
INSERT INTO public.tickets (deuda_id, operador_id, prioridad, estado, fecha_creacion) VALUES
(1, 1, 'alta', 'abierto', '2026-06-20 09:15:00'),
(2, 4, 'media', 'abierto', '2026-06-21 10:30:00'),
(3, 5, 'baja', 'cerrado', '2026-06-18 08:00:00'),
(4, 1, 'alta', 'abierto', '2026-06-22 11:45:00'),
(5, 2, 'media', 'en_proceso', '2026-06-25 14:00:00'),
(6, 3, 'alta', 'abierto', '2026-06-15 09:00:00'),
(7, 4, 'media', 'en_proceso', '2026-06-28 16:20:00'),
(8, 5, 'alta', 'cerrado', '2026-05-06 10:00:00'),
(10, 1, 'media', 'abierto', '2026-06-23 12:10:00');

-- 4. GESTIONES
INSERT INTO public.gestiones (ticket_id, canal, resultado, fecha_gestion, observaciones) VALUES
(1, 'llamada', 'sin_respuesta', '2026-06-20 10:00:00', 'No contestó, se reintentará en 2 días'),
(1, 'correo', 'enviado', '2026-06-21 09:00:00', 'Se envió recordatorio con estado de cuenta'),
(2, 'whatsapp', 'compromiso_pago', '2026-06-21 11:00:00', 'Cliente indica que pagará el 30/06'),
(3, 'carta_judicial', 'entregado', '2026-06-18 09:30:00', 'Carta notarial entregada en domicilio'),
(4, 'llamada', 'contactado', '2026-06-22 12:00:00', 'Cliente solicita refinanciamiento'),
(5, 'sms', 'enviado', '2026-06-25 15:00:00', 'Recordatorio automático de pago'),
(6, 'carta_judicial', 'en_proceso', '2026-06-16 10:00:00', 'Derivado a asesoría legal'),
(7, 'whatsapp', 'sin_respuesta', '2026-06-29 09:40:00', 'Mensaje entregado, sin respuesta aún'),
(8, 'llamada', 'pagado', '2026-05-07 11:20:00', 'Cliente regularizó el pago total'),
(9, 'correo', 'enviado', '2026-06-23 13:00:00', 'Notificación de mora enviada');
