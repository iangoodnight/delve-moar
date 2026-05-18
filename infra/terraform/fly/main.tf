# ---------------------------------------------------------------------------
# Fly app
# ---------------------------------------------------------------------------
resource "fly_app" "api" {
  name = var.app_name
  org  = "personal"
}

# Dedicated IPv4 (shared IPv4 is free but requires port 443 routing; dedicated
# simplifies the health-check and custom-domain setup).
resource "fly_ip" "api_v4" {
  app        = fly_app.api.name
  type       = "v4"
  depends_on = [fly_app.api]
}

resource "fly_ip" "api_v6" {
  app        = fly_app.api.name
  type       = "v6"
  depends_on = [fly_app.api]
}

# ---------------------------------------------------------------------------
# Fly Postgres cluster
#
# Postgres is provisioned separately via `fly postgres create` and attached
# with `fly postgres attach`. Terraform records the cluster as a data source
# so the app name is a single source of truth, but lifecycle management
# (backups, failover, version upgrades) stays with flyctl to avoid Terraform
# state holding connection credentials.
# ---------------------------------------------------------------------------
resource "fly_app" "db" {
  name = var.postgres_app_name
  org  = "personal"
}
