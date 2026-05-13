# WMS Proxy Server to bypass CORS for Google Sheets and Thuocsi API
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$port = 8081
$sheetUrl = "https://docs.google.com/spreadsheets/d/10Oguigdpx5RWP4rV0Mw3eVdBrf-uS8ilQHKfA26GMw8/gviz/tq?tqx=out:csv&gid=0"
$wmsUrl = "https://internal.thuocsi.vn/wms/BUYMED/HN/inventory/sku?group=BUYMED&warehouse=HN&isDraft=false"

# Initial Tokens (Leave empty for security, enter in UI)
$script:SID = ""
$script:TOKEN = ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Proxy Server running at http://localhost:$port/" -ForegroundColor Cyan
Write-Host "Endpoints:" -ForegroundColor Gray
Write-Host "  /              -> Google Sheets (CSV)" -ForegroundColor Gray
Write-Host "  /wms           -> Thuocsi WMS API (JSON)" -ForegroundColor Gray
Write-Host "  /wms/detail    -> SKU Detail API" -ForegroundColor Gray
Write-Host "  POST /update-token -> Update SID & Token" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop."

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            Write-Host "$(Get-Date -Format 'HH:mm:ss') - $($request.HttpMethod) $($request.Url.AbsolutePath)"
            
            # Add CORS Headers
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            # --- Update Token Endpoint ---
            if ($request.Url.AbsolutePath -eq "/update-token" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                try {
                    $data = $body | ConvertFrom-Json
                    if ($data.sid -and $data.token) {
                        $script:SID = $data.sid
                        $script:TOKEN = $data.token
                        Write-Host "Tokens updated successfully!" -ForegroundColor Green
                        $respMsg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true,"message":"Tokens updated"}')
                        $response.ContentType = "application/json"
                        $response.OutputStream.Write($respMsg, 0, $respMsg.Length)
                    } else {
                        $response.StatusCode = 400
                    }
                } catch {
                    $response.StatusCode = 400
                }
                $response.Close()
                continue
            }

            # --- Serve Local Files ---
            if ($request.Url.AbsolutePath -eq "/" -or $request.Url.AbsolutePath -eq "/index.html") {
                $filePath = Join-Path $PSScriptRoot "index.html"
                if (Test-Path $filePath) {
                    $content = [System.IO.File]::ReadAllBytes($filePath)
                    $response.ContentType = "text/html; charset=utf-8"
                    $response.OutputStream.Write($content, 0, $content.Length)
                    $response.Close()
                    continue
                }
            } elseif ($request.Url.AbsolutePath -eq "/script.js") {
                $filePath = Join-Path $PSScriptRoot "script.js"
                if (Test-Path $filePath) {
                    $content = [System.IO.File]::ReadAllBytes($filePath)
                    $response.ContentType = "application/javascript; charset=utf-8"
                    $response.OutputStream.Write($content, 0, $content.Length)
                    $response.Close()
                    continue
                }
            } elseif ($request.Url.AbsolutePath -eq "/style.css") {
                $filePath = Join-Path $PSScriptRoot "style.css"
                if (Test-Path $filePath) {
                    $content = [System.IO.File]::ReadAllBytes($filePath)
                    $response.ContentType = "text/css; charset=utf-8"
                    $response.OutputStream.Write($content, 0, $content.Length)
                    $response.Close()
                    continue
                }
            }

            # --- API Endpoints ---
            $isJson = $false
            if ($request.Url.AbsolutePath -eq "/wms") {
                $targetUrl = $wmsUrl
                $isJson = $true
            } elseif ($request.Url.AbsolutePath -eq "/wms/detail") {
                $sku = $request.QueryString["sku"]
                $targetUrl = "https://internal.thuocsi.vn/wms/BUYMED/HN/inventory/sku/detail?sku=$sku&warehouseCode=HN&group=BUYMED"
                $isJson = $true
            } elseif ($request.Url.AbsolutePath -eq "/wms/move") {
                $sku = $request.QueryString["sku"]
                $targetUrl = "https://internal.thuocsi.vn/wms/BUYMED/HN/inventory/sku/detail/sku-move?sku=$sku&warehouseCode=HN&group=BUYMED&warehouse=HN"
                $isJson = $true
            } elseif ($request.Url.AbsolutePath -eq "/image") {
                $url = $request.QueryString["url"]
                if ($url) {
                    try {
                        Write-Host "Proxying image: $url" -ForegroundColor Cyan
                        
                        $headers = @{
                            "Referer" = "https://internal.thuocsi.vn/"
                            "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            "Accept" = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
                            "Cookie" = "SID=$($script:SID); session_token=$($script:TOKEN); lang=vi"
                            "Authorization" = "Bearer $($script:TOKEN)"
                            "x-session-token" = "$($script:TOKEN)"
                        }
                        
                        $imgResponse = $null
                        try {
                            $imgResponse = Invoke-WebRequest -Uri $url -Headers $headers -Method Get -TimeoutSec 10
                        } catch {
                            $status = $_.Exception.Response.StatusCode.value__
                            if ($status -eq 401 -or $status -eq 403) {
                                Write-Host "Unauthorized/Forbidden with tokens. Trying without headers..." -ForegroundColor Yellow
                                $imgResponse = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 10
                            } else {
                                throw $_
                            }
                        }
                        
                        if ($imgResponse) {
                            $buffer = $imgResponse.Content
                            $contentType = $imgResponse.Headers["Content-Type"]
                            if (-not $contentType) { $contentType = "image/jpeg" }
                            
                            $response.ContentType = $contentType
                            $response.ContentLength64 = $buffer.Length
                            $response.OutputStream.Write($buffer, 0, $buffer.Length)
                            $response.Close()
                            continue
                        }
                    } catch {
                        Write-Host "Image Proxy Error: $($_.Exception.Message)" -ForegroundColor Red
                        # Fallback to a clear 1x1 pixel image if everything fails
                        $response.StatusCode = 200
                        $response.ContentType = "image/gif"
                        $pixel = [Convert]::FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
                        $response.OutputStream.Write($pixel, 0, $pixel.Length)
                        $response.Close()
                        continue
                    }
                }
            } else {
                $targetUrl = $sheetUrl
            }

            try {
                Write-Host "Fetching from: $targetUrl" -ForegroundColor Yellow
                $wc = New-Object System.Net.WebClient
                $wc.Encoding = [System.Text.Encoding]::UTF8
                
                if ($isJson) {
                    $wc.Headers.Add("Cookie", "SID=$($script:SID); session_token=$($script:TOKEN); lang=vi")
                    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    $wc.Headers.Add("Accept", "application/json, text/plain, */*")
                    $wc.Headers.Add("Referer", "https://internal.thuocsi.vn/")
                    $wc.Headers.Add("Authorization", "Bearer $($script:TOKEN)")
                    $wc.Headers.Add("x-session-token", "$($script:TOKEN)")
                    $response.ContentType = "application/json; charset=utf-8"
                } else {
                    $response.ContentType = "text/csv; charset=utf-8"
                }

                $content = $wc.DownloadString($targetUrl)
                
                if ($isJson -and $content.Trim().StartsWith("<!DOCTYPE")) {
                    Write-Host "Warning: Received HTML instead of JSON. Attempting to scrape from __NEXT_DATA__..." -ForegroundColor Cyan
                    
                    # Try to find Next.js data script
                    if ($content -match '<script id="__NEXT_DATA__" type="application/json">(.+?)</script>') {
                        $nextDataJson = $matches[1]
                        try {
                            $nextData = $nextDataJson | ConvertFrom-Json
                            $pageData = $nextData.props.pageProps.data
                            if (-not $pageData) { $pageData = $nextData.props.pageProps }
                            
                            # Detect if it's a list or detail page
                            $finalData = $null
                            if ($pageData.skuData) { 
                                $finalData = $pageData.skuData 
                            } elseif ($pageData.data -and ($pageData.data -is [array] -or $pageData.data.GetType().Name -match "Object")) {
                                $finalData = $pageData.data
                            }

                            if ($finalData -or $pageData.skuLocations) {
                                Write-Host "Successfully extracted data from __NEXT_DATA__!" -ForegroundColor Green
                                $content = @{ 
                                    status = "OK"; 
                                    data = $finalData; 
                                    skuLocations = $pageData.skuLocations; 
                                    skuLotDate = $pageData.skuLotDate;
                                    totalSku = $(if ($pageData.data.total) { $pageData.data.total } else { $pageData.total });
                                    isScraped = $true 
                                } | ConvertTo-Json -Depth 10 -Compress
                            }
                        } catch {
                            Write-Host "Error parsing __NEXT_DATA__: $($_.Exception.Message)" -ForegroundColor Yellow
                        }
                    }

                    # Fallback to simple regex if __NEXT_DATA__ failed or wasn't found
                    if ($content.StartsWith("<!DOCTYPE")) {
                        Write-Host "Falling back to regex scraping..." -ForegroundColor Yellow
                        if ($request.Url.AbsolutePath -eq "/wms") {
                            $totalSku = 0
                            if ($content -match '(\d{1,3}(\.\d{3})*|\d+)\s*SKU') { $totalSku = $matches[1].Replace(".", "") }
                            elseif ($content -match 'Tổng cộng:\s*(\d{1,3}(\.\d{3})*|\d+)') { $totalSku = $matches[1].Replace(".", "") }
                            $content = '{"status":"OK","total":' + $totalSku + ',"data":[],"isScraped":true}'
                        } else {
                            $physicalQty = 0
                            if ($content -match '(\d{1,3}(\.\d{3})*|\d+)\s*Tồn vật lý') { $physicalQty = $matches[1].Replace(".", "") }
                            elseif ($content -match '"stockQuantity":\s*(\d+)') { $physicalQty = $matches[1] }
                            
                            $location = ""
                            if ($content -match '"locationCode":\s*"([^"]+)"') { $location = $matches[1] }
                            $content = '{"status":"OK","data":{"stockQuantity":' + $physicalQty + ',"locationCode":"' + $location + '","isScraped":true}}'
                        }
                    }
                }

                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                $response.ContentLength64 = $buffer.Length
                
                # Send in chunks to prevent "The specified network name is no longer available" for large files
                $chunkSize = 65536 # 64KB
                for ($i = 0; $i -lt $buffer.Length; $i += $chunkSize) {
                    $bytesToWrite = [Math]::Min($chunkSize, $buffer.Length - $i)
                    $response.OutputStream.Write($buffer, $i, $bytesToWrite)
                }
                
                Write-Host "Success! Sent $($buffer.Length) bytes." -ForegroundColor Green
            } catch {
                Write-Host "Fetch Error: $($_.Exception.Message)" -ForegroundColor Red
                $response.StatusCode = 500
                $errorMsg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":false,"message":"' + $_.Exception.Message + '"}')
                try { $response.OutputStream.Write($errorMsg, 0, $errorMsg.Length) } catch {}
            }
            try { $response.Close() } catch {}
        } catch {
            Write-Host "Global Loop Error: $_" -ForegroundColor Red
        }
    }
} finally {
    $listener.Stop()
}


