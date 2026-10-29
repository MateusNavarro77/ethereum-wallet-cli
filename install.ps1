$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repo = 'MateusNavarro77/ethereum-wallet-cli'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\TermiWallet'
$asset = if ([Environment]::Is64BitOperatingSystem -and $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
  'termiwallet-windows-arm64.exe'
} elseif ([Environment]::Is64BitOperatingSystem) {
  'termiwallet-windows-x64.exe'
} else {
  throw 'TermiWallet requires 64-bit Windows.'
}

Write-Host ''
Write-Host 'TermiWallet installer' -ForegroundColor Cyan
Write-Host 'Welcome! This will download and install TermiWallet.'
Write-Host ''

$tempFile = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString() + '.exe')
try {
  Write-Host "[1/3] Downloading the latest $asset build..." -ForegroundColor Yellow
  Invoke-WebRequest -Uri "https://github.com/$repo/releases/latest/download/$asset" -OutFile $tempFile

  Write-Host "[2/3] Installing to $installDir..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
  Move-Item -Path $tempFile -Destination (Join-Path $installDir 'termiwallet.exe') -Force

  Write-Host '[3/3] Adding TermiWallet to your user PATH...' -ForegroundColor Yellow
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $pathEntries = @($userPath -split ';' | Where-Object { $_ })
  if ($pathEntries -notcontains $installDir) {
    $newPath = (@($pathEntries) + $installDir) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    $env:Path = "$env:Path;$installDir"
    Write-Host 'Added the install directory to your user PATH.'
  } else {
    Write-Host 'The install directory is already on your user PATH.'
  }

  Write-Host ''
  Write-Host 'TermiWallet is installed! Start it with: termiwallet' -ForegroundColor Green
  Write-Host 'Open a new terminal window if the command is not available yet.'
} finally {
  if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
}
