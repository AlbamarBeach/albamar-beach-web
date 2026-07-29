Add-Type -AssemblyName System.Drawing

function New-Icon($size, $path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $teal = [System.Drawing.Color]::FromArgb(255, 15, 92, 115)
  $tealLight = [System.Drawing.Color]::FromArgb(255, 79, 169, 196)
  $terracotta = [System.Drawing.Color]::FromArgb(255, 217, 123, 82)
  $white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $tealLight, $teal, 45)
  $g.FillRectangle($brush, $rect)

  # Sun / circle accent
  $sunSize = [int]($size * 0.28)
  $sunX = [int]($size * 0.62)
  $sunY = [int]($size * 0.18)
  $sunBrush = New-Object System.Drawing.SolidBrush($terracotta)
  $g.FillEllipse($sunBrush, $sunX, $sunY, $sunSize, $sunSize)

  # Waves (three white arcs stacked)
  $wavePen = New-Object System.Drawing.SolidBrush($white)
  $waveHeight = [int]($size * 0.09)
  $ys = @(0.58, 0.72, 0.86)
  foreach ($fy in $ys) {
    $y = [int]($size * $fy)
    $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $w = $size / 4
    for ($i = 0; $i -lt 4; $i++) {
      $x = $i * $w
      $path2.AddBezier($x, $y, $x + $w/2, $y - $waveHeight, $x + $w/2, $y + $waveHeight, $x + $w, $y)
    }
    $pen = New-Object System.Drawing.Pen($white, [int]($size * 0.045))
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($pen, $path2)
  }

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Icon 192 (Join-Path $root "icons\icon-192.png")
New-Icon 512 (Join-Path $root "icons\icon-512.png")
Write-Host "Iconos generados."
