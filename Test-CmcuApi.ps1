# =============================================================
# Test-CmcuApi.ps1 — Helper test API CMCU (đã hỗ trợ PATCH + Depth 10)
# Cách dùng: . .\Test-CmcuApi.ps1
# =============================================================
function Test-CmcuApi {
    param(
        [Parameter(Mandatory=$true)][string]$Uri,
        [hashtable]$Body,
        [string]$Method = 'POST'
    )
    $json = if ($Body) { $Body | ConvertTo-Json -Compress -Depth 10 } else { $null }
    try {
        $params = @{
            Uri             = $Uri
            Method          = $Method
            ContentType     = 'application/json'
            UseBasicParsing = $true
        }
        if ($json) { $params.Body = $json }

        $r = Invoke-WebRequest @params
        Write-Host "STATUS: $([int]$r.StatusCode) ✅" -ForegroundColor Green
        $r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
        $color = if ($code -ge 400 -and $code -lt 500) { 'Yellow' } else { 'Red' }
        Write-Host "STATUS: $code" -ForegroundColor $color
        $_.ErrorDetails.Message
    }
}

Write-Host "✅ Đã nạp hàm Test-CmcuApi" -ForegroundColor Cyan