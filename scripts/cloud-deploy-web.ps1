[CmdletBinding()]
param(
    [string] $GcloudPath = 'C:\Google Cloud CLI\google-cloud-sdk\bin\gcloud.cmd',
    [switch] $Publish
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$python = Join-Path $repoRoot 'services/api/.venv/Scripts/python.exe'
$arguments = @((Join-Path $PSScriptRoot 'cloud-deploy-web.py'), '--gcloud', $GcloudPath)
if ($Publish) { $arguments += '--publish' }
& $python @arguments
if ($LASTEXITCODE -ne 0) { throw 'Hosting validation or publication did not complete; inspect the reported version before retrying.' }
