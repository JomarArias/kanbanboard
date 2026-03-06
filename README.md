# Dapper Kanban

Un sistema Kanban moderno y sincronizado en tiempo real, diseñado con la identidad visual de Dapper.

## 🚀 Requisitos Previos

Para ejecutar este proyecto en tu entorno local (ya sea Windows, macOS o Linux), solo necesitas tener instalado:

- **Docker** y **Docker Compose** (o Podman con Podman Compose).
- *Opcional pero recomendado:* Git para clonar el repositorio.

No necesitas tener instalados Node.js ni MongoDB localmente, ¡Docker se encarga de todo!

---

## 🛠️ Configuración y Ejecución Rápida

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/JomarArias/kanbanboard.git
   cd kanbanboard
   ```

2. **Levantar el entorno con Docker Compose:**
   Ejecuta el siguiente comando en la raíz del proyecto para construir y arrancar todos los servicios (Frontend, Backend y Base de Datos):
   ```bash
   docker-compose up --build
   ```

   *Nota para usuarios de Podman en Linux (SELinux):* El archivo `docker-compose.yml` ya está configurado con las banderas `:z` en los volúmenes para evitar problemas de permisos.

3. **¡Listo! Accede a la aplicación:**
   - **Frontend:** [http://localhost:4200](http://localhost:4200)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)

---

## 🧪 Usuarios de Prueba (Modo Desarrollo)

El entorno de Docker incluye un sistema de autenticación de desarrollo que *omite* Firebase para facilitar las pruebas locales. Además, la base de datos se inicializa automáticamente ("Seeding") con datos de prueba.

Puedes iniciar sesión o registrarte introduciendo **cualquier correo y contraseña** en la pantalla de Login.

- Si inicias sesión con un correo nuevo, el sistema te auto-creará un Tablero Personal (Workspace) vacío al instante.
- Existen dos usuarios pre-creados con datos en la base de datos si deseas utilizarlos:
  - **Admin:** `admin@test.com` (Contraseña: cualquiera, ej. `123456`)
  - **User:** `user@test.com` (Contraseña: cualquiera, ej. `123456`)

*(Nota: En producción, el sistema requerirá autenticación real validada mediante Firebase).*

---

## 🛑 Detener el entorno

Para detener los contenedores y mantener tus datos guardados:
```bash
docker-compose stop
```

Para detener los contenedores y **borrar** la base de datos local (Reset):
```bash
docker-compose down -v
```

---

## 📡 Documentación de la API REST (Backend)

**Base URL:** `http://localhost:3000`

### Tarjetas (Cards)

- **Listar tarjetas por columna:**
  `GET /api/lists/:listId/cards`
  *(Ej: `/api/lists/todo/cards`)*

- **Crear tarjeta:**
  `POST /api/cards`
  ```json
  {
    "listId": "todo",
    "title": "Mi tarjeta",
    "task": "Detalle de la tarea"
  }
  ```

- **Actualizar tarjeta (Requiere control de concurrencia):**
  `PUT /api/cards/:id`
  ```json
  {
    "title": "Titulo actualizado",
    "task": "Detalle actualizado",
    "expectedVersion": 0,
    "dueDate": "2026-03-20T00:00:00.000Z",
    "labels": [
      { "id": "urgent", "name": "Urgente", "color": "#EF4444" }
    ],
    "style": {
      "backgroundType": "color",
      "backgroundColor": "#3B82F6"
    }
  }
  ```

- **Mover tarjeta (reordenar o cambiar de columna):**
  `PUT /api/cards/move`
  ```json
  {
    "cardId": "ID_DE_LA_TARJETA",
    "listId": "inProgress",
    "prevOrder": null,
    "nextOrder": "ORDER_DE_LA_PRIMERA_TARJETA"
  }
  ```

- **Eliminar tarjeta:**
  `DELETE /api/cards/:id`

### Logs (Historial)

- **Listar historial de acciones:**
  `GET /api/audit-logs?limit=100&offset=0`

---

## ⚡ Socket.IO (Tiempo Real)

El proyecto utiliza Socket.IO para sincronizar los movimientos y ediciones de las tarjetas entre todos los usuarios conectados instantáneamente.

- **URL del Servidor:** `http://localhost:3000`
- **Room por defecto:** Se agrupa por el ID del *Workspace* (Tablero) activo.

**Flujo en Tiempo Real (Ejemplo Move):**
1. Cliente emite evento `card:move:request` con payload que incluye el `expectedVersion`.
2. Servidor valida. Si es exitoso, emite `card:move:accepted` al originador y `card:moved` (broadcast) al resto del Workspace.
3. Si hay conflicto de versiones (otro usuario movió la tarjeta primero), el servidor emite `card:move:rejected` con `reason: "conflict"` y devuelve la tarjeta actualizada para que el cliente reintente sincronizarse.
