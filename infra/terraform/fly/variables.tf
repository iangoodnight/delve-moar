variable "app_name" {
  description = "Fly app name (must match fly.toml)."
  type        = string
  default     = "delvemoar-api"
}

variable "region" {
  description = "Primary Fly region."
  type        = string
  default     = "iad"
}
