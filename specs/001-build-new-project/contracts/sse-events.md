# SSE Events Contract: Vinki Notifications

**Channel**: `GET /api/notifications/stream`  
**Auth**: JWT cookie `access_token` requerida (JwtCookieGuard)  
**Protocol**: Server-Sent Events (HTTP/1.1 + HTTP/2 compatible)  
**Direction**: Unidireccional servidor → cliente

---

## Connection Lifecycle

1. Cliente hace `GET /api/notifications/stream` con `credentials: 'include'` para enviar cookies.
2. Servidor verifica JWT. Si inválido → 401 y cierra la conexión.
3. Servidor suscribe al `EventEmitter2` filtrando por `userId`.
4. Al cerrar la pestaña / navegador, el evento `'close'` del request cancela el Observable.
5. El cliente implementa reconexión automática con `EventSource` (nativo del browser, retry cada 3s).

---

## Event: `evaluation.completed`

Emitido cuando el job BullMQ de evaluación termina exitosamente.

```
event: evaluation.completed
data: {
  "type": "evaluation.completed",
  "interviewId": 42,
  "evaluationId": 7,
  "message": "¡Tu evaluación está lista! Puedes ver los resultados ahora."
}
```

| Field          | Type     | Description                                                       |
| -------------- | -------- | ----------------------------------------------------------------- |
| `type`         | `string` | Discriminador del evento                                          |
| `interviewId`  | `number` | ID de la entrevista evaluada                                      |
| `evaluationId` | `number` | ID del primer `AnswerEvaluation` creado (para navegación directa) |
| `message`      | `string` | Texto para mostrar en el toast/banner de la UI                    |

**Frontend action**: Mostrar toast con enlace a `/feedback/:interviewId`. Invalidar query cache de `dashboard` y `interviews`.

---

## Event: `evaluation.failed`

Emitido cuando el job BullMQ agotó los 3 reintentos sin éxito.

```
event: evaluation.failed
data: {
  "type": "evaluation.failed",
  "interviewId": 42,
  "message": "Hubo un problema al procesar tu evaluación. El equipo fue notificado."
}
```

| Field         | Type     | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `type`        | `string` | Discriminador del evento                               |
| `interviewId` | `number` | ID de la entrevista afectada                           |
| `message`     | `string` | Texto amigable para el usuario (sin detalles técnicos) |

**Frontend action**: Mostrar banner de error. El campo `evaluationStatus` de la entrevista pasa a `failed` en la DB.

---

## Offline Fallback

Si el usuario **no estaba conectado via SSE** cuando se completó la evaluación:

1. El job worker marca `evaluation_notification_seen = FALSE` en la tabla `interviews`.
2. `GET /api/dashboard` incluye `pendingNotifications: N` en la respuesta.
3. El frontend muestra un badge en la sección "Mis entrevistas" indicando N evaluaciones pendientes de revisar.
4. Al abrir el reporte de la entrevista, el frontend llama `POST /api/interviews/:id/mark-seen`.

---

## Frontend Integration Example

```typescript
// hooks/useNotifications.ts
export function useNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream", {
      withCredentials: true,
    });

    es.addEventListener("evaluation.completed", (e) => {
      const data = JSON.parse(e.data);
      toast.success(data.message, {
        action: {
          label: "Ver resultados",
          onClick: () => navigate(`/feedback/${data.interviewId}`),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    es.addEventListener("evaluation.failed", (e) => {
      const data = JSON.parse(e.data);
      toast.error(data.message);
    });

    es.onerror = () => {
      // EventSource auto-retries every 3s by default
    };

    return () => es.close();
  }, []);
}
```
