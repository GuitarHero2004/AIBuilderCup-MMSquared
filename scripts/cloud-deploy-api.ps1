[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f-]{36}$')][string] $BuildId,
    [Parameter(Mandatory)][string] $EnvironmentFile,
    [string] $GcloudPath = 'C:\Google Cloud CLI\google-cloud-sdk\bin\gcloud.cmd',
    [switch] $EnableLiveAi,
    [switch] $Deploy
)
. (Join-Path $PSScriptRoot 'cloud-common.ps1')
$environmentPath = (Resolve-Path -LiteralPath $EnvironmentFile).Path
$config = Read-StringConfiguration $environmentPath
if ($config.APP_ENV -ne 'production' -or $config.GOOGLE_CLOUD_PROJECT -ne $CloudProject -or $config.APP_CHECK_REQUIRED -ne 'true') {
    throw 'Production must use the selected project and enforce App Check.'
}
$appIds = $config.APP_CHECK_APP_IDS | ConvertFrom-Json
$origins = $config.ALLOWED_ORIGINS | ConvertFrom-Json
if ($appIds.Count -ne 1 -or $appIds[0] -ne '1:694155506378:web:a40e65eebd52c56eb53a33') { throw 'Unexpected Firebase app allowlist.' }
$expectedOrigins = @("https://$CloudProject.web.app", "https://$CloudProject.firebaseapp.com")
if (@(Compare-Object $origins $expectedOrigins).Count -ne 0) { throw 'Only the two selected Firebase Hosting origins are allowed.' }
if ($config.STORAGE_BUCKET -notmatch '^greenprocure-511917[.-][a-z0-9.-]+$') { throw 'Use the verified private bucket in this project.' }
if ($config.AI_ENABLED -notin @('true', 'false')) { throw 'AI_ENABLED must be true or false.' }
if ($config.AI_ENABLED -eq 'true' -and -not $EnableLiveAi) { throw 'Live AI requires an explicit -EnableLiveAi after provider verification.' }
if (-not $config.UPLOAD_RETENTION_NOTICE) { throw 'A truthful retention notice is required.' }
# Validate against the actual application model; never deploy a second hand-written approximation.
$python = Join-Path $RepoRoot 'services/api/.venv/Scripts/python.exe'
$validation = @'
import json, sys
from app.config import Settings
with open(sys.argv[1], encoding="utf-8-sig") as source:
    raw = json.load(source)
values = {}
for key, value in raw.items():
    values[key.lower()] = json.loads(value) if key in {"APP_CHECK_APP_IDS", "ALLOWED_ORIGINS"} else value
Settings(_env_file=None, **values)
print("Runtime configuration passed application validation.")
'@
Push-Location (Join-Path $RepoRoot 'services/api')
try {
    $validation | & $python - $environmentPath
    if ($LASTEXITCODE -ne 0) { throw 'Runtime configuration is invalid.' }
} finally { Pop-Location }
if (-not $Deploy) {
    Write-Output 'Validated only; no cloud request. Add -Deploy to release the reviewed build.'
    return
}
$build = Invoke-GoogleJson @('builds', 'describe', $BuildId, "--region=$CloudRegion")
$buildServiceAccount = '^projects/(greenprocure-511917|694155506378)/serviceAccounts/greenprocure-build@greenprocure-511917\.iam\.gserviceaccount\.com$'
if ($build.status -ne 'SUCCESS' -or $build.projectId -ne $CloudProject -or $build.serviceAccount -notmatch $buildServiceAccount) {
    throw 'A successful build using the selected project and dedicated build identity is required.'
}
$images = @($build.results.images)
$expectedImage = "$CloudRegion-docker.pkg.dev/$CloudProject/greenprocure/api:build-$BuildId"
if ($images.Count -ne 1 -or $images[0].name -ne $expectedImage -or $images[0].digest -notmatch '^sha256:[0-9a-f]{64}$') {
    throw 'Unexpected build image metadata; deployment stopped.'
}
$image = "$CloudRegion-docker.pkg.dev/$CloudProject/greenprocure/api@$($images[0].digest)"
# Public transport is required for Firebase browser tokens. Application auth, ownership and
# App Check remain mandatory on every business route. No broad IAM binding is added here.
$service = Invoke-GoogleJson @(
    'run', 'deploy', 'greenprocure-api', "--region=$CloudRegion", "--image=$image",
    "--service-account=greenprocure-api@$CloudProject.iam.gserviceaccount.com",
    "--env-vars-file=$environmentPath",
    '--execution-environment=gen2', '--cpu=1', '--memory=1Gi', '--concurrency=4',
    '--min=0', '--max=2', '--min-instances=0', '--max-instances=2', '--timeout=180',
    '--port=8080', '--ingress=all', '--no-invoker-iam-check', '--cpu-throttling',
    '--startup-probe=httpGet.path=/healthz,httpGet.port=8080,timeoutSeconds=5,periodSeconds=10,failureThreshold=12',
    '--liveness-probe=httpGet.path=/healthz,httpGet.port=8080,timeoutSeconds=5,periodSeconds=30,failureThreshold=3',
    '--labels=app=greenprocure,component=api'
)
Write-Output "Cloud Run service: $($service.status.url)"
Write-Output "Revision: $($service.status.latestReadyRevisionName)"
Write-Output "Image: $image"
