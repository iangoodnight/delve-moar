terraform {
  required_version = ">= 1.5"

  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0.23"
    }
  }

  # Terraform Cloud free tier — create an org + workspace at app.terraform.io,
  # then set TF_TOKEN_app_terraform_io in GitHub Actions secrets.
  cloud {
    organization = "delvemoar"

    workspaces {
      name = "delvemoar-fly"
    }
  }
}

provider "fly" {
  # Reads FLY_API_TOKEN from the environment; no hard-coded credentials.
}
