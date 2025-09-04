<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeminiAiService
{
    private $apiKey;
    private $baseUrl;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
        
        if (empty($this->apiKey)) {
            throw new Exception('GEMINI_API_KEY not found in .env file');
        }
    }

    /**
     * Generate AI response using Gemini API
     */
    public function generateResponse(string $userMessage, string $language = 'auto'): string
    {
        try {
            // Clean input message
            $userMessage = $this->cleanUtf8($userMessage);
            
            // Detect language if auto
            if ($language === 'auto') {
                $language = $this->detectLanguage($userMessage);
            }

            // Handle empty message
            if (empty(trim($userMessage))) {
                return $this->getDefaultResponse($language);
            }

            // Build simple system prompt
            $systemPrompt = $this->buildSystemPrompt($language);
            
            // Create conversation context
            $fullPrompt = $systemPrompt . "\n\nUser: " . $userMessage . "\n\nAssistant:";

            Log::info('Gemini API Request', [
                'user_message' => $userMessage,
                'language' => $language,
                'message_length' => mb_strlen($userMessage)
            ]);

            // Prepare API request
            $requestData = [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'text' => $fullPrompt
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'topK' => 40,
                    'topP' => 0.95,
                    'maxOutputTokens' => 2048,
                ],
                'safetySettings' => [
                    [
                        'category' => 'HARM_CATEGORY_HARASSMENT',
                        'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
                    ],
                    [
                        'category' => 'HARM_CATEGORY_HATE_SPEECH',
                        'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
                    ],
                    [
                        'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
                    ],
                    [
                        'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
                    ]
                ]
            ];

            // Make API call
            $response = Http::timeout(30)
                ->retry(3, 1000)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($this->baseUrl . '?key=' . $this->apiKey, $requestData);

            // Check response status
            if (!$response->successful()) {
                $errorBody = $response->body();
                Log::error('Gemini API HTTP Error', [
                    'status' => $response->status(),
                    'body' => $errorBody
                ]);
                throw new Exception("Gemini API Error: HTTP {$response->status()}");
            }

            $responseData = $response->json();
            
            // Extract response text
            $aiResponse = $this->extractResponseText($responseData);
            
            if (empty($aiResponse)) {
                Log::warning('Empty response from Gemini API', ['response_data' => $responseData]);
                throw new Exception('Empty response received from Gemini API');
            }

            // Clean up the response
            $finalResponse = $this->postProcessResponse($aiResponse);

            Log::info('Gemini API Success', [
                'response_length' => mb_strlen($finalResponse),
                'language' => $language
            ]);

            return $finalResponse;

        } catch (Exception $e) {
            Log::error('Gemini API Error', [
                'error' => $e->getMessage(),
                'user_message' => $userMessage ?? 'N/A'
            ]);

            // Return fallback response
            return $this->getFallbackResponse($userMessage, $language);
        }
    }

    /**
     * Build simple system prompt
     */
    private function buildSystemPrompt(string $language): string
    {
        if ($language === 'thai') {
            return "คุณคือ AI ผู้ช่วยที่เป็นผู้หญิง เป็นมิตรและมีประโยชน์ สามารถตอบคำถามได้หลากหลายเรื่อง

📋 หลักการตอบคำถาม:
1. ตอบคำถามอย่างเป็นธรรมชาติและเป็นมิตร
2. ให้ข้อมูลที่ถูกต้องและเป็นประโยชน์  
3. ตอบเป็นภาษาไทยที่เข้าใจง่าย ไม่ต้องใช้คำสุภาพ ค่ะ/ครับ
4. หากไม่ทราบคำตอบ ให้บอกตรงๆ
5. พร้อมช่วยเหลือในทุกเรื่อง
6. พูดจาแบบเป็นกันเองและสบายๆ";

        } else {
            return "You are a friendly and helpful female AI assistant that can answer questions on various topics.

📋 Response Guidelines:
1. Answer questions naturally and in a friendly manner
2. Provide accurate and helpful information
3. Respond in clear, easy-to-understand English
4. If you don't know something, say so honestly
5. Be ready to help with any topic
6. Use a casual and friendly tone";
        }
    }

    /**
     * Extract response text from Gemini API response
     */
    private function extractResponseText(array $data): string
    {
        // Check standard response structure
        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            return trim($data['candidates'][0]['content']['parts'][0]['text']);
        }

        // Check alternative structures
        if (isset($data['candidates'][0]['output'])) {
            return trim($data['candidates'][0]['output']);
        }

        if (isset($data['text'])) {
            return trim($data['text']);
        }

        return '';
    }

    /**
     * Post-process AI response
     */
    private function postProcessResponse(string $response): string
    {
        // Clean up response
        $response = trim($response);
        
        // Remove common prefixes
        $response = preg_replace('/^(ตอบ:|คำตอบ:|Answer:|Response:|Assistant:)\s*/i', '', $response);
        
        // Normalize line breaks
        $response = preg_replace('/\n{3,}/', "\n\n", $response);
        
        return $response;
    }

    /**
     * Get fallback response when API fails
     */
    private function getFallbackResponse(string $userMessage, string $language): string
    {
        $msg = mb_strtolower($userMessage);
        
        if ($language === 'thai') {
            // Check for greetings
            if (preg_match('/สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi/i', $msg)) {
                return "สวัสดี! ฉันคือ AI ผู้ช่วย 🤖\n\nยินดีที่ได้พูดคุยกับคุณ มีอะไรให้ช่วยไหม? 😊";
            }
            
            return "ขออภัยนะ ตอนนี้ระบบ AI กำลังโหลดข้อมูล 🤖\n\nฉันพร้อมช่วยตอบคำถามเรื่องต่างๆ ลองถามใหม่ได้เลย! 😊";
        } else {
            // English fallback
            if (preg_match('/hello|hi|hey|good/i', $msg)) {
                return "Hello! I'm your AI assistant 🤖\n\nNice to meet you! How can I help you today? 😊";
            }
            
            return "I'm your AI assistant, currently loading 🤖\n\nI'm ready to help with various questions. Please feel free to ask me anything! 😊";
        }
    }

    /**
     * Get default response for empty input
     */
    private function getDefaultResponse(string $language): string
    {
        if ($language === 'thai') {
            return "สวัสดี! ฉันคือ AI ผู้ช่วย 🤖\n\nมีอะไรให้ช่วยไหม?";
        } else {
            return "Hello! I'm your AI assistant 🤖\n\nHow can I help you today?";
        }
    }

    /**
     * Detect language from message
     */
    private function detectLanguage(string $message): string
    {
        // Check for Thai characters
        if (preg_match('/[\x{0E00}-\x{0E7F}]/u', $message)) {
            return 'thai';
        }
        
        return 'english';
    }

    /**
     * Clean and validate UTF-8 encoding
     */
    private function cleanUtf8(string $text): string
    {
        // Remove null bytes and control characters
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // Ensure valid UTF-8
        if (!mb_check_encoding($text, 'UTF-8')) {
            // Try common encodings
            $encodings = ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'];
            foreach ($encodings as $encoding) {
                $converted = @mb_convert_encoding($text, 'UTF-8', $encoding);
                if (mb_check_encoding($converted, 'UTF-8')) {
                    $text = $converted;
                    break;
                }
            }
        }

        // Final fallback
        if (!mb_check_encoding($text, 'UTF-8')) {
            $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        }

        return $text;
    }

    /**
     * Test API connection
     */
    public function testConnection(): array
    {
        try {
            $testMessage = 'Hello, this is a test message.';
            $response = $this->generateResponse($testMessage, 'english');
            
            return [
                'success' => true,
                'response' => $response,
                'api_key_configured' => !empty($this->apiKey),
                'test_message' => $testMessage
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'api_key_configured' => !empty($this->apiKey)
            ];
        }
    }

    /**
     * Get API status information
     */
    public function getStatus(): array
    {
        return [
            'api_key_configured' => !empty($this->apiKey),
            'api_key_preview' => !empty($this->apiKey) ? substr($this->apiKey, 0, 10) . '...' : 'Not configured',
            'base_url' => $this->baseUrl,
            'service_name' => 'Gemini AI',
            'model' => 'gemini-2.0-flash-exp',
            'status' => !empty($this->apiKey) ? 'ready' : 'not_configured'
        ];
    }
}