[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BackupFile,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Container = 'gestao_projetos_postgres'
$Database = 'gestao_projetos_db'
$DatabaseUser = 'postgres'

try {
    $ResolvedBackup = (Resolve-Path -LiteralPath $BackupFile -ErrorAction Stop).Path
    $Extension = [System.IO.Path]::GetExtension($ResolvedBackup).ToLowerInvariant()
    if ($Extension -notin @('.dump', '.sql')) { throw 'Formato inválido. Use um arquivo .dump ou .sql.' }

    Write-Warning "A restauração substituirá objetos e dados existentes em '$Database'."
    if (-not $Force) {
        $Confirmation = Read-Host "Digite RESTAURAR para continuar"
        if ($Confirmation -cne 'RESTAURAR') { Write-Host 'Restauração cancelada.'; exit 0 }
    }

    docker inspect $Container *> $null
    if ($LASTEXITCODE -ne 0) { throw "Container '$Container' não encontrado ou Docker indisponível." }

    $RemoteFile = "/tmp/orbyto_restore_$([guid]::NewGuid().ToString('N'))$Extension"
    docker cp $ResolvedBackup "${Container}:$RemoteFile"
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível copiar o backup para o container.' }

    try {
        if ($Extension -eq '.dump') {
            docker exec $Container pg_restore -U $DatabaseUser -d $Database --clean --if-exists --no-owner --no-privileges $RemoteFile
        } else {
            docker exec $Container psql -U $DatabaseUser -d $Database -v ON_ERROR_STOP=1 -f $RemoteFile
        }
        if ($LASTEXITCODE -ne 0) { throw "A ferramenta de restauração terminou com código $LASTEXITCODE." }
    } finally {
        docker exec $Container rm -f $RemoteFile *> $null
    }

    Write-Host 'Restauração concluída com sucesso.' -ForegroundColor Green
} catch {
    Write-Error "Falha na restauração: $($_.Exception.Message)"
    exit 1
}
