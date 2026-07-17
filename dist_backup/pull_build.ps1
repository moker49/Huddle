Set-Location (Join-Path $PSScriptRoot "..")
git pull
npx expo export --platform web
Copy-Item (Join-Path $PSScriptRoot "web.config") (Join-Path $PSScriptRoot "..\dist\web.config") -Force
Import-Module WebAdministration -ErrorAction Stop
$siteName = "Huddle"
$targetPath = (Resolve-Path (Join-Path $PSScriptRoot "..\dist")).Path
$site = Get-Website -Name $siteName -ErrorAction Stop
$currentPath = $site.PhysicalPath
if ($currentPath.TrimEnd('\') -ne $targetPath.TrimEnd('\')) {
  $appcmd = Join-Path $env:windir "System32\inetsrv\appcmd.exe"
  & $appcmd set vdir "$siteName/" "/physicalPath:$targetPath"
  & $appcmd stop site /site.name:"$siteName"
  & $appcmd start site /site.name:"$siteName"
}
