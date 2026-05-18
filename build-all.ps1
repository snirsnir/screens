$base = Join-Path $PSScriptRoot "builds"

$screens = @(
    @{ dir = "outside-building";  label = "Screen 1 - Outside Building" },
    @{ dir = "technoda-entrance"; label = "Screen 2 - Technoda Entrance" },
    @{ dir = "lobby";             label = "Screen 3 - Lobby" },
    @{ dir = "reception";         label = "Screen 4 - Reception" }
)

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host " TechnoDa Screens - Build All" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$i = 1
foreach ($screen in $screens) {
    Write-Host ""
    Write-Host "[$i/4] $($screen.label)..." -ForegroundColor Yellow
    $path = Join-Path $base $screen.dir
    Push-Location $path
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      OK" -ForegroundColor Green
    } else {
        Write-Host "      FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
    Pop-Location
    $i++
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host " Done! EXEs are in:"
foreach ($screen in $screens) {
    $exe = Get-ChildItem (Join-Path $base "$($screen.dir)\dist\*.exe") -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($exe) {
        Write-Host "  $($exe.FullName)" -ForegroundColor Green
    }
}
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
