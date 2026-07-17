Set-Location (Join-Path $PSScriptRoot "..")
git pull
npm ci
$siteName = "Huddle"
$targetPath = (Resolve-Path $PSScriptRoot).Path
$currentPath = (Get-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath).physicalPath
if ($currentPath.TrimEnd('\') -ne $targetPath.TrimEnd('\')) {
  Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $targetPath
  Restart-WebSite -Name $siteName
}
npx expo start --web --host lan
