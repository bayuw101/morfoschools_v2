# API Documentation Strategy

`docs/api/openapi.yaml` is the source of truth for HTTP API contracts.

For every new backend API module:

1. Add or update endpoint paths, request DTOs, response DTOs, error responses, and security requirements in OpenAPI.
2. Add frontend wiring notes beside the implementation or module review.
3. Add or update the AI Tool Manifest entry when the endpoint can be invoked by an agent.
4. Keep examples free of real credentials, tokens, and secrets.

This satisfies the project rule that every API must be wired to FE and documented in Markdown/OpenAPI for clear reusable API docs.
