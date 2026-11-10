$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$siteUrl = 'http://127.0.0.1:55321/'
$siteReady = $false
try { $response = Invoke-WebRequest -Uri $siteUrl -TimeoutSec 2; $siteReady = $response.StatusCode -eq 200 -and $response.Content.Contains('Multica · 设计前后对照') } catch {}
if (-not $siteReady) {
  Start-Process -FilePath 'node.exe' -ArgumentList 'serve.mjs' -WorkingDirectory $siteRoot -WindowStyle Hidden
  for ($attempt=0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 200
    try { $response = Invoke-WebRequest -Uri $siteUrl -TimeoutSec 2; if ($response.StatusCode -eq 200 -and $response.Content.Contains('Multica · 设计前后对照')) { $siteReady=$true; break } } catch {}
  }
}
if ($siteReady) { Start-Process $siteUrl } else { Write-Error '站点未启动，请在此目录执行 node serve.mjs 查看原因。' }
