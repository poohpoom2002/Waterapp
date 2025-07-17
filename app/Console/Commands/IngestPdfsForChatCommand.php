<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Spatie\PdfToText\Pdf;

class IngestPdfsForChatCommand extends Command
{
    protected $signature = 'chatbot:ingest-pdfs';
    protected $description = 'Process PDF files from the chatbot knowledge base and store their content.';

    public function handle()
    {
        $this->info('Starting PDF ingestion process for AI Chatbot...');
        $pdfPath = storage_path('app/chatbot_knowledge_base');

        if (!File::exists($pdfPath)) {
            File::makeDirectory($pdfPath, 0755, true);
            $this->warn("PDF directory not found. I've created it for you at: {$pdfPath}");
            $this->info("Please add your PDF files to this directory and run the command again.");
            return 1;
        }

        $files = File::files($pdfPath);

        if (empty($files)) {
            $this->warn("No PDF files found in {$pdfPath}.");
            return 1;
        }
        
        DB::table('chatbot_knowledge_base')->truncate();
        $this->info('Cleared the existing chatbot knowledge base.');

        foreach ($files as $file) {
            if (strtolower($file->getExtension()) !== 'pdf') {
                continue;
            }

            $fileName = $file->getFilename();
            $this->line("Processing: {$fileName}");

            try {
                $text = Pdf::getText($file->getPathname());
                $chunks = $this->chunkText($text);

                foreach ($chunks as $chunk) {
                    if (empty(trim($chunk))) continue;

                    DB::table('chatbot_knowledge_base')->insert([
                        'source_name' => $fileName,
                        'content' => $chunk,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                $this->info(" -> Successfully processed and stored.");

            } catch (\Exception $e) {
                $this->error(" -> Failed to process {$fileName}: " . $e->getMessage());
                Log::error("Chatbot PDF Ingestion Error for {$fileName}: " . $e->getMessage());
            }
        }

        $this->info('All PDFs have been successfully ingested into the chatbot knowledge base.');
        return 0;
    }

    private function chunkText(string $text, int $maxChunkSize = 2000): array
    {
        $text = preg_replace('/\s+/', ' ', $text); // Normalize whitespace
        $text = preg_replace('/(\r\n|\r|\n)+/', "\n", $text); // Standardize newlines
        $paragraphs = explode("\n", $text);
        $chunks = [];
        $currentChunk = "";

        foreach ($paragraphs as $paragraph) {
            if (strlen($currentChunk) + strlen($paragraph) + 1 > $maxChunkSize) {
                if (!empty($currentChunk)) {
                    $chunks[] = $currentChunk;
                }
                $currentChunk = $paragraph;
            } else {
                $currentChunk .= (empty($currentChunk) ? "" : " ") . $paragraph;
            }
        }

        if (!empty($currentChunk)) {
            $chunks[] = $currentChunk;
        }
        
        return array_map('trim', $chunks);
    }
}
