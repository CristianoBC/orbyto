[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Container = 'gestao_projetos_postgres'

Write-Host '=== Containers do projeto ==='
docker compose -f (Join-Path $ProjectRoot 'docker-compose.yml') ps

Write-Host "`n=== Conexão PostgreSQL ==="
docker exec $Container pg_isready -U postgres -d gestao_projetos_db

foreach ($Item in @(
    @{ Name = 'Backups'; Path = (Join-Path $ProjectRoot 'backups') },
    @{ Name = 'Uploads da API'; Path = (Join-Path $ProjectRoot 'apps\api\storage\uploads') },
    @{ Name = 'Uploads pela raiz'; Path = (Join-Path $ProjectRoot 'storage\uploads') }
)) {
    if (Test-Path -LiteralPath $Item.Path) {
        $Files = @(Get-ChildItem -LiteralPath $Item.Path -File -Recurse -ErrorAction SilentlyContinue)
        $Bytes = ($Files | Measure-Object -Property Length -Sum).Sum
        if ($null -eq $Bytes) { $Bytes = 0 }
        Write-Host ("{0}: {1} arquivo(s), {2:N2} MB" -f $Item.Name, $Files.Count, ($Bytes / 1MB))
    } else { Write-Host "$($Item.Name): pasta inexistente" }
}

Write-Host "`n=== Prisma validate ==="
Push-Location $ProjectRoot
try { npm run db:validate } finally { Pop-Location }
