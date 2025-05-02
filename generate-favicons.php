<?php

// Function to convert SVG to PNG
function svgToPng($svgFile, $outputFile, $size) {
    $im = new Imagick();
    $im->setBackgroundColor(new ImagickPixel('transparent'));
    $im->readImageBlob(file_get_contents($svgFile));
    $im->setImageFormat('png');
    $im->resizeImage($size, $size, Imagick::FILTER_LANCZOS, 1);
    $im->writeImage($outputFile);
    $im->clear();
    $im->destroy();
}

// Sizes to generate
$sizes = [
    'favicon-16x16.png' => 16,
    'favicon-32x32.png' => 32,
    'apple-touch-icon.png' => 180,
    'android-chrome-192x192.png' => 192,
    'android-chrome-512x512.png' => 512
];

// Generate each size
foreach ($sizes as $filename => $size) {
    svgToPng('public/safari-pinned-tab.svg', 'public/' . $filename, $size);
    echo "Generated $filename\n";
}

echo "All favicons generated successfully!\n"; 