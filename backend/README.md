# Matsuricon Backend

Small Node HTTP API for schedule data, future app updates, and basic visit logging.

## Endpoints

- `GET /api/health` - health check
- `GET /api/schedule` - full schedule JSON
- `GET /api/sessions` - alias for full schedule JSON
- `GET /api/stats` - counts and filter values
- `POST /api/visit` - app/site visit event logging
- `POST /api/admin/reload` - reload schedule from disk

Logs are written as JSON lines to `/logs/access.jsonl` in Docker.

## Docker

Normally run through `web/docker-compose.yml` from the `web` folder:

```bash
docker compose up -d --build
```

The website proxies `/api/` requests to this backend internally.
