Set-Location (Join-Path $PSScriptRoot "..")
git pull
npx expo export --platform web
Copy-Item (Join-Path $PSScriptRoot "web.config") (Join-Path $PSScriptRoot "..\dist\web.config") -Force
$siteName = "Huddle"
$targetPath = (Resolve-Path (Join-Path $PSScriptRoot "..\dist")).Path
$currentPath = (Get-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath).physicalPath
if ($currentPath.TrimEnd('\') -ne $targetPath.TrimEnd('\')) {
  Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $targetPath
  Restart-WebSite -Name $siteName
}
