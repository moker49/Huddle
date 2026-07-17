Set-Location (Join-Path $PSScriptRoot "..")
git pull
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Import-Module WebAdministration -ErrorAction Stop
$siteName = "Huddle"
$targetPath = (Resolve-Path $PSScriptRoot).Path
$site = Get-Website -Name $siteName -ErrorAction Stop
$currentPath = $site.PhysicalPath
if ($currentPath.TrimEnd('\') -ne $targetPath.TrimEnd('\')) {
  $appcmd = Join-Path $env:windir "System32\inetsrv\appcmd.exe"
  & $appcmd set vdir "$siteName/" "/physicalPath:$targetPath"
  & $appcmd stop site /site.name:"$siteName"
  & $appcmd start site /site.name:"$siteName"
}
$env:BROWSER = "none"
npx expo start --web --host lan
