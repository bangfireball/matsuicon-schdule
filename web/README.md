# Matsuricon 2026 Web Schedule

Static, mobile-first website version of the Matsuricon 2026 schedule.

## Features

- Phone-friendly schedule cards
- Search across session text
- Filters by day, location, track, type/tag, and bookmarked-only
- Bookmarks saved in browser local storage; no accounts or backend
- User dashboard with bookmark count, days planned, scheduled hours, and personal agenda
- Bookmark export/import JSON
- Docker/Nginx deployment

## Run locally

From this `web` folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Docker build and run

```bash
docker build -t matsuricon-2026-web .
docker run --rm -p 8080:80 matsuricon-2026-web
```

Open `http://localhost:8080`.

## Deploy to a domain

Build the image and run it behind your reverse proxy, or publish it to your registry:

```bash
docker build -t your-registry/matsuricon-2026-web:latest .
docker push your-registry/matsuricon-2026-web:latest
```

The container serves HTTP on internal port `80`. The included Docker Compose file maps it to host port `8080` so it will not conflict with anything already using host port 80.

## Docker Compose

```bash
docker compose up -d --build
```

Open `http://SERVER_IP:8080` or point your reverse proxy/domain to `127.0.0.1:8080`.
