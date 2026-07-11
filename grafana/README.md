# ExtraaEdge Grafana — product-owner observability

Real Grafana, deployed on Render, reading the `metrics_*` views in the **system
Postgres** (the same DB `extraaedge-server` uses). The product-owner React app
embeds these dashboards via iframe (Analytics tab).

## What it shows
- **API observability** — request volume/min, p50/p95/p99 latency, error rate,
  status classes (2xx/4xx/5xx), slowest endpoints.
- **Platform analytics** — active tenants (requests/hr), tenant roster + plan,
  tenant growth, open support tickets.

Data comes from `platform_request_log` + system tables via read-only views
(migrations `1700000012000` + `1700000013000` in `extraaedge-server`). No secrets
or request/response bodies are exposed — only the curated views.

## One-time setup

### 1. Create the read-only DB role
Run `sql/grafana_ro.sql` against the **system** database (Render → system
Postgres → PSQL Command / external `psql`). Replace the placeholder password.

### 2. Deploy the Grafana service on Render
Either **Blueprint** (New → Blueprint → this repo → it reads `grafana/render.yaml`),
or a **Docker web service** with Root Directory = `grafana/`.

Set these env vars (the `sync:false` ones):
| Var | Value |
|-----|-------|
| `GF_SECURITY_ADMIN_PASSWORD` | a strong admin password |
| `GF_DS_PG_HOST` | system Postgres host (Render internal host) |
| `GF_DS_PG_DB` | system database name |
| `GF_DS_PG_PASSWORD` | the `grafana_ro` password from step 1 |
| `GF_SERVER_ROOT_URL` | the Grafana service URL (e.g. `https://extraaedge-grafana.onrender.com`) |

`GF_DS_PG_USER` defaults to `grafana_ro`, `GF_DS_PG_PORT` to `5432`.

> Anonymous **Viewer** + `allow_embedding` are on so the portal can iframe panels
> without a second login. The admin login is only for managing Grafana. If the
> metrics must not be public, restrict the service at the network level.

### 3. Point the portal at Grafana
In `extraaedge-product-owner`, set the build-time env var
`VITE_GRAFANA_URL=https://extraaedge-grafana.onrender.com` (or edit
`src/lib/config.js`). The Analytics page embeds
`${VITE_GRAFANA_URL}/d/api-observability/...?kiosk`.

## Local dev
```
docker build -t ee-grafana ./grafana
docker run -p 3001:3000 \
  -e GF_DS_PG_HOST=... -e GF_DS_PG_DB=... -e GF_DS_PG_PASSWORD=... \
  -e GF_AUTH_ANONYMOUS_ENABLED=true -e GF_SECURITY_ALLOW_EMBEDDING=true \
  ee-grafana
```
