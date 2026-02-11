CRM Kanban

Requisitos: Node.js v20+, MongoDB (Local o Atlas).

1. Clonar el proyecto:
   git clone https://github.com/JomarArias/kanbanboard.git

2. Configurar el Backend:

   cd backend
   npm install

   Crear un archivo .env con la variable:
   MONGO_URI=()

   npm run dev

3. Configurar el Frontend:

   cd frontend
   npm install
   ng serve

---

API REST (Backend)

Base URL: http://localhost:3000

Listar tarjetas por columna
GET /lists/:listId/cards

Ejemplo:
GET /lists/todo/cards
GET /lists/inProgress/cards
GET /lists/done/cards

Listar historial de acciones (mas reciente primero)
GET /audit-logs?limit=100&offset=0

Notas:
- `limit` es opcional (default `100`, maximo `500`).
- `offset` es opcional (default `0`).
- El historial se registra automaticamente al crear, actualizar, eliminar o mover tarjetas.

Crear tarjeta (LexoRank server-side)
POST /cards
Content-Type: application/json

Body:
{
  "listId": "todo",
  "title": "Mi tarjeta",
  "task": "Detalle de la tarea"
}

Actualizar tarjeta
PUT /cards/:id
Content-Type: application/json

Body:
{
  "title": "Titulo actualizado",
  "task": "Detalle actualizado"
}

Eliminar tarjeta
DELETE /cards/:id

Mover tarjeta (entre columnas o reordenar)
PUT /cards/move
Content-Type: application/json

Body (ejemplo mover al inicio de una columna con tarjetas):
{
  "cardId": "ID_DE_LA_TARJETA",
  "listId": "inProgress",
  "prevOrder": null,
  "nextOrder": "ORDER_DE_LA_PRIMERA_TARJETA"
}

Notas:
- listId debe ser uno de: todo, inProgress, done (por ahora columnas fijas).
- prevOrder/nextOrder permiten reordenar dentro de una columna.
- Si la lista destino no esta vacia, no se permite enviar ambos `prevOrder` y `nextOrder` en `null`.
- El frontend usara HttpClient para consumir estos endpoints.
