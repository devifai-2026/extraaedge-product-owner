# Grafana for the ExtraaEdge product-owner observability dashboards.
# Bakes in the provisioned Postgres datasource + dashboards. Runtime config
# (anonymous viewer, embedding, datasource credentials) comes from env vars set
# on the Render service — no secrets in the image.
FROM grafana/grafana:11.1.4

# Provisioning: datasource + dashboard provider are read at startup.
COPY provisioning /etc/grafana/provisioning
# Dashboard JSON the provider loads.
COPY dashboards /var/lib/grafana/dashboards

# Grafana listens on 3000; Render sets $PORT — the entrypoint below maps it.
EXPOSE 3000
