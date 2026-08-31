[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $DestinationRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Destination = [IO.Path]::GetFullPath($DestinationRoot)

if (Test-Path -LiteralPath $Destination) {
    throw "Destination already exists: $Destination"
}

$Sources = @(
    "src\core\private\PrivateProtocol.gs"
    "src\core\private\PrivateBackend.gs"
    "src\core\private\PrivateBackendAdapters.gs"
    "src\core\private\PrivateReplayGuard.gs"
    "src\core\private\PrivateBackendRuntime.gs"
    "deploy\admin006-backend\PrivateBackendEntryPoint.gs"
    "deploy\admin006-backend\appsscript.json"
)

New-Item -ItemType Directory -Path $Destination | Out-Null

foreach ($RelativePath in $Sources) {
    $SourcePath = Join-Path $RepositoryRoot $RelativePath
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Required source missing: $RelativePath"
    }

    $FileName = Split-Path -Path $RelativePath -Leaf
    Copy-Item -LiteralPath $SourcePath -Destination (
        Join-Path $Destination $FileName
    )
}

$ManifestPath = Join-Path $Destination "appsscript.json"
$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$ExpectedTopLevel = @(
    "dependencies"
    "exceptionLogging"
    "runtimeVersion"
    "timeZone"
    "webapp"
) | Sort-Object
$ObservedTopLevel = @(
    $Manifest.PSObject.Properties.Name | Sort-Object
)
if (($ExpectedTopLevel -join "|") -cne ($ObservedTopLevel -join "|")) {
    throw "Unexpected backend manifest fields."
}
if (
    [string]$Manifest.timeZone -cne "Europe/Paris" -or
    [string]$Manifest.exceptionLogging -cne "STACKDRIVER" -or
    [string]$Manifest.runtimeVersion -cne "V8"
) {
    throw "Unexpected backend manifest runtime configuration."
}
if (@($Manifest.dependencies.PSObject.Properties).Count -ne 0) {
    throw "Backend manifest dependencies must remain empty."
}
$ExpectedWebApp = @("access", "executeAs") | Sort-Object
$ObservedWebApp = @(
    $Manifest.webapp.PSObject.Properties.Name | Sort-Object
)
if (($ExpectedWebApp -join "|") -cne ($ObservedWebApp -join "|")) {
    throw "Unexpected backend webapp manifest fields."
}
if (
    [string]$Manifest.webapp.access -cne "ANYONE_ANONYMOUS" -or
    [string]$Manifest.webapp.executeAs -cne "USER_DEPLOYING"
) {
    throw "Unexpected backend webapp identity or audience."
}

$InventoryPath = Join-Path $Destination "package-sha256.csv"
$Inventory = @(
    Get-ChildItem -LiteralPath $Destination -File |
    Where-Object { $_.Name -ne "package-sha256.csv" } |
    Sort-Object Name |
    ForEach-Object {
        [pscustomobject]@{
            File = $_.Name
            SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        }
    }
)

if ($Inventory.Count -ne 7) {
    throw "Unexpected backend package file count: $($Inventory.Count)"
}

$Inventory | Export-Csv -LiteralPath $InventoryPath -NoTypeInformation

Write-Host "[OK] ADMIN-006 backend package built"
Write-Host "Package : $Destination"
Write-Host "Files   : $($Inventory.Count)"
Write-Host "Enabled : false unless explicitly configured"
Write-Host "Web app : ANYONE_ANONYMOUS / USER_DEPLOYING"
