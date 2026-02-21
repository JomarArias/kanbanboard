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
  "task": "Detalle actualizado",
  "expectedVersion": 0
}

En casa que 2 usuarios editen una tarjeta al mismo tiempo
Si `expectedVersion` no coincide con la version actual en base de datos:
- Respuesta: `409 Conflict`
- El backend devuelve `currentCard` para sincronizar y reintentar.

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

-----------------------------------------------------------------

Socket.IO (Realtime moves)

Servidor socket:
- URL: `http://localhost:3000`
- Room unica: `board:default`

Evento cliente -> servidor:
- `card:move:request`

Payload:
```json
{
  "operationId": "uuid-unico-por-operacion",
  "cardId": "MONGO_CARD_ID",
  "targetListId": "todo|inProgress|done",
  "beforeCardId": null,
  "afterCardId": "MONGO_NEIGHBOR_ID",
  "expectedVersion": 0
}
```

Reglas de payload:
- `operationId` es obligatorio y se usa para idempotencia básica.
- `expectedVersion` es obligatorio (`>= 0`).
- `beforeCardId` y `afterCardId` son opcionales.
- Si lista destino no esta vacia, no puedes enviar ambos en `null`.

Eventos servidor -> cliente:
- `card:move:accepted` (solo emisor)
- `card:moved` (broadcast a `board:default`)
- `card:move:rejected` (solo emisor)

Ejemplo `card:move:accepted`:
```json
{
  "operationId": "uuid-unico-por-operacion",
  "cardId": "MONGO_CARD_ID",
  "listId": "inProgress",
  "order": "0|i0000q:",
  "version": 2,
  "updatedAt": "2026-02-16T22:57:18.750Z"
}
```

Ejemplo `card:move:rejected` por conflicto:
```json
{
  "operationId": "uuid-unico-por-operacion",
  "reason": "conflict",
  "message": "La tarjeta cambio y tu vista esta desactualizada",
  "currentCard": {
    "id": "MONGO_CARD_ID",
    "listId": "inProgress",
    "order": "0|i0000q:",
    "version": 2
  }
}
```

Manejo de conflicto recomendado:
1. Recibir `card:move:rejected` con `reason: "conflict"`.
2. Actualizar estado local con `currentCard`.
3. Reintentar move con `expectedVersion` actualizado.

Prueba local sin frontend:
- Script: `backend/socket-test.js`
- Comando: `npm run socket:test`
- Modo estricto (fallar en rejected): `SOCKET_TEST_STRICT=1`

-----------------------------------------------------------------

Actualizacion Fase 1 (dueDate, labels, style)

Base URL API (actual):
- `http://localhost:3000/api`

Campos nuevos en tarjeta:
- `dueDate`: `string | null` (ISO date)
- `labels`: arreglo de objetos `{ id, name, color }`
- `style`: objeto `{ backgroundType, backgroundColor }`

Reglas importantes:
- `labels[].name` es obligatorio (no vacio).
- `labels[].color` debe ser HEX valido (`#RRGGBB`).
- Si `style.backgroundType = "color"`, `backgroundColor` es obligatorio.
- Si `style.backgroundType = "default"`, `backgroundColor` debe ser `null`.
- En `PUT /cards/:id`, `expectedVersion` es obligatorio para control de concurrencia.

Ejemplo update con campos nuevos:
`PUT /api/cards/:id`
```json
{
  "title": "Tarjeta actualizada",
  "task": "Detalle",
  "expectedVersion": 1,
  "dueDate": "2026-03-20T00:00:00.000Z",
  "labels": [
    { "id": "urgent", "name": "Urgente", "color": "#EF4444" },
    { "id": "backend", "name": "Backend", "color": "#3B82F6" }
  ],
  "style": {
    "backgroundType": "color",
    "backgroundColor": "#3B82F6"
  }
}
```

Comportamiento visual en tablero:
- Franja superior con color de tarjeta (`style.backgroundColor`).
- Fecha con semaforo:
- Verde: faltan mas de 2 dias.
- Amarillo: faltan 2 dias o menos.
- Rojo: vencida.
- Labels visibles como barras de color (maximo 4) con tooltip (`label.name`).

Mini checklist QA (Fase 1):
1. Crear tarjeta normal y editar solo `title/task` (debe guardar sin pedir otros campos).
2. Editar solo `dueDate` (debe guardar y mostrar badge de fecha).
3. Editar `style` con color predefinido y personalizado (debe cambiar franja).
4. Agregar labels con nombre+color (deben verse en tarjeta).
5. Intentar guardar label sin nombre (debe bloquearse en frontend).
6. Probar conflicto de version (`expectedVersion` viejo) y validar `409`.
7. Probar edicion de tarjeta antigua sin `version` (debe actualizar con `expectedVersion: 0`).
