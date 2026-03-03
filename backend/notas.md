# ALCANCE

- Fase 1
    dueDate (fecha de vencimiento).
    labels (nombre + color predefinido).
    cardStyle solo color de fondo.

- Fase 2
    Imagen para la tarjeta 


Paso 2: Definición de contrato de datos

labels: Array<{ id: string; name: string; color: string }>
dueDate: string | null // ISO
style: { backgroundType: "default" | "color"; backgroundColor: string | null }

{
  "title": "...",
  "task": "...",
  "expectedVersion": 2,
  "labels": [...],
  "dueDate": "2026-03-01T00:00:00.000Z",
  "style": { "backgroundType": "color", "backgroundColor": "#FEE2E2" }
}


Paso 3: Backend primero (tu parte)

Modificar card.ts con nuevos campos.
Modificar card.service.ts:
createCard y updateCard para persistir/validar nuevos campos.
mantener expectedVersion y 409 conflict.
Modificar card.controller.ts para aceptar payload.
Actualizar request.http con pruebas nuevas.
Actualizar README.md contrato nuevo.

Paso 4: Pruebas manuales backend

Crear tarjeta con defaults.
Actualizar solo labels.
Actualizar dueDate.
Actualizar style color.
Probar conflicto con expectedVersion vieja.

Paso 5: Frontend

Extender modelo de tarjeta.
En “Editar tarjeta”, agregar campos nuevos.
Render labels + color + estado de vencimiento (amarillo/rojo).
Consumir API update con expectedVersion.

Paso 6: Criterios de aceptación

Crear tarjeta sin campos nuevos sigue funcionando.
Editar y guardar labels/dueDate/style persiste en DB.
Vencimiento se pinta correctamente.
Conflictos de edición siguen devolviendo 409.


### A. Alcance y contrato
    Definir campos finales en notas.md.
        Campos por defecto: Titulo, Tarea
        Nuevos campos: Fecha de vencimiento, etiquetas de colores con nombres editable, cambiar el color de la tarjeta

    Definir paleta de colores permitidos para labels.
        Azul, Verde, Rojo, Amarillo, Naranja, Morado 

    Definir paleta de colores permitidos para fondo de tarjeta.
        Azul, Verde, Rojo, Amarillo, Naranja, Morado 

    Confirmar que imagen de fondo queda fuera del MVP 1.
        Imagen de fondo quedara fuera y se integrara en MVP2


#######################################
Checklist MVP (Labels + DueDate + Color de tarjeta)

A. Alcance y contrato

Definir campos finales en notas.md.
Definir paleta de colores permitidos para labels.
Definir paleta de colores permitidos para fondo de tarjeta.
Confirmar que imagen de fondo queda fuera del MVP 1.
B. Backend - Modelo

Editar card.ts:
agregar dueDate: Date | null
agregar labels: [{ id, name, color }]
agregar style: { backgroundType, backgroundColor }
Definir defaults seguros:
dueDate: null
labels: []
style.backgroundType: "default"
style.backgroundColor: null
C. Backend - Validación y negocio

Editar card.service.ts:
createCard debe aceptar y guardar nuevos campos.
updateCard debe aceptar nuevos campos y mantener expectedVersion.
Validar en service:
labels máximo (ej. 10)
label.name no vacío
label.color en paleta permitida
dueDate válido o null
style.backgroundType válido (default|color)
si color, backgroundColor obligatorio y válido
Mantener conflicto 409 con currentCard en update.
D. Backend - Controller

Editar card.controller.ts:
leer nuevos campos en body (dueDate, labels, style)
pasar datos al service en create/update
mantener respuesta de conflicto ya implementada.
E. Backend - Pruebas manuales

Editar request.http:
POST /cards con defaults
PUT /cards/:id solo labels
PUT /cards/:id solo dueDate
PUT /cards/:id solo style color
PUT /cards/:id con expectedVersion vieja (409)
Verificar persistencia con GET /lists/:listId/cards.
F. Documentación

Editar README.md:
documentar nuevos campos en create/update
ejemplos de payload
reglas de validación principales
mantener nota de expectedVersion.
G. Frontend - Modelo

Editar kanban.model.ts:
agregar dueDate, labels, style.
Asegurar mapping DTO -> modelo en servicio facade.
H. Frontend - Editar tarjeta

Editar kanban-board.component.html/.ts:
inputs de labels (preset)
input de fecha
selector color de fondo
Guardar cambios en llamada PUT /cards/:id incluyendo expectedVersion.
Manejar 409 conflict mostrando mensaje y sincronizando tarjeta.
I. Frontend - Render

Editar kanban-card.component.html/.scss:
mostrar chips de labels
aplicar color de fondo
mostrar vencimiento con estado:
amarillo: próximo a vencer
rojo: vencido
J. Cierre de MVP

Flujo completo probado: crear -> editar -> visualizar -> recargar.
Conflicto probado (expectedVersion vieja).
Sin regresión en drag-drop y realtime ya existente.
Si quieres, te hago el siguiente checklist “solo backend” con tareas de 30-60 min cada una para arrancar hoy.