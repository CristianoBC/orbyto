[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateRange(1, 3650)]
    [int]$DaysToKeep = 30
)

$ErrorActionPreference = 'Stop'
$BackupRoot = Join-Path $PSScriptRoot '..\backups'
if (-not (Test-Path -LiteralPath $BackupRoot -PathType Container)) { Write-Host 'Pasta backups não existe; nada a limpar.'; exit 0 }
$BackupRoot = (Resolve-Path -LiteralPath $BackupRoot).Path
$Cutoff = (Get-Date).AddDays(-$DaysToKeep)
$AllowedExtensions = @('.dump', '.sql', '.zip', '.log')
$Files = @(Get-ChildItem -LiteralPath $BackupRoot -File -Recurse | Where-Object {
    $_.LastWriteTime -lt $Cutoff -and $_.Extension.ToLowerInvariant() -in $AllowedExtensions
})

if ($Files.Count -eq 0) { Write-Host "Nenhum backup com mais de $DaysToKeep dias encontrado."; exit 0 }
foreach ($File in $Files) {
    $FullPath = $File.FullName
    if (-not $FullPath.StartsWith($BackupRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Caminho recusado por segurança: $FullPath"
    }
    if ($PSCmdlet.ShouldProcess($FullPath, 'Remover backup antigo')) {
        Remove-Item -LiteralPath $FullPath -Force
        Write-Host "Removido: $FullPath"
    }
}
