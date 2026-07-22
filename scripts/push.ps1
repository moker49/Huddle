param(
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$repoPath = Split-Path -Parent $PSScriptRoot
Set-Location $repoPath

git add --all
git commit -m $Message
git push