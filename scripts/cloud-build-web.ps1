[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $EnvironmentFile,
    [string] $NodePath = 'C:\Program Files\nodejs\node.exe',
    [switch] $Build
)
$ErrorActionPreference = 'Stop'
$configPath = (Resolve-Path -LiteralPath $EnvironmentFile).Path
$arguments = @((Join-Path $PSScriptRoot 'cloud-build-web.mjs'), '--config', $configPath)
if ($Build) { $arguments += '--build' }
& $NodePath @arguments
if ($LASTEXITCODE -ne 0) { throw 'Production frontend validation or build failed; do not publish dist.' }
