Add-Type -AssemblyName System.Drawing

$Root = "C:\Users\T560\Desktop\Freshly"
$Source = Join-Path $Root "apps\image\logo-freshly.png"

function New-CropBitmap($bmp, $x, $y, $w, $h) {
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    return $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function New-ResizedBitmap($bmp, $w, $h) {
    $dst = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($bmp, 0, 0, $w, $h)
    $g.Dispose()
    return $dst
}

# Forces RGB to white, keeping the existing alpha channel as-is - an
# Android 13+ themed-icon monochrome silhouette.
function ConvertTo-WhiteSilhouette($bmp) {
    $w = $bmp.Width; $h = $bmp.Height
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    for ($i = 0; $i -lt $bytes.Length; $i += 4) {
        $bytes[$i] = 255; $bytes[$i + 1] = 255; $bytes[$i + 2] = 255
    }
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $bmp.UnlockBits($data)
}

function New-Canvas($w, $h, [System.Drawing.Color]$bg, [switch]$Transparent) {
    $c = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($c)
    if ($Transparent) { $g.Clear([System.Drawing.Color]::Transparent) } else { $g.Clear($bg) }
    $g.Dispose()
    return $c
}

function Add-Centered($canvas, $img, $contentSize) {
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $x = [int](($canvas.Width - $contentSize) / 2)
    $y = [int](($canvas.Height - $contentSize) / 2)
    $g.DrawImage($img, $x, $y, $contentSize, $contentSize)
    $g.Dispose()
}

# Alpha-composites $img (which may have semi-transparent pixels) onto a
# solid $bg fill of the same size, producing a fully opaque result - for
# slots that don't allow an alpha channel (iOS/app-store icons).
function New-FlattenedBitmap($img, [System.Drawing.Color]$bg) {
    $canvas = New-Object System.Drawing.Bitmap($img.Width, $img.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.Clear($bg)
    $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
    $g.Dispose()
    return $canvas
}

function Save-Png($bmp, $path) {
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $size = (Get-Item $path).Length
    Write-Output "  -> $path  ($($bmp.Width)x$($bmp.Height), $size bytes)"
}

Write-Output "Loading source: $Source"
$source = [System.Drawing.Bitmap]::FromFile($Source)

# Tight square crop around the icon glyph (leaf/house mark + sparkles) only
# - excludes the wordmark (starts at x=513, confirmed via per-column alpha
# scan) and the right-side leaf accent. Icon-only alpha bbox: x:[59,466]
# y:[222,729]; crop stays inside the empty gap [467,512] before the "F".
$iconCrop = New-CropBitmap $source 0 223 505 505

# The crop already has a correct native alpha channel (the source PNG is
# genuinely transparent, not black - what looked like a black background
# in a plain image viewer was transparency composited against a dark
# canvas). Use it directly wherever transparency is fine.
$transparentMaster = $iconCrop

# Brand dark-green, matches apps/customer-web's --color-forest-dark token -
# used to flatten the mark wherever an opaque background is required.
$flattenBg = [System.Drawing.Color]::FromArgb(255, 10, 43, 33)
$opaqueMaster = New-FlattenedBitmap $transparentMaster $flattenBg

$monoMaster = $transparentMaster.Clone()
ConvertTo-WhiteSilhouette $monoMaster

Write-Output "`n== apps/customer-web =="

$webIcon512 = New-ResizedBitmap $opaqueMaster 512 512
Save-Png $webIcon512 (Join-Path $Root "apps\customer-web\src\app\icon.png")

$webLogoTransparent512 = New-ResizedBitmap $transparentMaster 512 512
Save-Png $webLogoTransparent512 (Join-Path $Root "apps\customer-web\public\logo.png")

Write-Output "`n== apps/cleaner-mobile =="

$mobileIcon1024 = New-ResizedBitmap $opaqueMaster 1024 1024
Save-Png $mobileIcon1024 (Join-Path $Root "apps\cleaner-mobile\assets\icon.png")

$mobileFavicon256 = New-ResizedBitmap $opaqueMaster 256 256
Save-Png $mobileFavicon256 (Join-Path $Root "apps\cleaner-mobile\assets\favicon.png")

# Transparent in-app logo (login screen, etc.) - mirrors public/logo.png.
$mobileLogoTransparent512 = New-ResizedBitmap $transparentMaster 512 512
Save-Png $mobileLogoTransparent512 (Join-Path $Root "apps\cleaner-mobile\assets\logo.png")

# Adaptive icon foreground: content must sit within Android's centered
# ~66% "safe zone" of the 1024 canvas, rest fully transparent so the
# background color/layer shows through.
$fgContent = New-ResizedBitmap $transparentMaster 672 672
$fgCanvas = New-Canvas 1024 1024 ([System.Drawing.Color]::Transparent) -Transparent
Add-Centered $fgCanvas $fgContent 672
Save-Png $fgCanvas (Join-Path $Root "apps\cleaner-mobile\assets\android-icon-foreground.png")

$monoContent = New-ResizedBitmap $monoMaster 672 672
$monoCanvas = New-Canvas 1024 1024 ([System.Drawing.Color]::Transparent) -Transparent
Add-Centered $monoCanvas $monoContent 672
Save-Png $monoCanvas (Join-Path $Root "apps\cleaner-mobile\assets\android-icon-monochrome.png")

# Splash screen image: the expo-splash-screen plugin composites this onto
# its OWN canvas at runtime (via imageWidth/backgroundColor in app.json),
# so this should be just the mark (transparent, high-res for retina), not
# a pre-composed full-screen canvas.
$splashIcon1024 = New-ResizedBitmap $transparentMaster 1024 1024
Save-Png $splashIcon1024 (Join-Path $Root "apps\cleaner-mobile\assets\splash-icon.png")

Write-Output "`nDone."
