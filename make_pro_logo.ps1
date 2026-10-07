Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# 1. Dark Cyber Navy Background (#090D16)
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 9, 13, 22))
$g.FillRectangle($bgBrush, 0, 0, $size, $size)

# 2. Concentric Radar Rings
$radarPen1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 6, 182, 212)), 3
$radarPen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 6, 182, 212)), 4
$radarPen3 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 6, 182, 212)), 5

$g.DrawEllipse($radarPen1, 56, 56, 400, 400)
$g.DrawEllipse($radarPen2, 116, 116, 280, 280)
$g.DrawEllipse($radarPen3, 176, 176, 160, 160)

# Radar Crosshair Axes
$axisPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(60, 148, 163, 184)), 3
$g.DrawLine($axisPen, 256, 40, 256, 472)
$g.DrawLine($axisPen, 40, 256, 472, 256)

# 3. Outer Hexagonal Shield Ring (Pursuit / Hunt Shield)
$hexPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(240, 16, 185, 129)), 12
$hexPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$p1 = [System.Drawing.PointF]::new(256, 42)
$p2 = [System.Drawing.PointF]::new(446, 122)
$p3 = [System.Drawing.PointF]::new(446, 358)
$p4 = [System.Drawing.PointF]::new(256, 470)
$p5 = [System.Drawing.PointF]::new(66, 358)
$p6 = [System.Drawing.PointF]::new(66, 122)
$pts = [System.Drawing.PointF[]]@($p1, $p2, $p3, $p4, $p5, $p6)
$g.DrawPolygon($hexPen, $pts)

# 4. Neon Radial Radar Sweep Wedge
$swBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50, 6, 182, 212))
$g.FillPie($swBrush, 56, 56, 400, 400, 280, 70)

# 5. Bold Central Crosshair Target (Neon Cyan)
$centerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 6, 182, 212)), 12
$g.DrawEllipse($centerPen, 212, 212, 88, 88)

# Center Target Diamond
$centerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
$d1 = [System.Drawing.PointF]::new(256, 230)
$d2 = [System.Drawing.PointF]::new(282, 256)
$d3 = [System.Drawing.PointF]::new(256, 282)
$d4 = [System.Drawing.PointF]::new(230, 256)
$diaPts = [System.Drawing.PointF[]]@($d1, $d2, $d3, $d4)
$g.FillPolygon($centerBrush, $diaPts)

# Reticle Ticks (White)
$tickPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 255, 255)), 8
$g.DrawLine($tickPen, 256, 178, 256, 204)
$g.DrawLine($tickPen, 256, 308, 256, 334)
$g.DrawLine($tickPen, 178, 256, 204, 256)
$g.DrawLine($tickPen, 308, 256, 334, 256)

# Hunter & Runner Corner Ping Dots (Tracking Signal)
$hunterPing = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$runnerPing = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 244, 63, 94))
$g.FillEllipse($hunterPing, 350, 140, 26, 26)
$g.FillEllipse($runnerPing, 136, 330, 26, 26)

$g.Dispose()

# Save master web & PWA logo
$masterPath = "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\public\logo.jpg"
$bmp.Save($masterPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

# Also save transparent foreground version with exact 72% Android safe-zone inset for adaptive icons
$fgSize = 512
$fgBmp = New-Object System.Drawing.Bitmap $fgSize, $fgSize
$fgG = [System.Drawing.Graphics]::FromImage($fgBmp)
$fgG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$fgG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$inset = 72
$fgG.DrawImage($bmp, $inset, $inset, $fgSize - ($inset * 2), $fgSize - ($inset * 2))
$fgG.Dispose()

# Save mipmap Android icons
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

    # Full icon for legacy square/circle launchers
    $scaled = New-Object System.Drawing.Bitmap $dim, $dim
    $sg = [System.Drawing.Graphics]::FromImage($scaled)
    $sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $sg.DrawImage($bmp, 0, 0, $dim, $dim)
    $sg.Dispose()
    $scaled.Save((Join-Path $destFolder "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $scaled.Save((Join-Path $destFolder "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $scaled.Dispose()

    # Adaptive foreground (padded so it never clips or distorts on Android 8+)
    $scaledFg = New-Object System.Drawing.Bitmap $dim, $dim
    $sfg = [System.Drawing.Graphics]::FromImage($scaledFg)
    $sfg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $sfg.DrawImage($fgBmp, 0, 0, $dim, $dim)
    $sfg.Dispose()
    $scaledFg.Save((Join-Path $destFolder "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $scaledFg.Dispose()
}

$bmp.Dispose()
$fgBmp.Dispose()
Write-Host "Success: Clean geometric Trampis Hunt logo generated with perfect safe-zone fit!"
