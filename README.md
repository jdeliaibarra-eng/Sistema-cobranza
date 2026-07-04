# Sistema de Cobranza — Grupo 2

Proyecto académico del curso **GE709V — Sistemas de Calidad** (UNI).
Sistema de gestión de cobranza de deudas en mora: registro de deudores, cálculo de intereses, generación y asignación de tickets a operadores, y registro de gestiones de cobranza (llamadas, correos, SMS/WhatsApp, cartas judiciales).

## Tecnologías

- Backend: Node.js + Express
- Base de datos: PostgreSQL
- Frontend: HTML + JavaScript (sin frameworks)
- Pruebas automatizadas: Cypress + Playwright

## Requisitos previos

- [Node.js LTS](https://nodejs.org)
- [Git](https://git-scm.com/downloads)

Para la instalación habitual también necesitas [PostgreSQL 17](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).

Para la instalación con Docker solo necesitas [Docker Desktop](https://www.docker.com/products/docker-desktop/).

---

## Instalación

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/jdeliaibarra-eng/Sistema-cobranza.git
cd Sistema-cobranza
npm install
npx playwright install chromium
```

---

## Camino A — Instalación habitual (PostgreSQL local)

### 2A. Crear la base de datos

```bash
psql -U postgres
CREATE DATABASE deudas_db;
\q
```

### 3A. Cargar la estructura de las tablas

```bash
psql -U postgres -d deudas_db -f estructura_deudas_db.sql
```

### 4A. Configurar la conexión (opcional)

Por defecto `server.js` usa:

| Variable | Valor por defecto |
|----------|-------------------|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `DB_NAME` | `deudas_db` |

Si tu PostgreSQL local usa otra contraseña, puedes exportar variables de entorno antes de iniciar:

```bash
# Windows (PowerShell)
$env:DB_PASSWORD="tu_contraseña"
npm start

# Linux / macOS
DB_PASSWORD=tu_contraseña npm start
```

---

## Camino B — Instalación con Docker (sin instalar PostgreSQL)

Ideal para validar el sistema sin instalar PostgreSQL en tu máquina.

### 2B. Levantar PostgreSQL con Docker

```bash
npm run docker:up
```

Esto inicia PostgreSQL 17 y carga automáticamente `estructura_deudas_db.sql` al crear el contenedor por primera vez.

Verificar que el contenedor esté listo:

```bash
docker compose ps
```

Debe mostrar `healthy` en la columna de estado.

### 3B. Detener Docker cuando termines

```bash
npm run docker:down
```

> **Nota:** Si ya tienes PostgreSQL instalado localmente en el puerto 5432, detén ese servicio antes de usar Docker, o cambia el puerto en `docker-compose.yml`.

---

## Ejecución

### Levantar el servidor

```bash
npm start
```

Debe mostrar: `Servidor corriendo en http://localhost:3000`

### Abrir el frontend

Abre en el navegador: **http://localhost:3000**

Ahí verás la interfaz del Sistema de Cobranza (pestañas Deudas, Operadores, Tickets, Gestiones).

> También puedes abrir `index.html` directamente, pero se recomienda usar `http://localhost:3000` con el servidor activo.

### Verificar que la API responde

```bash
curl http://localhost:3000/deudas
```

Debe retornar un arreglo JSON (vacío `[]` si no hay deudas registradas).

---

## Módulos del sistema

| Módulo             | Endpoint                | Descripción                                                      |
| ------------------ | ----------------------- | ---------------------------------------------------------------- |
| Deudas             | `/deudas`               | CRUD de deudas registradas                                       |
| Cálculo de interés | `/deudas/:id/interes`   | Calcula interés corriente + moratorio y sugiere tipo de cobranza |
| Operadores         | `/operadores`           | CRUD de operadores de cobranza                                   |
| Tickets            | `/tickets`              | Generación y asignación automática de tickets                    |
| Gestiones          | `/gestiones`            | Registro de acciones de cobranza (hostigamiento)                 |
| Historial          | `/deudas/:id/historial` | Historial de gestiones de una deuda                              |

---

## Ejecutar las pruebas

**Requisito:** El servidor debe estar corriendo (`npm start`) y la base de datos disponible (local o Docker).

### Cypress (pruebas API)

```bash
npm run test:cypress
```

Reporte HTML en `cypress/reports/`.

### Playwright (pruebas API)

```bash
npm run test:playwright
```

Reporte HTML en `playwright-report/index.html`.

### Ambas suites (consolidación)

```bash
npm run test:all
```

---

## Factores de calidad (exposición PC4)

Sustentación de los factores de McCall asignados a este módulo del proyecto.

### 1. Interoperabilidad

El sistema expone una **API REST** en JSON sobre HTTP (`localhost:3000`) que actúa como contrato de comunicación entre componentes:

- El **frontend** (`index.html`) consume los endpoints mediante `fetch()`.
- Las **pruebas automatizadas** (Cypress y Playwright) validan los mismos endpoints sin depender del frontend.
- **CORS** está habilitado en el servidor, permitiendo que clientes externos consuman la API.

Esto demuestra que los módulos (frontend, backend, pruebas) interoperan a través de un protocolo estándar sin acoplamiento directo a la implementación interna.

### 2. Integridad

Según McCall (`CLASE-FACTORES-MC-CALL.txt`), **Integridad** se define como el nivel de protección contra acceso no autorizado, con métricas como checklist de seguridad (autenticación, autorización, roles), tasa de vulnerabilidades e índice OWASP Top 10.

En este prototipo académico **no se implementó autenticación ni autorización**. La sustentación se enfoca en **integridad de datos**: garantizar que la información intercambiada entre módulos sea coherente y sin errores, alineado con la justificación del anexo McCall para sistemas de integración (*"deben intercambiar datos sin errores, bajo estándares aceptados"*).

**Base de datos (PostgreSQL):**
- Claves primarias en las 4 tablas (`deudas`, `operadores`, `tickets`, `gestiones`).
- Claves foráneas: `tickets.deuda_id → deudas.id`, `tickets.operador_id → operadores.id`, `gestiones.ticket_id → tickets.id`.
- Restricciones `NOT NULL` en campos obligatorios.

**Aplicación (Express):**
- Validación de campos requeridos antes de insertar (retorna `400` si faltan datos).
- Verificación de existencia de registros relacionados (retorna `404` si no existen).
- Cierre automático de tickets tras gestión con resultado `promesa_pago` o `pagado`.

**Evidencia en pruebas:** EF-03 (coherencia del JOIN operador-ticket), TC-13 (cierre automático), EF-02 (rechazo de fecha inválida).

**Para la exposición:** aclarar que McCall mide Integridad principalmente como seguridad; en este proyecto se demuestra integridad referencial y validaciones como complemento verificable del factor.

### 3. Portabilidad

El sistema puede ejecutarse en distintos entornos sin modificar el código fuente:

- **Variables de entorno** en `server.js` (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) desacoplan la configuración del código.
- **Docker** (`docker-compose.yml`) permite levantar PostgreSQL 17 con el esquema precargado, sin instalar la base de datos localmente.
- Los valores por defecto mantienen compatibilidad con la instalación habitual.

Un integrante puede usar PostgreSQL local; otro puede usar Docker; ambos ejecutan el mismo `server.js` sin cambios.

### 4. Automatización y consolidación (Cypress + Playwright)

El proyecto implementa **dos frameworks de prueba** que validan la misma API REST:

| Framework  | Archivo de pruebas        | Casos | Reporte              |
| ---------- | ------------------------- | ----- | -------------------- |
| Cypress    | `cypress/e2e/deudas.cy.js` | ~35   | `cypress/reports/`   |
| Playwright | `deudas.spec.js`          | ~35   | `playwright-report/` |

**Tipos de prueba cubiertos:**
- Pruebas funcionales (CRUD de todos los módulos).
- Valor de frontera (límites en 15 y 60 días de atraso).
- Pruebas de bucles (iteraciones en construcción de INSERT).
- Complejidad ciclomática (4 rutas independientes de `POST /tickets`).
- Flujo de datos DEF/USE (variable `diasAtraso`).
- 5 tipos de error de caja negra.

**Consolidación:** el script `npm run test:all` ejecuta ambas suites secuencialmente, generando evidencia reproducible para la exposición.

### Resultados de verificación

| Suite | Total | Pasando | Fallando |
|-------|-------|---------|----------|
| Cypress | 39 | 35 | 4 |
| Playwright | 38 | 34 | 4 |

Las 4 pruebas que fallan (VF-03, VF-06, VF-09, DF-01) son **fallas preexistentes** relacionadas con el cálculo de `diasAtraso` en `server.js`: la función `fechaHaceNDias()` genera fechas en UTC, pero el servidor calcula en hora local, causando un desfase de ±1 día en los límites de frontera. No están relacionadas con los cambios de Docker ni variables de entorno. Se documentan aquí sin ocultar para transparencia en la exposición.

---

## Integrantes — Grupo 2

- (agregar nombres del equipo)

## Curso

GE709V — Sistemas de Calidad, Universidad Nacional de Ingeniería (UNI)
