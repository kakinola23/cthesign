variable "aws_region" {
  default = "us-east-1"
}

variable "project_name" {
  default = "clinical-agent"
}

variable "google_api_key" {
  description = "Google Gemini API key"
  sensitive   = true
  default     = "AIzaSyC45d52vCheEyikpQaI1kDdDlQzoAyOfkg"
}

variable "backend_cpu" {
  default = "512"
}

variable "backend_memory" {
  default = "1024"
}

variable "frontend_cpu" {
  default = "256"
}

variable "frontend_memory" {
  default = "512"
}

variable "min_capacity" {
  default = 1
}

variable "max_capacity" {
  default = 3
}