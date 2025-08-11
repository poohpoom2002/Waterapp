<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\ChaiyoAiService;
use Exception;

class ChaiyoAiChatController extends Controller
{
    private $chaiyoAiService;

    public function __construct()
    {
        try {
            $this->chaiyoAiService = new ChaiyoAiService();
        } catch (Exception $e) {
            Log::error('Failed to initialize ChaiyoAiService: ' . $e->getMessage());
            $this->chaiyoAiService = null;
        }
    }

    /**
     * Handle incoming chat messages from the frontend
     */
    public function handleChat(Request $request)
    {
        try {
            // Check if service is available
            if (!$this->chaiyoAiService) {
                return $this->jsonResponse([
                    'reply' => $this->getServiceUnavailableResponse(),
                    'success' => true,
                    'error' => 'service_unavailable'
                ]);
            }

            $userMessage = $this->extractUserMessage($request);

            Log::info('ChaiyoAI Chat Request', [
                'user_message' => $userMessage,
                'message_length' => mb_strlen($userMessage),
                'ip' => $request->ip(),
                'user_agent' => $request->header('User-Agent', 'Unknown')
            ]);

            // Handle empty message
            if (empty(trim($userMessage))) {
                return $this->jsonResponse([
                    'reply' => 'สวัสดีครับ! ฉันคือ **ChaiyoAI** 🤖 ตัวแทน AI ของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง และ บริษัท กนกส์โปรดัก\n\nมีอะไรให้ช่วยเหลือไหมครับ? 🌿',
                    'success' => true,
                    'message_type' => 'greeting',
                    'ai_identity' => 'ChaiyoAI'
                ]);
            }

            // Get AI response from ChaiyoAI
            $reply = $this->chaiyoAiService->generateResponse($userMessage);

            Log::info('ChaiyoAI Chat Success', [
                'user_message_length' => mb_strlen($userMessage),
                'ai_response_length' => mb_strlen($reply),
                'processing_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'] ?? 0,
                'contains_company_info' => $this->containsCompanyInfo($reply)
            ]);

            return $this->jsonResponse([
                'reply' => $reply,
                'success' => true,
                'user_message' => $this->cleanString($userMessage),
                'timestamp' => now()->toISOString(),
                'message_type' => 'ai_response',
                'ai_identity' => 'ChaiyoAI',
                'service_info' => [
                    'powered_by' => 'Gemini Pro + ChaiyoAI Knowledge Base',
                    'company_representative' => true,
                    'specialized_in' => 'ระบบน้ำและชลประทาน'
                ]
            ]);

        } catch (Exception $e) {
            Log::error('ChaiyoAI Chat Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_message' => $userMessage ?? 'N/A'
            ]);
            
            return $this->jsonResponse([
                'reply' => $this->getErrorResponse($userMessage ?? ''),
                'success' => true, // Keep success true for UX
                'error' => 'processing_error',
                'timestamp' => now()->toISOString(),
                'ai_identity' => 'ChaiyoAI'
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
     * Check if response contains company information
     */
    private function containsCompanyInfo(string $response): bool
    {
        $companyKeywords = [
            'ไชโย', 'กนก', 'chaiyo', 'kanok', 'บริษัท', 'ไปป์', 'fitting',
            'red hand', 'ตรามือแดง', 'iso', 'มอก', 'ทุนจดทะเบียน'
        ];

        $response = strtolower($response);
        foreach ($companyKeywords as $keyword) {
            if (strpos($response, strtolower($keyword)) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get error response when AI fails
     */
    private function getErrorResponse(string $userMessage): string
    {
        $isCompanyQuery = $this->isCompanyQuery($userMessage);
        
        if ($isCompanyQuery) {
            return "ขออภัยครับ ขณะนี้ระบบ ChaiyoAI กำลังประมวลผลข้อมูลบริษัท 🔧\n\n" .
                   "สำหรับข้อมูลเพิ่มเติมเกี่ยวกับ:\n" .
                   "🏢 **บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด**\n" .
                   "🏢 **บริษัท กนกส์โปรดัก จำกัด**\n\n" .
                   "📞 **โทรศัพท์:** 02-451-1111\n" .
                   "🌐 **เว็บไซต์:** www.kanokgroup.com\n" .
                   "📧 **อีเมล:** chaiyopipeonline@gmail.com\n\n" .
                   "ลองถามใหม่อีกครั้งได้เลยครับ! 😊";
        }
        
        return "ขออภัยครับ ตอนนี้ระบบ ChaiyoAI กำลังประมวลผล 🤖\n\n" .
               "ลองถามใหม่ได้เลยครับ! 😊\n\n" .
               "🌿 **ChaiyoAI** พร้อมช่วยเหลือเรื่อง:\n" .
               "💧 ระบบน้ำและชลประทาน\n" .
               "🔧 ผลิตภัณฑ์ของบริษัท\n" .
               "💡 คำแนะนำทั่วไป";
    }

    /**
     * Check if query is company-related
     */
    private function isCompanyQuery(string $message): bool
    {
        $companyKeywords = [
            'ไชโย', 'chaiyo', 'กนก', 'kanok', 'บริษัท', 'company',
            'ท่อ', 'pipe', 'ข้อต่อ', 'fitting', 'pvc', 'pe'
        ];

        $message = strtolower($message);
        foreach ($companyKeywords as $keyword) {
            if (strpos($message, strtolower($keyword)) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get service unavailable response
     */
    private function getServiceUnavailableResponse(): string
    {
        return "ขออภัยครับ ระบบ ChaiyoAI ยังไม่พร้อมใช้งาน 🔧\n\n" .
               "🏢 **บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด**\n" .
               "🏢 **บริษัท กนกส์โปรดัก จำกัด**\n\n" .
               "📞 **โทรศัพท์:** 02-451-1111\n" .
               "🌐 **เว็บไซต์:** www.kanokgroup.com\n" .
               "📧 **อีเมล:** chaiyopipeonline@gmail.com\n\n" .
               "กรุณาตรวจสอบการตั้งค่า API Key และลองใหม่อีกครั้ง\n\n" .
               "ขอบคุณครับ! 🙏";
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
            $chaiyoAiStatus = ['success' => false, 'api_key_configured' => false];
            
            if ($this->chaiyoAiService) {
                $chaiyoAiStatus = $this->chaiyoAiService->getStatus();
            }
            
            return response()->json([
                'status' => 'healthy',
                'version' => '3.0.0',
                'name' => 'ChaiyoAI - Enhanced Company Representative',
                'ai_service' => $chaiyoAiStatus['status'] ?? 'not_configured',
                'api_key_configured' => $chaiyoAiStatus['api_key_configured'] ?? false,
                'company_knowledge_loaded' => $chaiyoAiStatus['company_knowledge_loaded'] ?? false,
                'model' => 'gemini-1.5-pro',
                'supported_companies' => $chaiyoAiStatus['supported_companies'] ?? [],
                'timestamp' => now(),
                'features' => $chaiyoAiStatus['features'] ?? [
                    'general_chat' => true,
                    'company_information' => true,
                    'product_consultation' => true,
                    'irrigation_expertise' => true,
                    'multilingual_support' => true
                ],
                'ai_identity' => 'ChaiyoAI'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
                'timestamp' => now(),
                'ai_identity' => 'ChaiyoAI'
            ], 500);
        }
    }

    /**
     * Get company information endpoint
     */
    public function getCompanyInfo(Request $request)
    {
        try {
            if (!$this->chaiyoAiService) {
                return response()->json([
                    'error' => 'ChaiyoAI service not available',
                    'message' => 'Please check API configuration'
                ], 503);
            }

            $category = $request->input('category', 'overview');
            $companyInfo = $this->chaiyoAiService->getCompanyInfo($category);

            return response()->json([
                'success' => true,
                'category' => $category,
                'data' => $companyInfo,
                'available_categories' => [
                    'overview' => 'ข้อมูลทั่วไปของบริษัท',
                    'products' => 'ผลิตภัณฑ์และแบรนด์',
                    'contact' => 'ข้อมูลติดต่อ',
                    'certifications' => 'การรับรองคุณภาพ',
                    'partnerships' => 'พันธมิตรและการส่งออก',
                    'timeline' => 'ประวัติและพัฒนาการ'
                ],
                'ai_identity' => 'ChaiyoAI',
                'timestamp' => now()
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'ai_identity' => 'ChaiyoAI',
                'timestamp' => now()
            ], 500);
        }
    }

    /**
     * Get enhanced popular questions including company-specific ones
     */
    public function getPopularQuestions()
    {
        $questions = [
            'company' => [
                'บริษัทไชโยมีประวัติอย่างไร?',
                'ผลิตภัณฑ์หลักของบริษัทกนกส์โปรดักคืออะไร?',
                'ติดต่อบริษัทไชโยไปป์แอนด์ฟิตติ้งได้อย่างไร?',
                'แบรนด์ RED HAND คืออะไร?',
                'บริษัทมีการรับรองคุณภาพอะไรบ้าง?'
            ],
            'products' => [
                'ท่อ PVC และข้อต่อมีแบบไหนบ้าง?',
                'ระบบน้ำหยดทำงานอย่างไร?',
                'สปริงเกอร์เหมาะกับพืชอะไร?',
                'วาล์วสำหรับระบบน้ำมีกี่ประเภท?',
                'ปั๊มน้ำควรเลือกแบบไหน?'
            ],
            'irrigation' => [
                'วิธีคำนวณปริมาณน้ำที่พืชต้องการ',
                'ระบบชลประทานสำหรับสวนขนาดเล็ก',
                'กำหนดเวลาให้น้ำที่เหมาะสม',
                'แก้ปัญหาระบบน้ำเบื้องต้น',
                'เลือกระบบชลประทานที่ประหยัดน้ำ'
            ],
            'general' => [
                'สวัสดี คุณเป็นอย่างไรบ้าง?',
                'วันนี้เป็นอย่างไร?',
                'ช่วยแนะนำเทคนิคการเกษตร',
                'คำแนะนำการดูแลพืชสวน',
                'เทคโนโลยีการเกษตรสมัยใหม่'
            ]
        ];

        return response()->json([
            'questions' => $questions,
            'categories' => [
                'company' => '🏢 ข้อมูลบริษัท',
                'products' => '🔧 ผลิตภัณฑ์',
                'irrigation' => '💧 ระบบชลประทาน',
                'general' => '💬 สนทนาทั่วไป'
            ],
            'ai_identity' => 'ChaiyoAI',
            'company_focus' => [
                'chaiyo_pipe_fitting' => 'บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด',
                'kanok_product' => 'บริษัท กนกส์โปรดัก จำกัด'
            ]
        ]);
    }

    /**
     * Health check endpoint
     */
    public function health()
    {
        try {
            $chaiyoAiTest = ['success' => false, 'api_key_configured' => false];
            
            if ($this->chaiyoAiService) {
                $chaiyoAiTest = $this->chaiyoAiService->testConnection();
            }
            
            $status = 'healthy';
            if (!$chaiyoAiTest['success']) {
                $status = $chaiyoAiTest['api_key_configured'] ? 'degraded' : 'unhealthy';
            }
            
            return response()->json([
                'status' => $status,
                'version' => '3.0.0',
                'name' => 'ChaiyoAI - Enhanced Company Representative',
                'timestamp' => now(),
                'services' => [
                    'chaiyo_ai' => $chaiyoAiTest['success'] ? 'healthy' : 'unhealthy',
                    'company_knowledge' => $chaiyoAiTest['company_knowledge_loaded'] ?? false ? 'loaded' : 'not_loaded',
                    'utf8_handling' => 'enabled'
                ],
                'configuration' => [
                    'api_key_configured' => $chaiyoAiTest['api_key_configured'],
                    'model' => 'gemini-1.5-pro',
                    'max_tokens' => 2048,
                    'temperature' => 'dynamic (0.3 for company info, 0.7 for general chat)',
                    'company_knowledge_categories' => [
                        'company_overview', 'products', 'contact_info', 
                        'certifications', 'partnerships', 'timeline'
                    ]
                ],
                'supported_companies' => [
                    'chaiyo_pipe_fitting' => 'ไชโยไปป์แอนด์ฟิตติ้ง',
                    'kanok_product' => 'กนกส์โปรดัก'
                ],
                'ai_identity' => 'ChaiyoAI'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'timestamp' => now(),
                'ai_identity' => 'ChaiyoAI'
            ], 500);
        }
    }

    /**
     * Test endpoint for debugging and verification
     */
    public function test(Request $request)
    {
        $message = $request->input('message', 'สวัสดี บริษัทไชโยมีสินค้าอะไรบ้าง');
        
        try {
            if (!$this->chaiyoAiService) {
                return response()->json([
                    'success' => false,
                    'input' => $message,
                    'error' => 'ChaiyoAiService not initialized',
                    'hint' => 'Check GEMINI_API_KEY in .env file',
                    'ai_identity' => 'ChaiyoAI',
                    'timestamp' => now()
                ], 500);
            }

            $startTime = microtime(true);
            $response = $this->chaiyoAiService->generateResponse($message);
            $endTime = microtime(true);
            
            return response()->json([
                'success' => true,
                'input' => $message,
                'output' => $response,
                'processing_time' => round(($endTime - $startTime) * 1000, 2) . ' ms',
                'input_length' => mb_strlen($message),
                'output_length' => mb_strlen($response),
                'service_status' => $this->chaiyoAiService->getStatus(),
                'contains_company_info' => $this->containsCompanyInfo($response),
                'ai_identity' => 'ChaiyoAI',
                'timestamp' => now()
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'input' => $message,
                'error' => $e->getMessage(),
                'ai_identity' => 'ChaiyoAI',
                'timestamp' => now()
            ], 500);
        }
    }

    /**
     * Get product recommendations based on customer needs
     */
    public function getProductRecommendations(Request $request)
    {
        try {
            $customerType = $request->input('customer_type', 'general'); // farmer, construction, home_garden, etc.
            $budget = $request->input('budget', 'medium'); // low, medium, high
            $application = $request->input('application', 'general'); // irrigation, plumbing, agriculture, etc.

            if (!$this->chaiyoAiService) {
                return response()->json([
                    'error' => 'ChaiyoAI service not available',
                    'message' => 'Please contact us directly for product recommendations'
                ], 503);
            }

            $promptMessage = "แนะนำผลิตภัณฑ์ของบริษัทไชโยและกนกส์โปรดัก สำหรับ ลูกค้าประเภท: {$customerType}, งบประมาณ: {$budget}, การใช้งาน: {$application}";
            
            $recommendations = $this->chaiyoAiService->generateResponse($promptMessage);

            return response()->json([
                'success' => true,
                'customer_profile' => [
                    'type' => $customerType,
                    'budget' => $budget,
                    'application' => $application
                ],
                'recommendations' => $recommendations,
                'ai_identity' => 'ChaiyoAI',
                'disclaimer' => 'คำแนะนำจาก ChaiyoAI - กรุณาติดต่อบริษัทโดยตรงสำหรับข้อมูลราคาและรายละเอียดเพิ่มเติม',
                'contact_info' => [
                    'phone' => '02-451-1111',
                    'website' => 'www.chaiyopipe.co.th',
                    'email' => 'chaiyopipeonline@gmail.com'
                ],
                'timestamp' => now()
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'ai_identity' => 'ChaiyoAI',
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
            'service' => 'ChaiyoAI - Enhanced Company Representative',
            'version' => '3.0.0',
            'timestamp' => now(),
            'gemini_configured' => !empty(env('GEMINI_API_KEY')),
            'ai_identity' => 'ChaiyoAI',
            'companies' => [
                'chaiyo_pipe_fitting' => 'บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด',
                'kanok_product' => 'บริษัท กนกส์โปรดัก จำกัด'
            ],
            'capabilities' => [
                'company_information' => true,
                'product_consultation' => true,
                'irrigation_expertise' => true,
                'general_conversation' => true,
                'multilingual_support' => true
            ]
        ]);
    }
}