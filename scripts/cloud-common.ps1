Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$CloudProject = 'greenprocure-511917'
$CloudAccount = 'anhminhnts2004@gmail.com'
$CloudRegion = 'asia-southeast1'
$RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Invoke-GoogleJson {
    param([Parameter(Mandatory)][string[]] $Arguments)
    $output = & $GcloudPath @Arguments "--project=$CloudProject" "--account=$CloudAccount" --quiet --format=json
    if ($LASTEXITCODE -ne 0) { throw "Google CLI failed: $($Arguments[0..1] -join ' ')." }
    return ($output -join [Environment]::NewLine) | ConvertFrom-Json
}

function Read-StringConfiguration {
    param([Parameter(Mandatory)][string] $Path)
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    $configuration = Get-Content -LiteralPath $resolved -Raw | ConvertFrom-Json
    $result = @{}
    foreach ($property in $configuration.PSObject.Properties) {
        if ($property.Value -isnot [string] -or [string]::IsNullOrWhiteSpace($property.Value)) {
            throw "Configuration values must be non-empty strings: $($property.Name)."
        }
        if ($property.Value -match 'REPLACE_|PLACEHOLDER|demo-key') {
            throw "Replace the example value for $($property.Name) before releasing."
        }
        $result[$property.Name] = $property.Value
    }
    return $result
}
