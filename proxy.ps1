# WMS Proxy Server to bypass CORS for Google Sheets and Thuocsi API
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$port = 8081
$sheetUrl = "https://docs.google.com/spreadsheets/d/10Oguigdpx5RWP4rV0Mw3eVdBrf-uS8ilQHKfA26GMw8/export?format=csv&gid=0"
$wmsUrl = "https://internal.thuocsi.vn/wms/BUYMED/HN/inventory/sku?group=BUYMED&warehouse=HN&isDraft=false"

# Initial Tokens (Leave empty for security, enter in UI)
$script:SID = ""
$script:TOKEN = ""

# Helper: từ raw input (cookie string, URL, hoặc giá trị đơn), trả về (SID, session_token) nếu tìm thấy
function Extract-Tokens($raw) {
    if (-not $raw) { return $null, $null }
    $outSid = $null; $outToken = $null
    if ($raw -match 'SID=([^;]+)') { $outSid = $matches[1] }
    if ($raw -match 'session_token=([^;]+)') { $outToken = $matches[1] }
    return $outSid, $outToken
}

# Resolve SID: kiểm tra _sid (nếu không phải URL), _token (có thể chứa full cookie string), fallback in-memory
function Resolve-Sid($qs, $fallback) {
    $rawSid = $qs["_sid"]
    $rawToken = $qs["_token"]
    # Thử từ _sid trước (nếu không phải URL)
    if ($rawSid -and $rawSid -notmatch '^https?://') {
        $s, $_ = Extract-Tokens $rawSid
        if ($s) { return $s }
        return $rawSid
    }
    # Thử từ _token (có thể chứa cả cookie string với SID)
    if ($rawToken) {
        $s, $_ = Extract-Tokens $rawToken
        if ($s) { return $s }
    }
    # Fallback in-memory, cũng thử extract
    $s, $_ = Extract-Tokens $fallback; if ($s) { return $s }
    return $fallback
}

# Resolve Token: kiểm tra _token, _sid (có thể chứa full cookie string), fallback in-memory
function Resolve-Token($qs, $fallback) {
    $rawSid = $qs["_sid"]
    $rawToken = $qs["_token"]
    # Thử từ _token trước (nếu không phải URL)
    if ($rawToken -and $rawToken -notmatch '^https?://') {
        $_, $t = Extract-Tokens $rawToken
        if ($t) { return $t }
        return $rawToken
    }
    # Thử từ _sid (có thể chứa cả cookie string với session_token)
    if ($rawSid) {
        $_, $t = Extract-Tokens $rawSid
        if ($t) { return $t }
    }
    # Fallback in-memory, cũng thử extract
    $_, $t = Extract-Tokens $fallback; if ($t) { return $t }
    return $fallback
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Proxy Server running at http://localhost:$port/" -ForegroundColor Cyan
Write-Host "Endpoints:" -ForegroundColor Gray
Write-Host "  /              -> Google Sheets (CSV)" -ForegroundColor Gray
Write-Host "  /wms           -> Thuocsi WMS API (JSON)" -ForegroundColor Gray
Write-Host "  /wms/sku-detail, /wms/detail -> SKU Detail API" -ForegroundColor Gray
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
                    if ($data.sid -or $data.token) {
                        # Extract from token if it's a full cookie string
                        if ($data.token) {
                            $exSid, $exToken = Extract-Tokens $data.token
                            if ($exSid) { $script:SID = $exSid }
                            if ($exToken) { $script:TOKEN = $exToken }
                            if (-not $exToken -and -not $exSid) { $script:TOKEN = $data.token }
                        }
                        # Extract from sid if it's a full cookie string
                        if ($data.sid) {
                            $exSid, $exToken = Extract-Tokens $data.sid
                            if ($exSid) { $script:SID = $exSid }
                            if ($exToken) { $script:TOKEN = $exToken }
                            if (-not $exToken -and -not $exSid) { $script:SID = $data.sid }
                        }
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

            # --- Ping Endpoint ---
            if ($request.Url.AbsolutePath -eq "/ping") {
                $respMsg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                $response.ContentType = "application/json"
                $response.OutputStream.Write($respMsg, 0, $respMsg.Length)
                $response.Close()
                continue
            }

            # --- API Endpoints ---
            $isJson = $false
            if ($request.Url.AbsolutePath -eq "/csv") {
                Write-Host "Fetching sheet CSV from Google..." -ForegroundColor Cyan
                try {
                    $userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    
                    # Try to fetch the file
                    $response_google = Invoke-WebRequest -Uri $sheetUrl -UserAgent $userAgent -Method Get -TimeoutSec 30 -SessionVariable googleSession
                    
                    $content_google = $response_google.Content
                    $html_google = [System.Text.Encoding]::UTF8.GetString($content_google)
                    
                    # Check if it's the "Virus Scan Warning" or "Download Anyway" page
                    if ($html_google -like "*confirm=*" -and $html_google -like "*id=uc-download-link*") {
                        Write-Host "Detected Google Drive large file warning. Attempting to bypass..." -ForegroundColor Yellow
                        if ($html_google -match 'confirm=([a-zA-Z0-9_]+)') {
                            $confirmCode = $matches[1]
                            $downloadUrl = $sheetUrl + "&confirm=" + $confirmCode
                            $response_google = Invoke-WebRequest -Uri $downloadUrl -UserAgent $userAgent -WebSession $googleSession -Method Get -TimeoutSec 30
                            $content_google = $response_google.Content
                        }
                    }

                    Write-Host "Download successful! Length: $($content_google.Length) bytes" -ForegroundColor Green
                    $response.ContentType = "text/csv; charset=utf-8"
                    $response.ContentLength64 = $content_google.Length
                    $response.OutputStream.Write($content_google, 0, $content_google.Length)
                    $response.Close()
                    continue
                } catch {
                    Write-Host "Error fetching sheet: $($_.Exception.Message)" -ForegroundColor Red
                    $response.StatusCode = 500
                    $response.Close()
                    continue
                }
            } elseif ($request.Url.AbsolutePath -eq "/wms") {
                $targetUrl = $wmsUrl
                $isJson = $true
            } elseif ($request.Url.AbsolutePath -eq "/wms/sku-detail") {
                $sku = $request.QueryString["sku"]
                $group = if ($request.QueryString["group"]) { $request.QueryString["group"] } else { "BUYMED" }
                $warehouse = if ($request.QueryString["warehouse"]) { $request.QueryString["warehouse"] } else { "HN" }
                $targetUrl = "https://internal.thuocsi.vn/wms/$group/$warehouse/inventory/sku/detail?sku=$sku&warehouseCode=$warehouse&group=$group"
                $isJson = $true
                Write-Host "sku-detail: $targetUrl" -ForegroundColor Cyan
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
                
                if ($isJson) {
                    $reqSid = Resolve-Sid $request.QueryString $script:SID
                    $reqToken = Resolve-Token $request.QueryString $script:TOKEN

                    Write-Host "Using SID: $($reqSid.Substring(0, [Math]::Min(20, $reqSid.Length)))... Token: $($reqToken.Substring(0, [Math]::Min(20, $reqToken.Length)))..." -ForegroundColor Cyan

                    # Dùng HttpWebRequest thay WebClient để tránh mất Cookie header khi redirect
                    $wmsReq = [System.Net.WebRequest]::Create($targetUrl)
                    $wmsReq.Method = "GET"
                    $wmsReq.AllowAutoRedirect = $false # Không tự động follow redirect
                    $wmsReq.ContentType = "application/json; charset=utf-8"
                    $wmsReq.Headers.Add("Cookie", "SID=$reqSid; session_token=$reqToken; lang=vi")
                    $wmsReq.Headers.Add("Authorization", "Bearer $reqToken")
                    $wmsReq.Headers.Add("x-session-token", "$reqToken")
                    $wmsReq.Accept = "application/json, text/plain, */*"
                    $wmsReq.Referer = "https://internal.thuocsi.vn/"
                    $wmsReq.UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

                    # Xử lý redirect thủ công để giữ Cookie header
                    $responseWms = $null
                    $maxRedirects = 5
                    for ($r = 0; $r -lt $maxRedirects; $r++) {
                        try {
                            $responseWms = $wmsReq.GetResponse()
                            if ($responseWms.StatusCode -eq [System.Net.HttpStatusCode]::Redirect -or
                                $responseWms.StatusCode -eq [System.Net.HttpStatusCode]::MovedPermanently -or
                                $responseWms.StatusCode -eq [System.Net.HttpStatusCode]::Found) {
                                $redirectUrl = $responseWms.Headers["Location"]
                                Write-Host "Following redirect ($($responseWms.StatusCode)): $redirectUrl" -ForegroundColor Yellow
                                $responseWms.Close()
                                $wmsReq = [System.Net.WebRequest]::Create($redirectUrl)
                                $wmsReq.Method = "GET"
                                $wmsReq.AllowAutoRedirect = $false
                                $wmsReq.Headers.Add("Cookie", "SID=$reqSid; session_token=$reqToken; lang=vi")
                                $wmsReq.Headers.Add("Authorization", "Bearer $reqToken")
                                $wmsReq.Headers.Add("x-session-token", "$reqToken")
                                $wmsReq.Accept = "application/json, text/plain, */*"
                                $wmsReq.Referer = "https://internal.thuocsi.vn/"
                                $wmsReq.UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                                continue
                            }
                            break
                        } catch {
                            # 401/403/500 response — read the error body
                            $responseWms = $_.Exception.Response
                            if (-not $responseWms) { throw }
                            break
                        }
                    }

                    $reader = New-Object System.IO.StreamReader($responseWms.GetResponseStream())
                    $content = $reader.ReadToEnd()
                    $reader.Close()
                    $responseWms.Close()

                    $response.ContentType = "application/json; charset=utf-8"
                } else {
                    $response.ContentType = "text/csv; charset=utf-8"
                    $wc = New-Object System.Net.WebClient
                    $wc.Encoding = [System.Text.Encoding]::UTF8
                    $content = $wc.DownloadString($targetUrl)
                }
                
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
                                # Lấy skuMappingHistory từ pageProps (có thể nằm ngoài .data)
                                $pageProps = $nextData.props.pageProps
                                $mappingHistory = $pageProps.skuMappingHistory
                                $isSkuDetail = ($request.Url.AbsolutePath -eq "/wms/sku-detail" -or $request.Url.AbsolutePath -eq "/wms/detail")
                                if ($isSkuDetail) {
                                    $content = @{ 
                                        ok = $true
                                        sku = $sku
                                        skuData = $finalData
                                        skuLocations = $pageData.skuLocations
                                        skuLotDate = $pageData.skuLotDate
                                        mappingHistory = $mappingHistory
                                    } | ConvertTo-Json -Depth 10 -Compress
                                } else {
                                    $content = @{ 
                                        status = "OK"; 
                                        data = $finalData; 
                                        skuLocations = $pageData.skuLocations; 
                                        skuLotDate = $pageData.skuLotDate;
                                        totalSku = $(if ($pageData.data.total) { $pageData.data.total } else { $pageData.total });
                                        isScraped = $true 
                                    } | ConvertTo-Json -Depth 10 -Compress
                                }
                            }
                        } catch {
                            Write-Host "Error parsing __NEXT_DATA__: $($_.Exception.Message)" -ForegroundColor Yellow
                        }
                    }

                    # Fallback to simple regex if __NEXT_DATA__ failed or wasn't found
                    if ($content.StartsWith("<!DOCTYPE")) {
                        Write-Host "Falling back to regex scraping..." -ForegroundColor Yellow
                        $isSkuDetail = ($request.Url.AbsolutePath -eq "/wms/sku-detail" -or $request.Url.AbsolutePath -eq "/wms/detail")
                        if ($request.Url.AbsolutePath -eq "/wms") {
                            $totalSku = 0
                            if ($content -match '(\d{1,3}(\.\d{3})*|\d+)\s*SKU') { $totalSku = $matches[1].Replace(".", "") }
                            elseif ($content -match 'Tổng cộng:\s*(\d{1,3}(\.\d{3})*|\d+)') { $totalSku = $matches[1].Replace(".", "") }
                            $content = '{"status":"OK","total":' + $totalSku + ',"data":[],"isScraped":true}'
                        } elseif ($isSkuDetail) {
                            $content = '{"ok":false,"message":"Token hết hạn hoặc không có quyền truy cập WMS. Vui lòng cập nhật Token mới.","isScraped":true}'
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


