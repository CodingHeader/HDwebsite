$proc = Start-Process -FilePath 'powershell' -ArgumentList '-Command','cd e:/Code/Demo/HDwebsite/hdwebsite; npm run dev' -PassThru -WindowStyle Hidden
$proc.Id | Out-File 'e:/Code/Demo/HDwebsite/hdwebsite/.dev.pid' -Encoding utf8
Start-Sleep 15
Write-Output "PID=$($proc.Id)"
