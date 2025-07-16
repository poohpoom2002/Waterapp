<?php

return [

    /*
     |--------------------------------------------------------------------------
     | Path to the `pdftotext` binary
     |--------------------------------------------------------------------------
     |
     | ตรงนี้ให้ชี้ไปยังไฟล์ pdftotext.exe ของ Poppler ที่ติดตั้งไว้
     | บน Windows ตัวอย่าง:
     | "C:\\poppler\\poppler-24.08.0\\Library\\bin\\pdftotext.exe"
     */

    'binary_path' => env('PDF_TO_TEXT_BINARY', 'pdftotext'),
];
