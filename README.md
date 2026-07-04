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
- [PostgreSQL 17](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
- [Git](https://git-scm.com/downloads)

## Instalación

### 1. Clonar el repositorio

git clone https://github.com/jdeliaibarra-eng/Sistema-cobranza.git
cd Sistema-cobranza

### 2. Instalar dependencias

npm install
npx playwright install chromium

### 3. Crear la base de datos

set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin
psql -U postgres
CREATE DATABASE deudas_db;
\q

### 4. Cargar la estructura de las tablas

psql -U postgres -d deudas_db -f estructura_deudas_db.sql

### 5. Configurar la contraseña de PostgreSQL

Abrir `server.js` y reemplazar `TU_CONTRASEÑA_AQUI` por tu propia contraseña de postgres:

```javascript
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "deudas_db",
  password: "TU_CONTRASEÑA_AQUI", // ← cambiar aquí
  port: 5432,
});
```

## Ejecución

### Levantar el servidor

node server.js

Debe mostrar: `Servidor corriendo en http://localhost:3000`

### Abrir el frontend

Doble clic en `index.html`, o abrirlo desde el navegador.

## Módulos del sistema

| Módulo             | Endpoint                | Descripción                                                      |
| ------------------ | ----------------------- | ---------------------------------------------------------------- |
| Deudas             | `/deudas`               | CRUD de deudas registradas                                       |
| Cálculo de interés | `/deudas/:id/interes`   | Calcula interés corriente + moratorio y sugiere tipo de cobranza |
| Operadores         | `/operadores`           | CRUD de operadores de cobranza                                   |
| Tickets            | `/tickets`              | Generación y asignación automática de tickets                    |
| Gestiones          | `/gestiones`            | Registro de acciones de cobranza (hostigamiento)                 |
| Historial          | `/deudas/:id/historial` | Historial de gestiones de una deuda                              |

## Ejecutar las pruebas

### Cypress

npx cypress run

Reporte HTML en `cypress/reports/`.

### Playwright

npx playwright test --reporter=html

Reporte HTML en `playwright-report/index.html` (se abre automáticamente).

## Integrantes — Grupo 2

- (agregar nombres del equipo)

## Curso

GE709V — Sistemas de Calidad, Universidad Nacional de Ingeniería (UNI)
