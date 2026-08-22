[CmdletBinding()]
param(
    [string]$UploadsPath
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$OutputDir = Join-Path $ProjectRoot 'backups\uploads'

try {
    if (-not $UploadsPath) {
        $Candidates = @(
            (Join-Path $ProjectRoot 'apps\api\storage\uploads'),
            (Join-Path $ProjectRoot 'storage\uploads')
        )
        $WithFiles = @($Candidates | Where-Object { (Test-Path $_ -PathType Container) -and @(Get-ChildItem -LiteralPath $_ -File -Recurse -ErrorAction SilentlyContinue).Count -gt 0 })
        if ($WithFiles.Count -gt 1) { throw "Há anexos em mais de uma pasta. Informe -UploadsPath explicitamente: $($WithFiles -join ', ')" }
        $UploadsPath = if ($WithFiles.Count -eq 1) { $WithFiles[0] } else { $Candidates | Where-Object { Test-Path $_ -PathType Container } | Select-Object -First 1 }
    }
    if (-not $UploadsPath -or -not (Test-Path -LiteralPath $UploadsPath -PathType Container)) {
        Write-Warning 'Pasta de uploads não encontrada; nenhum backup foi criado.'
        exit 0
    }

    $UploadsPath = (Resolve-Path -LiteralPath $UploadsPath).Path
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    $OutputFile = Join-Path $OutputDir "orbyto_uploads_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
    Compress-Archive -LiteralPath $UploadsPath -DestinationPath $OutputFile -CompressionLevel Optimal
    Write-Host "Backup de uploads concluído: $OutputFile" -ForegroundColor Green
    Write-Host "Origem: $UploadsPath"
} catch {
    Write-Error "Falha no backup de uploads: $($_.Exception.Message)"
    exit 1
}
