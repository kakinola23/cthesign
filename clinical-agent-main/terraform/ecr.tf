resource "aws_ecr_repository" "backend" {
  name         = "${var.project_name}-backend"
  force_delete = true
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = { Name = "${var.project_name}-backend" }
}

resource "aws_ecr_repository" "frontend" {
  name         = "${var.project_name}-frontend"
  force_delete = true
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = { Name = "${var.project_name}-frontend" }
}

output "backend_ecr_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  value = aws_ecr_repository.frontend.repository_url
}