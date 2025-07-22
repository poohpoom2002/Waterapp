<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\GeminiAiService;
use Exception;

class AiChatController extends Controller
{
    private $geminiService;

    public function __construct()
    {
        try {
            $this->geminiService = new GeminiAiService();
        } catch (Exception $e) {
            Log::error('Failed to initialize GeminiAiService: ' . $e->getMessage());
            $this->geminiService = null;
        }
    }

    /**
     * Handle incoming chat messages from the frontend
     */
    public function handleChat(Request $request)
    {
        try {
            // Check if service is available
            if (!$this->geminiService) {
                return $this->jsonResponse([
                    'reply' => $this->getServiceUnavailableResponse(),
                    'success' => true,
                    'error' => 'service_unavailable'
                ]);
            }

            $userMessage = $this->extractUserMessage($request);

            Log::info('AI Chat Request', [
                'user_message' => $userMessage,
                'message_length' => mb_strlen($userMessage),
                'ip' => $request->ip()
            ]);

            // Handle empty message
            if (empty(trim($userMessage))) {
                return $this->jsonResponse([
                    'reply' => 'สวัสดี! ฉันคือ AI ผู้ช่วย 🤖 มีอะไรให้ช่วยไหม?',
                    'success' => true,
                    'message_type' => 'greeting'
                ]);
            }

            // Get AI response from Gemini
            $reply = $this->geminiService->generateResponse($userMessage);

            Log::info('AI Chat Success', [
                'user_message_length' => mb_strlen($userMessage),
                'ai_response_length' => mb_strlen($reply),
                'processing_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'] ?? 0
            ]);

            return $this->jsonResponse([
                'reply' => $reply,
                'success' => true,
                'user_message' => $this->cleanString($userMessage),
                'timestamp' => now()->toISOString(),
                'message_type' => 'ai_response'
            ]);

        } catch (Exception $e) {
            Log::error('AI Chat Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_message' => $userMessage ?? 'N/A'
            ]);
            
            return $this->jsonResponse([
                'reply' => $this->getErrorResponse(),
                'success' => true, // Keep success true for UX
                'error' => 'processing_error',
                'timestamp' => now()->toISOString()
            ]);
        }
    }

    /**
     * Extract user message from various request formats
     */
    private function extractUserMessage(Request $request): string
    {
        $userMessage = '';
        
        // Method 1: From messages array (most common)
        if ($request->has('messages')) {
            $messages = $request->input('messages');
            if (is_array($messages) && !empty($messages)) {
                $latestMessage = end($messages);
                if (isset($latestMessage['content'])) {
                    $userMessage = $latestMessage['content'];
                }
            }
        }
        
        // Method 2: Direct message field
        if (empty($userMessage)) {
            $userMessage = $request->input('message', '');
        }
        
        // Method 3: Direct content field
        if (empty($userMessage)) {
            $userMessage = $request->input('content', '');
        }
        
        // Method 4: From raw JSON content
        if (empty($userMessage)) {
            $rawContent = $request->getContent();
            if (!empty($rawContent)) {
                try {
                    $decoded = json_decode($rawContent, true);
                    if (isset($decoded['message'])) {
                        $userMessage = $decoded['message'];
                    } elseif (isset($decoded['content'])) {
                        $userMessage = $decoded['content'];
                    } elseif (isset($decoded['messages']) && is_array($decoded['messages'])) {
                        $latestMessage = end($decoded['messages']);
                        if (isset($latestMessage['content'])) {
                            $userMessage = $latestMessage['content'];
                        }
                    }
                } catch (Exception $e) {
                    Log::warning('Failed to parse JSON content', ['error' => $e->getMessage()]);
                }
            }
        }

        // Clean and validate the message
        $userMessage = $this->cleanString(trim($userMessage));

        return $userMessage;
    }

    /**
     * Get error response when AI fails
     */
    private function getErrorResponse(): string
    {
        return "ขออภัยนะ ตอนนี้ระบบ AI กำลังประมวลผล 🤖\n\n" .
               "ลองถามใหม่ได้เลย! 😊";
    }

    /**
     * Get service unavailable response
     */
    private function getServiceUnavailableResponse(): string
    {
        return "ขออภัยนะ ระบบ AI ยังไม่พร้อมใช้งาน 🔧\n\n" .
               "กรุณาตรวจสอบการตั้งค่า API Key และลองใหม่อีกครั้ง\n\n" .
               "ขอบคุณ! 🙏";
    }

    /**
     * Safe JSON Response with proper UTF-8 handling
     */
    private function jsonResponse($data, $status = 200)
    {
        $cleanData = $this->cleanDataForJson($data);
        
        return response()->json($cleanData, $status, [
            'Content-Type' => 'application/json; charset=UTF-8'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    /**
     * Clean data recursively for JSON encoding
     */
    private function cleanDataForJson($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->cleanDataForJson($value);
            }
            return $data;
        }
        
        if (is_string($data)) {
            return $this->cleanString($data);
        }
        
        return $data;
    }

    /**
     * Clean string for safe JSON encoding and UTF-8 compliance
     */
    private function cleanString($str)
    {
        if (empty($str)) {
            return '';
        }

        // Remove control characters and null bytes
        $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $str);
        
        // Ensure UTF-8 encoding
        if (!mb_check_encoding($str, 'UTF-8')) {
            $encodings = ['UTF-8', 'Windows-1252', 'ISO-8859-1', 'ASCII'];
            foreach ($encodings as $encoding) {
                $converted = @mb_convert_encoding($str, 'UTF-8', $encoding);
                if ($converted && mb_check_encoding($converted, 'UTF-8')) {
                    $str = $converted;
                    break;
                }
            }
        }

        // Handle HTML entities
        $str = html_entity_decode($str, ENT_QUOTES, 'UTF-8');
        
        // Handle URL encoding
        if (strpos($str, '%') !== false) {
            $decoded = urldecode($str);
            if (mb_check_encoding($decoded, 'UTF-8')) {
                $str = $decoded;
            }
        }

        // Final validation
        if (!mb_check_encoding($str, 'UTF-8')) {
            return 'ข้อความไม่ถูกต้อง';
        }
        
        return $str;
    }

    /**
     * Get system stats and health information
     */
    public function getStats()
    {
        try {
            $geminiStatus = ['success' => false, 'api_key_configured' => false];
            
            if ($this->geminiService) {
                $geminiStatus = $this->geminiService->getStatus();
            }
            
            return response()->json([
                'status' => 'healthy',
                'version' => '2.0.0',
                'name' => 'Simple AI Chat',
                'gemini_api' => $geminiStatus['status'] ?? 'not_configured',
                'api_key_configured' => $geminiStatus['api_key_configured'] ?? false,
                'model' => 'gemini-2.0-flash-exp',
                'timestamp' => now(),
                'features' => [
                    'gemini_ai' => true,
                    'general_chat' => true,
                    'thai_language' => true,
                    'english_language' => true,
                    'simple_ai' => true
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
                'timestamp' => now()
            ], 500);
        }
    }

    /**
     * Get popular questions for UI (simple examples)
     */
    public function getPopularQuestions()
    {
        $questions = [
            'general' => [
                'สวัสดี คุณเป็นอย่างไรบ้าง?',
                'วันนี้เป็นอย่างไร?',
                'ช่วยอธิบายอะไรสักอย่างให้ฟังหน่อย',
                'เล่าเรื่องตลกให้ฟังหน่อย',
                'คุณคิดอย่างไรเรื่อง AI?'
            ],
            'help' => [
                'ช่วยแนะนำหนังดีๆ หน่อย',
                'วิธีทำอาหารง่ายๆ',
                'เทคนิคการเรียนที่ดี',
                'แนะนำการออกกำลังกาย',
                'วิธีผ่อนคลาย'
            ],
            'knowledge' => [
                'อธิบายเรื่องวิทยาศาสตร์ให้ฟัง',
                'เล่าประวัติศาสตร์น่าสนใจ',
                'แนะนำหนังสือดีๆ',
                'เรื่องน่ารู้เกี่ยวกับเทคโนโลยี',
                'ข้อมูลน่าสนใจทั่วไป'
            ]
        ];

        return response()->json([
            'questions' => $questions,
            'categories' => [
                'general' => '💬 สนทนาทั่วไป',
                'help' => '🤝 ขอความช่วยเหลือ',
                'knowledge' => '📚 ความรู้ทั่วไป'
            ]
        ]);
    }

    /**
     * Health check endpoint
     */
    public function health()
    {
        try {
            $geminiTest = ['success' => false, 'api_key_configured' => false];
            
            if ($this->geminiService) {
                $geminiTest = $this->geminiService->testConnection();
            }
            
            $status = 'healthy';
            if (!$geminiTest['success']) {
                $status = $geminiTest['api_key_configured'] ? 'degraded' : 'unhealthy';
            }
            
            return response()->json([
                'status' => $status,
                'version' => '2.0.0',
                'name' => 'Simple AI Chat',
                'timestamp' => now(),
                'services' => [
                    'gemini_api' => $geminiTest['success'] ? 'healthy' : 'unhealthy',
                    'utf8_handling' => 'enabled'
                ],
                'configuration' => [
                    'api_key_configured' => $geminiTest['api_key_configured'],
                    'model' => 'gemini-2.0-flash-exp',
                    'max_tokens' => 2048,
                    'temperature' => 0.7
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'timestamp' => now()
            ], 500);
        }
    }

    /**
     * Test endpoint for debugging and verification
     */
    public function test(Request $request)
    {
        $message = $request->input('message', 'สวัสดี');
        
        try {
            if (!$this->geminiService) {
                return response()->json([
                    'success' => false,
                    'input' => $message,
                    'error' => 'GeminiAiService not initialized',
                    'hint' => 'Check GEMINI_API_KEY in .env file',
                    'timestamp' => now()
                ], 500);
            }

            $startTime = microtime(true);
            $response = $this->geminiService->generateResponse($message);
            $endTime = microtime(true);
            
            return response()->json([
                'success' => true,
                'input' => $message,
                'output' => $response,
                'processing_time' => round(($endTime - $startTime) * 1000, 2) . ' ms',
                'input_length' => mb_strlen($message),
                'output_length' => mb_strlen($response),
                'service_status' => $this->geminiService->getStatus(),
                'timestamp' => now()
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'input' => $message,
                'error' => $e->getMessage(),
                'timestamp' => now()
            ], 500);
        }
    }

    /**
     * Quick ping endpoint
     */
    public function ping()
    {
        return response()->json([
            'status' => 'pong',
            'service' => 'Simple AI Chat',
            'version' => '2.0.0',
            'timestamp' => now(),
            'gemini_configured' => !empty(env('GEMINI_API_KEY'))
        ]);
    }
}