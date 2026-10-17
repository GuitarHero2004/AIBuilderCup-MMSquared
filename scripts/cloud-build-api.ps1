[CmdletBinding()]
param(
    [string] $SourceBucket = 'greenprocure-511917-build-source',
    [string] $GcloudPath = 'C:\Google Cloud CLI\google-cloud-sdk\bin\gcloud.cmd',
    [switch] $Submit
)
. (Join-Path $PSScriptRoot 'cloud-common.ps1')

if ($SourceBucket -notmatch '^greenprocure-511917-[a-z0-9-]+$') {
    throw 'Use an explicitly provisioned build-source bucket for greenprocure-511917.'
}
$apiRoot = Join-Path $RepoRoot 'services/api'
$git = 'C:\Program Files\Git\cmd\git.exe'
$commit = & $git -c "safe.directory=$($RepoRoot.Replace('\', '/'))" -C $RepoRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') { throw 'Cannot identify the source baseline.' }
$stage = Join-Path ([IO.Path]::GetTempPath()) ('greenprocure-api-build-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($stage) | Out-Null
$paths = @('Dockerfile', 'pyproject.toml', 'uv.lock')
$appFiles = Get-ChildItem -LiteralPath (Join-Path $apiRoot 'app') -File -Recurse |
    Where-Object { $_.FullName -notmatch '[\\/]__pycache__[\\/]' }
foreach ($file in $appFiles) {
    if ($file.Extension -ne '.py' -or ($file.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw "Unexpected app build input: $($file.Name). Review the source allowlist."
    }
    $paths += $file.FullName.Substring($apiRoot.Length + 1)
}
$manifest = @()
foreach ($relative in ($paths | Sort-Object)) {
    $source = Join-Path $apiRoot $relative
    $target = Join-Path $stage $relative
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target
    $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    $manifest += "$($relative.Replace('\', '/')) $hash"
}
$sha = [Security.Cryptography.SHA256]::Create()
try {
    $sourceHash = [BitConverter]::ToString($sha.ComputeHash($Utf8NoBom.GetBytes(($manifest -join "`n")))).Replace('-', '').ToLowerInvariant()
} finally { $sha.Dispose() }
$receiptPath = Join-Path ([IO.Path]::GetTempPath()) ('greenprocure-build-' + [guid]::NewGuid().ToString('N') + '.json')
$receipt = [ordered]@{ project = $CloudProject; region = $CloudRegion; git_commit = $commit; source_sha256 = $sourceHash; staged_source = $stage; files = $manifest; submitted = $false }
if (-not $Submit) {
    [IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 5), $Utf8NoBom)
    Write-Output "Prepared only; no cloud request. Source: $stage"
    Write-Output "Receipt: $receiptPath"
    return
}
# Bucket creation, API enablement and IAM are separate explicit setup actions.
$bucket = Invoke-GoogleJson @('storage', 'buckets', 'describe', "gs://$SourceBucket")
if ($bucket.location.ToLowerInvariant() -ne $CloudRegion) { throw 'Build source bucket must be in Singapore.' }
$build = Invoke-GoogleJson @(
    'builds', 'submit', $stage, "--region=$CloudRegion",
    "--config=$(Join-Path $RepoRoot 'infra/cloud/cloudbuild.api.yaml')",
    "--gcs-source-staging-dir=gs://$SourceBucket/source",
    "--substitutions=_GIT_COMMIT=$commit,_SOURCE_SHA256=$sourceHash",
    '--suppress-logs'
)
if ($build.status -ne 'SUCCESS' -or $build.projectId -ne $CloudProject) { throw 'The image build did not succeed in the selected project.' }
$image = @($build.results.images)
$expectedImage = "$CloudRegion-docker.pkg.dev/$CloudProject/greenprocure/api:build-$($build.id)"
if ($image.Count -ne 1 -or $image[0].name -ne $expectedImage -or $image[0].digest -notmatch '^sha256:[0-9a-f]{64}$') {
    throw 'Build returned unexpected image metadata; do not deploy.'
}
$receipt.submitted = $true
$receipt.build_id = $build.id
$receipt.image = "$CloudRegion-docker.pkg.dev/$CloudProject/greenprocure/api@$($image[0].digest)"
[IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 5), $Utf8NoBom)
Write-Output "Built successfully: $($receipt.image)"
Write-Output "Build ID: $($build.id)"
Write-Output "Receipt: $receiptPath"
