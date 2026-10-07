Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\public\logo.jpg"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

$sizes = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
}

$resDir = "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\android\app\src\main\res"

foreach ($folder in $sizes.Keys) {
    $dim = $sizes[$folder]
    $destFolder = Join-Path $resDir $folder
    
    $bmp = New-Object System.Drawing.Bitmap $dim, $dim
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $dim, $dim)
    $g.Dispose()

    $target1 = Join-Path $destFolder "ic_launcher.png"
    $bmp.Save($target1, [System.Drawing.Imaging.ImageFormat]::Png)

    $target2 = Join-Path $destFolder "ic_launcher_round.png"
    $bmp.Save($target2, [System.Drawing.Imaging.ImageFormat]::Png)

    $target3 = Join-Path $destFolder "ic_launcher_foreground.png"
    $bmp.Save($target3, [System.Drawing.Imaging.ImageFormat]::Png)

    $bmp.Dispose()
}

$srcImg.Dispose()
Write-Host "Success: All Android launcher icons created from logo.jpg"
