param([string]$OutputDirectory = "backups")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $destination "academia-$stamp.sql"
docker compose -f (Join-Path $root "docker-compose.yml") exec -T postgres pg_dump -U academia -d academia --clean --if-exists | Set-Content -Encoding utf8 $file
if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar o backup." }
Write-Output "Backup criado em $file"
