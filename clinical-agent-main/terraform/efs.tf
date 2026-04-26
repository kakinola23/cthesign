resource "aws_security_group" "efs" {
  name   = "${var.project_name}-efs-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-efs-sg" }
}

resource "aws_efs_file_system" "chroma" {
  creation_token = "${var.project_name}-chroma"
  tags = { Name = "${var.project_name}-chroma" }
}

resource "aws_efs_mount_target" "chroma_1" {
  file_system_id  = aws_efs_file_system.chroma.id
  subnet_id       = aws_subnet.public_1.id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "chroma_2" {
  file_system_id  = aws_efs_file_system.chroma.id
  subnet_id       = aws_subnet.public_2.id
  security_groups = [aws_security_group.efs.id]
}