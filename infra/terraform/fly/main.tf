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
# The Postgres cluster is intentionally NOT managed by Terraform. Fly's
# `fly postgres create` command creates a special cluster app type that
# cannot be pre-created as a plain fly_app without blocking the command.
# Lifecycle management (create, attach, backups, upgrades) stays with
# flyctl to keep credentials out of Terraform state.
#
#   fly postgres create \
#     --name delvemoar-db --region iad \
#     --initial-cluster-size 1 \
#     --vm-size shared-cpu-1x --volume-size 1
#   fly postgres attach delvemoar-db --app delvemoar-api
# ---------------------------------------------------------------------------
