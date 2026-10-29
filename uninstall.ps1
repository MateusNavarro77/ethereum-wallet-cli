$ErrorActionPreference = 'Stop'

$installDir = Join-Path $env:LOCALAPPDATA 'Programs\TermiWallet'
$binary = Join-Path $installDir 'termiwallet.exe'
$vaultDir = if ($env:TERMIWALLET_HOME) { $env:TERMIWALLET_HOME } else { Join-Path $HOME '.termiwallet' }

Write-Host ''
Write-Host 'TermiWallet uninstaller' -ForegroundColor Cyan
Write-Host 'Thanks for using TermiWallet.'
Write-Host ''

if (Test-Path $binary) {
  Write-Host '[1/2] Removing executable...' -ForegroundColor Yellow
  Remove-Item $binary -Force
} else {
  Write-Host "[1/2] No executable found at $binary."
}
if (Test-Path $installDir) { Remove-Item $installDir -Force -ErrorAction SilentlyContinue }

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$remainingPath = @($userPath -split ';' | Where-Object { $_ -and $_ -ne $installDir }) -join ';'
[Environment]::SetEnvironmentVariable('Path', $remainingPath, 'User')

Write-Host ''
Write-Host 'Would you also like to delete the wallet data directory?' -ForegroundColor Yellow
Write-Host "Directory: $vaultDir"
Write-Host 'WARNING: This permanently deletes your encrypted wallet and account data.' -ForegroundColor Red
Write-Host 'This action cannot be undone. Make sure you have a verified recovery phrase or backup.' -ForegroundColor Red
$answer = Read-Host 'Delete wallet data? Type DELETE to confirm'

if ($answer -ceq 'DELETE') {
  if (Test-Path $vaultDir) {
    Write-Host '[2/2] Deleting wallet data...' -ForegroundColor Yellow
    Remove-Item $vaultDir -Recurse -Force
    Write-Host 'Wallet data deleted.' -ForegroundColor Green
  } else {
    Write-Host '[2/2] No wallet data directory found.'
  }
} else {
  Write-Host '[2/2] Wallet data preserved.'
}

Write-Host ''
Write-Host 'TermiWallet has been uninstalled.' -ForegroundColor Green
