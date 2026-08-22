[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Configuração local. Altere estes valores somente se o ambiente for diferente.
$Container = 'gestao_projetos_postgres'
$Database = 'gestao_projetos_db'
$DatabaseUser = 'postgres'
$OutputDir = Join-Path $PSScriptRoot '..\backups\database'

try {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    $OutputDir = (Resolve-Path $OutputDir).Path
    $Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $OutputFile = Join-Path $OutputDir "orbyto_$Timestamp.dump"

    docker inspect $Container *> $null
    if ($LASTEXITCODE -ne 0) { throw "Container '$Container' não encontrado ou Docker indisponível." }

    Write-Host "Criando backup de '$Database' em $OutputFile ..."
    $Process = New-Object System.Diagnostics.Process
    $Process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $Process.StartInfo.FileName = 'docker'
    $Process.StartInfo.Arguments = "exec $Container pg_dump -U $DatabaseUser -d $Database --format=custom --no-owner --no-privileges"
    $Process.StartInfo.UseShellExecute = $false
    $Process.StartInfo.RedirectStandardOutput = $true
    $Process.StartInfo.RedirectStandardError = $true
    [void]$Process.Start()
    $FileStream = [System.IO.File]::Create($OutputFile)
    try { $Process.StandardOutput.BaseStream.CopyTo($FileStream) } finally { $FileStream.Dispose() }
    $ErrorText = $Process.StandardError.ReadToEnd()
    $Process.WaitForExit()

    if ($Process.ExitCode -ne 0) {
        Remove-Item -LiteralPath $OutputFile -Force -ErrorAction SilentlyContinue
        throw "pg_dump falhou (código $($Process.ExitCode)): $ErrorText"
    }
    if ((Get-Item -LiteralPath $OutputFile).Length -eq 0) {
        Remove-Item -LiteralPath $OutputFile -Force
        throw 'O arquivo gerado estava vazio.'
    }

    Write-Host "Backup concluído: $OutputFile" -ForegroundColor Green
} catch {
    Write-Error "Falha no backup do banco: $($_.Exception.Message)"
    exit 1
}
