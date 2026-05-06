# API Response Contract

All JSON endpoints return consistent envelopes for frontend and AI-agent clients.

Success response:

```json
{ "data": {}, "requestId": "req-..." }
```

Error response:

```json
{
  "error": "validation_error",
  "code": "validation_error",
  "message": "One or more fields are invalid",
  "requestId": "req-...",
  "fieldErrors": { "email": ["Required"] }
}
```

Pagination metadata:

```json
{ "page": 1, "pageSize": 20, "total": 100, "hasNext": true }
```

Rules:
- `code` is canonical; `error` mirrors it during frontend transition.
- Validation errors use `fieldErrors` keyed by request field name.
- `requestId` must be present for support/debugging.
- Page size is bounded server-side.
