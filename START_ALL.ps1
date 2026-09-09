# One-command local startup for the CIS stack. It starts PostgreSQL, Redis,
# Python intelligence, Fastify, BullMQ workers, and Vite in visible windows.
[CmdletBinding()]
param([switch]$SkipPythonInstall)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$backendDir = Join-Path $repoRoot 'Backend'
$apiDir = Join-Path $backendDir 'apps\api'
$intelligenceDir = Join-Path $backendDir 'apps\intelligence'
$frontendDir = Join-Path $repoRoot 'Frontend'
$nodeBin = Join-Path $backendDir 'node_modules\.bin'
$tsx = Join-Path $nodeBin 'tsx.cmd'
$prisma = Join-Path $nodeBin 'prisma.cmd'
$vite = Join-Path $frontendDir 'node_modules\.bin\vite.cmd'

function Require-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "'$name' is not installed or is not on PATH. Install it, then run this launcher again."
  }
}

function Read-DotEnv([string]$path) {
  $values = @{}
  Get-Content -LiteralPath $path | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
      $values[$matches[1].Trim()] = $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $values
}

function Test-Http([string]$url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch { return $false }
}

function Wait-Http([string]$name, [string]$url) {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    if (Test-Http $url) {
      Write-Host "  $name is ready: $url" -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 1
  }
  throw "$name did not become ready at $url. Check its service window for details."
}

function Start-ServiceWindow([string]$name, [string]$workingDirectory, [string]$command, [string]$healthUrl) {
  if (Test-Http $healthUrl) {
    Write-Host "  $name is already running." -ForegroundColor Yellow
    return
  }
  $process = Start-Process -FilePath 'powershell.exe' -WorkingDirectory $workingDirectory -PassThru -ArgumentList @(
    '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $command
  )
  Write-Host "  Started $name (PID $($process.Id))." -ForegroundColor Cyan
  Wait-Http $name $healthUrl
}

Require-Command docker
Require-Command python
if (-not (Test-Path $tsx) -or -not (Test-Path $prisma) -or -not (Test-Path $vite)) {
  throw 'Node dependencies are missing. Run `npm install` in Backend and Frontend, then retry.'
}

$composeEnvPath = Join-Path $backendDir '.env'
$apiEnvPath = Join-Path $apiDir '.env'
if (-not (Test-Path $composeEnvPath) -or -not (Test-Path $apiEnvPath)) {
  throw 'Missing Backend/.env or Backend/apps/api/.env. Copy their .env.sample files first.'
}
$composeEnv = Read-DotEnv $composeEnvPath
foreach ($key in 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB') {
  if ([string]::IsNullOrWhiteSpace($composeEnv[$key])) { throw "Backend/.env is missing $key." }
}

# Docker Compose and API processes inherit this same connection string. This
# avoids the DB authentication mismatch that otherwise looks like an API bug.
$env:PORT = '3000'
$env:DATABASE_URL = "postgresql://$($composeEnv.POSTGRES_USER):$($composeEnv.POSTGRES_PASSWORD)@localhost:5432/$($composeEnv.POSTGRES_DB)"
$env:REDIS_URL = 'redis://localhost:6379'
$env:INTELLIGENCE_API_URL = 'http://localhost:8000'
$env:INTELLIGENCE_PORT = '8000'
$env:VITE_DATA_MODE = 'api'
$env:VITE_API_BASE_URL = 'http://localhost:3000'

Write-Host "`nStarting local CIS stack..." -ForegroundColor White
Push-Location $backendDir
try {
  & docker compose --env-file .env up -d
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not start PostgreSQL and Redis.' }
} finally { Pop-Location }

$postgresReady = $false
$redisReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  $postgresReady = Test-NetConnection -ComputerName '127.0.0.1' -Port 5432 -InformationLevel Quiet
  $redisReady = Test-NetConnection -ComputerName '127.0.0.1' -Port 6379 -InformationLevel Quiet
  if ($postgresReady -and $redisReady) { break }
  Start-Sleep -Seconds 1
}
if (-not $postgresReady -or -not $redisReady) {
  throw 'PostgreSQL or Redis did not open its expected local port. Run `docker compose logs` from Backend.'
}

Write-Host '  Applying database migrations...' -ForegroundColor Cyan
Push-Location $apiDir
try {
  & $prisma migrate deploy --config prisma7.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'Prisma migration failed.' }
} finally { Pop-Location }

$venvPython = Join-Path $intelligenceDir '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
  Write-Host '  Creating Python virtual environment...' -ForegroundColor Cyan
  Push-Location $intelligenceDir
  try { & python -m venv .venv } finally { Pop-Location }
}
if (-not $SkipPythonInstall) {
  & $venvPython -c 'import fastapi, uvicorn, networkx, pydantic_settings' 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host '  Installing Python intelligence dependencies...' -ForegroundColor Cyan
    & $venvPython -m pip install --disable-pip-version-check -r (Join-Path $intelligenceDir 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
  }
}

Start-ServiceWindow 'Python intelligence service' $intelligenceDir "& '$venvPython' -m uvicorn app.main:app --host 127.0.0.1 --port 8000" 'http://127.0.0.1:8000/health'
Start-ServiceWindow 'Fastify API' $apiDir "& '$tsx' src/server.ts" 'http://127.0.0.1:3000/health'

# BullMQ has no HTTP endpoint; it deliberately gets its own console so job
# failures remain visible instead of silently blocking the frontend.
$worker = Start-Process -FilePath 'powershell.exe' -WorkingDirectory $apiDir -PassThru -ArgumentList @(
  '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "& '$tsx' src/worker.ts"
)
Write-Host "  Started BullMQ worker (PID $($worker.Id))." -ForegroundColor Cyan
Start-ServiceWindow 'Vite frontend' $frontendDir "& '$vite' --host 127.0.0.1 --port 5173" 'http://127.0.0.1:5173'

Write-Host "`nReady. Open http://127.0.0.1:5173" -ForegroundColor Green
Write-Host 'Keep the service windows open while using the application.' -ForegroundColor Yellow
