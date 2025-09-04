<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ChaiyoAiService
{
    private $apiKey;
    private $baseUrl;
    private $companyKnowledge;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
        
        if (empty($this->apiKey)) {
            throw new Exception('GEMINI_API_KEY not found in .env file');
        }

        $this->initializeCompanyKnowledge();
    }

    /**
     * Initialize comprehensive company knowledge base
     */
    private function initializeCompanyKnowledge(): void
    {
        $this->companyKnowledge = [
            'company_overview' => [
                'chaiyo_pipe_fitting' => [
                    'full_name' => 'บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด (Chaiyo Pipe & Fitting Co., Ltd.)',
                    'registration_number' => '0105551062871',
                    'founded_date' => '13 มิถุนายน 2551',
                    'years_in_operation' => '17 ปี',
                    'capital' => '35,000,000 บาท',
                    'company_value' => '53,792,100 บาท',
                    'status' => 'ยังดำเนินกิจการอยู่',
                    'address' => '71/6 หมู่ที่ 1 ตำบลคอกกระบือ อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
                    'business_type' => 'การผลิตผลิตภัณฑ์พลาสติกเพื่อการเกษตรทุกชนิด',
                    'relationship' => 'บริษัทในเครือของ บริษัท กนกส์โปรดัก จำกัด'
                ],
                'kanok_product' => [
                    'full_name' => 'บริษัท กนกส์โปรดัก จำกัด (Kanok Product Co., Ltd.)',
                    'registration_number' => '0105549044446',
                    'founded_date' => 'พ.ศ. 2541 (1998)',
                    'registration_date' => '3 เมษายน 2549',
                    'capital' => '10,000,000 บาท',
                    'experience' => 'มากกว่า 27 ปี',
                    'address' => '15-23 ซอยพระยามนธาตุฯ แยก 10 ถนนบางขุนเทียน แขวงคลองบางบอน เขตบางบอน กรุงเทพมหานคร 10150',
                    'business_type' => 'ผู้ผลิต ส่งออก และจัดจำหน่ายระบบน้ำเพื่อการเกษตรและระบบชลประทาน',
                    'target_revenue' => 'มากกว่า 600 ล้านบาท ต่อปี',
                    'employees' => 'ประมาณ 24 คน',
                    'products_count' => 'มากกว่า 6,000-9,000 รายการ'
                ]
            ],
            'management' => [
                'kanok_product' => [
                    'managing_director' => 'คุณโผล์กฤษณ์ กนกสินปิณโย (Pholkrit Kanoksinpinyo)',
                    'family_member' => 'คุณกาญจน์พสิษฐ์ กนกสินปิณโย'
                ]
            ],
            'products' => [
                'main_categories' => [
                    'ท่อและข้อต่อ PVC' => [
                        'description' => 'ได้รับมาตรฐาน มอก. 1131-2535',
                        'applications' => 'งานประปา งานชลประทาน งานก่อสร้าง'
                    ],
                    'ท่อ PE และ HDPE' => [
                        'description' => 'สำหรับระบบน้ำการเกษตร',
                        'applications' => 'ระบบชลประทาน การเกษตรสมัยใหม่'
                    ],
                    'ระบบน้ำหยด' => [
                        'products' => 'สเปรย์เทป, ดริปเทป',
                        'benefits' => 'ประหยัดน้ำ เพิ่มประสิทธิภาพการให้น้ำ'
                    ],
                    'หัวสปริงเกอร์' => [
                        'types' => 'มินิสปริงเกอร์และสปริงเกอร์',
                        'applications' => 'รดน้ำพืชสวน สนามหญ้า'
                    ],
                    'วาล์วและอุปกรณ์' => [
                        'products' => 'ฟุตวาล์ว, เช็ควาล์ว, บอลวาล์ว',
                        'specifications' => 'ทนแรงดันถึง 13.5 บาร์'
                    ],
                    'อุปกรณ์ประปา' => [
                        'products' => 'ปั๊มน้ำและอะไหล่',
                        'applications' => 'ระบบประปาบ้าน ระบบชลประทาน'
                    ]
                ],
                'brands' => [
                    'RED HAND (ตรามือแดง)' => 'แบรนด์หลักสำหรับท่อและข้อต่อ PVC',
                    'CHAIYO (ไชโย)' => 'ผลิตภัณฑ์เกษตรและระบบน้ำ',
                    'CHAMP (แชมป์)' => 'สายผลิตภัณฑ์เสริม',
                    'KANOK' => 'ผลิตภัณฑ์จากบริษัทกนกส์โปรดัก'
                ]
            ],
            'certifications' => [
                'ISO 9001:2015' => 'รับรองใหม่ปี 2565',
                'มาตรฐานผลิตภัณฑ์อุตสาหกรรม (มอก.)' => 'มาตรฐานคุณภาพไทย',
                'Bureau Veritas Certification' => 'การรับรองจากองค์กรระหว่างประเทศ',
                'TIS (Thai Industrial Standards)' => 'มาตรฐานอุตสาหกรรมไทย',
                'UV Protection Technology' => 'เทคโนโลยีป้องกัน UV สำหรับท่อใช้งานภายนอก'
            ],
            'distribution_channels' => [
                'modern_retail' => [
                    'ไทวัสดุ' => '44 สาขา',
                    'โฮมโปร' => '85+ สาขาทั่วประเทศ',
                    'เมกาโฮม' => 'ร้านค้าปลีกสมัยใหม่',
                    'เซ็นทรัล ดีพาร์ทเมนต์สโตร์' => 'ห้างสรรพสินค้า'
                ],
                'online_platforms' => [
                    'เว็บไซต์บริษัท' => 'www.chaiyopipe.co.th, www.kanokgroup.com',
                    'Lazada' => 'lazada.co.th/shop/kanok-product',
                    'Shopee' => 'มีหลายร้านค้า'
                ],
                'social_media' => [
                    'Facebook' => 'Red hand ท่อ PVC (2,850+ ผู้ติดตาม), kanokproduct (42,541+ ผู้ติดตาม)',
                    'YouTube' => 'ช่องทางการสื่อสารผ่านวิดีโอ',
                    'LinkedIn' => 'linkedin.com/company/kanokproduct'
                ]
            ],
            'contact_info' => [
                'chaiyo_pipe_fitting' => [
                    'phones' => ['065-9404230', '065-9404231', '089-9892211', '086-3107020', '066-1549-5974', '02-451-1111'],
                    'fax' => '02-416-3011',
                    'emails' => ['chaiyopipeonline@gmail.com', 'chayut@kanokproduct.com'],
                    'line_id' => 'chayut.tee',
                    'note' => 'ติดต่อผ่านบริษัทกนกส์โปรดัก (บริษัทแม่)'
                ],
                'kanok_product' => [
                    'phone_main' => '02-451-1111',
                    'phone_product_inquiry' => 'กด 2 สำหรับสอบถามผลิตภัณฑ์',
                    'extensions' => 'ต่อ 103-136, 185-187',
                    'mobile' => '098-286-0809',
                    'websites' => ['www.kanokgroup.com', 'www.kanokproduct.com', 'shop.kanokproduct.com'],
                    'main_contact' => 'ช่องทางติดต่อหลักสำหรับทั้ง 2 บริษัท'
                ]
            ],
            'partnerships' => [
                'international' => [
                    'NORMA Group (เยอรมนี)' => 'ความร่วมมือตั้งแต่มีนาคม 2565 สำหรับข้อต่ออัด'
                ],
                'export_markets' => [
                    'ซาอุดีอาระเบีย', 'อียิปต์', 'เกาหลี', 'มาเลเซีย', 'แอฟริกา', 'ตะวันออกกลาง'
                ]
            ],
            'company_timeline' => [
                '2541 (1998)' => 'ก่อตั้งบริษัทกนกส์โปรดัก โดยคุณโผล์กฤษณ์ กนกสินปิณโย',
                '2543 (2000)' => 'ลงทุนเทคโนโลยี CNC สำหรับแม่พิมพ์',
                '2544 (2001)' => 'ขยายกำลังการผลิตสปริงเกอร์',
                '2551 (2008)' => 'สร้างสำนักงานใหญ่แห่งใหม่ และก่อตั้งบริษัทไชโยไปป์แอนด์ฟิตติ้ง',
                '2552-2556' => 'ขยายกำลังการผลิตข้อต่อ PVC และท่อ PE',
                '2554 (2011)' => 'ความร่วมมือกับร้านค้าปลีกสมัยใหม่',
                '2558 (2015)' => 'ได้รับ ISO 9001:2008',
                '2565 (2022)' => 'ได้รับ ISO 9001:2015 และความร่วมมือกับ NORMA Group',
                '2566 (2023)' => 'เข้าร่วม ThaiTAM2023 - International Agri-Machinery Business Matching',
                '2567 (2024)' => 'ขยายธุรกิจต่อเนื่อง, เข้าร่วมงาน AGRITECHNICA ASIA'
            ],
            'facilities' => [
                'kanok_product' => [
                    'โรงงานแรก' => 'เอกชัย 44/6 (ก่อตั้ง 1998)',
                    'สำนักงานใหญ่ปัจจุบัน' => 'ซอยพระยามนธาตุฯ แยก 10 (สร้าง 2008)',
                    'โรงงานผลิต' => 'มหาชัย (ผลิตข้อต่อ PVC)',
                    'หลายแห่งการผลิต' => 'สำหรับสายผลิตภัณฑ์ต่างๆ'
                ]
            ],
            'target_customers' => [
                'เกษตรกรและฟาร์ม',
                'ระบบชลประทาน',
                'งานก่อสร้าง (ระบบประปา)',
                'งานติดตั้งไฟฟ้า',
                'อุตสาหกรรมต่างๆ'
            ],
            'employee_benefits' => [
                'ประกันสังคม',
                'ค่าขยันเข้างาน',
                'ค่าล่วงเวลา',
                'โบนัสประจำปี',
                'ปรับเงินเดือนประจำปี',
                'รถรับส่งพนักงาน (บางสาขา)',
                'ประกันสุขภาพกลุ่ม',
                'ตรวจสุขภาพประจำปี',
                'เงินช่วยเหลือพิเศษ',
                'ที่พักพนักงาน',
                'งานเลี้ยงประจำปี'
            ]
        ];
    }

    /**
     * Generate AI response using Gemini API with enhanced company knowledge
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

            // Check if message is about company information
            $isCompanyQuery = $this->isCompanyRelatedQuery($userMessage);
            
            // Build comprehensive system prompt
            $systemPrompt = $this->buildEnhancedSystemPrompt($language, $isCompanyQuery);
            
            // Create conversation context
            $fullPrompt = $systemPrompt . "\n\nUser: " . $userMessage . "\n\nChaiyoAI:";

            Log::info('ChaiyoAI Request', [
                'user_message' => $userMessage,
                'language' => $language,
                'is_company_query' => $isCompanyQuery,
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
                    'temperature' => $isCompanyQuery ? 0.3 : 0.7, // Lower temperature for company info
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
                Log::error('ChaiyoAI API HTTP Error', [
                    'status' => $response->status(),
                    'body' => $errorBody
                ]);
                throw new Exception("ChaiyoAI API Error: HTTP {$response->status()}");
            }

            $responseData = $response->json();
            
            // Extract response text
            $aiResponse = $this->extractResponseText($responseData);
            
            if (empty($aiResponse)) {
                Log::warning('Empty response from ChaiyoAI', ['response_data' => $responseData]);
                throw new Exception('Empty response received from ChaiyoAI');
            }

            // Clean up the response
            $finalResponse = $this->postProcessResponse($aiResponse, $isCompanyQuery);

            Log::info('ChaiyoAI Success', [
                'response_length' => mb_strlen($finalResponse),
                'language' => $language,
                'is_company_query' => $isCompanyQuery
            ]);

            return $finalResponse;

        } catch (Exception $e) {
            Log::error('ChaiyoAI Error', [
                'error' => $e->getMessage(),
                'user_message' => $userMessage ?? 'N/A'
            ]);

            // Return fallback response
            return $this->getFallbackResponse($userMessage, $language);
        }
    }

    /**
     * Check if the query is related to company information
     */
    private function isCompanyRelatedQuery(string $message): bool
    {
        $companyKeywords = [
            // Company names
            'ไชโย', 'chaiyo', 'กนก', 'kanok', 'ไปป์', 'pipe', 'fitting', 'ไชโยไปป์', 'กนกส์โปรดัก',
            // Products
            'ท่อ', 'ข้อต่อ', 'pvc', 'pe', 'hdpe', 'สปริงเกอร์', 'sprinkler', 'วาล์ว', 'valve',
            'น้ำหยด', 'drip', 'ปั๊ม', 'pump', 'red hand', 'ตรามือแดง', 'champ', 'แชมป์',
            // Business info
            'บริษัท', 'company', 'ติดต่อ', 'contact', 'ที่อยู่', 'address', 'โทร', 'phone',
            'ประวัติ', 'history', 'ก่อตั้ง', 'founded', 'ทุน', 'capital', 'iso',
            // Services
            'ผลิต', 'manufacture', 'จำหน่าย', 'sell', 'ขาย', 'ราคา', 'price', 'ร้าน', 'shop',
            'ตัวแทน', 'dealer', 'ไทวัสดุ', 'โฮมโปร', 'lazada'
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
     * Build enhanced system prompt with company knowledge
     */
    private function buildEnhancedSystemPrompt(string $language, bool $isCompanyQuery): string
    {
        $companyInfo = '';
        
        if ($isCompanyQuery) {
            $companyInfo = $this->getCompanyKnowledgePrompt();
        }

        if ($language === 'thai') {
            return "คุณคือ ChaiyoAI ผู้ช่วย AI ที่เป็นตัวแทนอย่างเป็นทางการของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด และ บริษัท กนกส์โปรดัก จำกัด

🏢 **ข้อมูลสำคัญของบริษัท:**
{$companyInfo}

📋 **หลักการตอบคำถาม:**
1. **สำหรับคำถามเกี่ยวกับบริษัท:** ใช้ข้อมูลที่ให้ไว้ด้านบนตอบอย่างแม่นยำและครบถ้วน
2. **สำหรับคำถามทั่วไป:** ตอบคำถามอย่างเป็นธรรมชาติและเป็นมิตร โดยเฉพาะเรื่องระบบน้ำและชลประทาน
3. ตอบเป็นภาษาไทยที่เข้าใจง่าย พูดจาแบบเป็นกันเองและสบายๆ
4. แสดงความเป็นมืออาชีพในฐานะตัวแทนบริษัท
5. หากไม่ทราบคำตอบ ให้บอกตรงๆ และแนะนำการติดต่อบริษัทโดยตรง
6. เน้นย้ำคุณภาพของผลิตภัณฑ์และการบริการ
7. แนะนำผลิตภัณฑ์ที่เหมาะสมกับความต้องการของลูกค้า

🎯 **เอกลักษณ์ของ ChaiyoAI:**
- เป็นผู้เชี่ยวชาญด้านระบบน้ำและชลประทาน
- มีความรู้ลึกเกี่ยวกับผลิตภัณฑ์ทั้ง 2 บริษัท
- ให้คำปรึกษาที่เป็นประโยชน์และปฏิบัติได้จริง
- มีบุคลิกเป็นมิตร น่าเชื่อถือ และมืออาชีพ";

        } else {
            return "You are ChaiyoAI, the official AI representative of Chaiyo Pipe & Fitting Co., Ltd. and Kanok Product Co., Ltd.

🏢 **Important Company Information:**
{$companyInfo}

📋 **Response Guidelines:**
1. **For company-related questions:** Use the provided information above to answer accurately and comprehensively
2. **For general questions:** Answer naturally and friendly, especially about water systems and irrigation
3. Respond in clear, professional English while maintaining a friendly tone
4. Show professionalism as a company representative
5. If you don't know something, say so honestly and suggest contacting the company directly
6. Emphasize product quality and service excellence
7. Recommend suitable products based on customer needs

🎯 **ChaiyoAI Identity:**
- Expert in water systems and irrigation
- Deep knowledge of both companies' products
- Provides practical and beneficial advice
- Friendly, trustworthy, and professional personality";
        }
    }

    /**
     * Get comprehensive company knowledge prompt
     */
    private function getCompanyKnowledgePrompt(): string
    {
        $knowledge = $this->companyKnowledge;
        
        return "
**บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด:**
- ชื่อเต็ม: {$knowledge['company_overview']['chaiyo_pipe_fitting']['full_name']}
- เลขทะเบียน: {$knowledge['company_overview']['chaiyo_pipe_fitting']['registration_number']}
- ก่อตั้ง: {$knowledge['company_overview']['chaiyo_pipe_fitting']['founded_date']} (ดำเนินกิจการมา {$knowledge['company_overview']['chaiyo_pipe_fitting']['years_in_operation']})
- ทุนจดทะเบียน: {$knowledge['company_overview']['chaiyo_pipe_fitting']['capital']}
- ที่อยู่: {$knowledge['company_overview']['chaiyo_pipe_fitting']['address']}
- ประเภทธุรกิจ: {$knowledge['company_overview']['chaiyo_pipe_fitting']['business_type']}

**บริษัท กนกส์โปรดัก จำกัด (บริษัทแม่):**
- ชื่อเต็ม: {$knowledge['company_overview']['kanok_product']['full_name']}
- เลขทะเบียน: {$knowledge['company_overview']['kanok_product']['registration_number']}
- ก่อตั้ง: {$knowledge['company_overview']['kanok_product']['founded_date']} (ประสบการณ์ {$knowledge['company_overview']['kanok_product']['experience']})
- กรรมการผู้จัดการ: {$knowledge['management']['kanok_product']['managing_director']}
- ที่อยู่: {$knowledge['company_overview']['kanok_product']['address']}
- เป้าหมายรายได้: {$knowledge['company_overview']['kanok_product']['target_revenue']}

**ผลิตภัณฑ์หลัก:**
" . implode("\n", array_map(function($product, $details) {
    if (is_array($details)) {
        $desc = isset($details['description']) ? $details['description'] : 
               (isset($details['products']) ? $details['products'] : 
               (isset($details['types']) ? $details['types'] : json_encode($details)));
        return "- {$product}: {$desc}";
    }
    return "- {$product}: {$details}";
}, array_keys($knowledge['products']['main_categories']), $knowledge['products']['main_categories'])) . "

**แบรนด์สินค้า:**
" . implode("\n", array_map(function($brand, $desc) {
    return "- {$brand}: {$desc}";
}, array_keys($knowledge['products']['brands']), $knowledge['products']['brands'])) . "

**การรับรองคุณภาพ:**
" . implode("\n", array_map(function($cert, $desc) {
    return "- {$cert}: {$desc}";
}, array_keys($knowledge['certifications']), $knowledge['certifications'])) . "

**ช่องทางจำหน่าย:**
- ร้านค้าปลีกสมัยใหม่: " . implode(", ", array_map(function($store, $branches) {
    return "{$store} ({$branches})";
}, array_keys($knowledge['distribution_channels']['modern_retail']), $knowledge['distribution_channels']['modern_retail'])) . "
- ออนไลน์: " . implode(", ", $knowledge['distribution_channels']['online_platforms']) . "

**ข้อมูลติดต่อ:**
- โทรศัพท์ (ไชโย): " . implode(", ", $knowledge['contact_info']['chaiyo_pipe_fitting']['phones']) . "
- โทรศัพท์ (กนก): {$knowledge['contact_info']['kanok_product']['phone_main']} - ช่องทางติดต่อหลัก
- เว็บไซต์หลัก: " . implode(", ", $knowledge['contact_info']['kanok_product']['websites']) . "
- อีเมล: " . implode(", ", $knowledge['contact_info']['chaiyo_pipe_fitting']['emails']) . "
- หมายเหตุ: ติดต่อบริษัทกนกส์โปรดัก เป็นช่องทางหลักสำหรับทั้ง 2 บริษัท

**พันธมิตรสำคัญ:**
- NORMA Group (เยอรมนี): ความร่วมมือด้านข้อต่ออัดตั้งแต่มีนาคม 2565
- ตลาดส่งออก: " . implode(", ", $knowledge['partnerships']['export_markets']) . "

**กลุ่มลูกค้าเป้าหมาย:**
" . implode("\n", array_map(function($customer) {
    return "- {$customer}";
}, $knowledge['target_customers'])) . "
";
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
     * Post-process AI response with company branding
     */
    private function postProcessResponse(string $response, bool $isCompanyQuery): string
    {
        // Clean up response
        $response = trim($response);
        
        // Remove common prefixes
        $response = preg_replace('/^(ตอบ:|คำตอบ:|Answer:|Response:|Assistant:|ChaiyoAI:)\s*/i', '', $response);
        
        // Normalize line breaks
        $response = preg_replace('/\n{3,}/', "\n\n", $response);
        
        // Add company signature for company-related queries
        if ($isCompanyQuery && !empty($response)) {
            $response .= "\n\n🌿 **ChaiyoAI** - ตัวแทน AI ของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด และ บริษัท กนกส์โปรดัก จำกัด";
        }
        
        return $response;
    }

    /**
     * Get fallback response when API fails
     */
    private function getFallbackResponse(string $userMessage, string $language): string
    {
        $msg = mb_strtolower($userMessage);
        $isCompanyQuery = $this->isCompanyRelatedQuery($userMessage);
        
        if ($language === 'thai') {
            // Check for greetings
            if (preg_match('/สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi/i', $msg)) {
                return "สวัสดีครับ! ฉันคือ **ChaiyoAI** 🤖\n\nตัวแทน AI ของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด และ บริษัท กนกส์โปรดัก จำกัด\n\nยินดีที่ได้ให้บริการ! มีอะไรให้ช่วยเหลือไหมครับ? 😊\n\n🌿 พร้อมตอบคำถามเกี่ยวกับ:\n- ระบบน้ำและชลประทาน\n- ผลิตภัณฑ์ของทั้งสองบริษัท\n- ข้อมูลบริษัทและการติดต่อ";
            }
            
            if ($isCompanyQuery) {
                return "ขออภัยครับ ขณะนี้ระบบ ChaiyoAI กำลังโหลดข้อมูลบริษัท 🔄\n\nสำหรับข้อมูลเพิ่มเติมเกี่ยวกับบริษัท ไชโยไปป์แอนด์ฟิตติ้ง และ กนกส์โปรดัก สามารถติดต่อโดยตรง:\n\n📞 **โทรศัพท์:** 02-451-1111\n🌐 **เว็บไซต์:** www.chaiyopipe.co.th\n📧 **อีเมล:** chaiyopipeonline@gmail.com\n\nลองถามใหม่อีกครั้งได้เลยครับ! 😊";
            }
            
            return "ขออภัยครับ ตอนนี้ระบบ ChaiyoAI กำลังโหลดข้อมูล 🤖\n\nฉันพร้อมช่วยตอบคำถามเรื่อง:\n- ระบบน้ำและชลประทาน 💧\n- ผลิตภัณฑ์ของบริษัท 🔧\n- คำแนะนำทั่วไป 💡\n\nลองถามใหม่ได้เลยครับ! 😊";
        } else {
            // English fallback
            if (preg_match('/hello|hi|hey|good/i', $msg)) {
                return "Hello! I'm **ChaiyoAI** 🤖\n\nThe official AI representative of Chaiyo Pipe & Fitting Co., Ltd. and Kanok Product Co., Ltd.\n\nNice to meet you! How can I assist you today? 😊\n\n🌿 Ready to help with:\n- Water systems and irrigation\n- Company products and services\n- General information and advice";
            }
            
            if ($isCompanyQuery) {
                return "I apologize, ChaiyoAI is currently loading company data 🔄\n\nFor more information about Chaiyo Pipe & Fitting and Kanok Product, please contact directly:\n\n📞 **Phone:** 02-451-1111\n🌐 **Website:** www.chaiyopipe.co.th\n📧 **Email:** chaiyopipeonline@gmail.com\n\nPlease feel free to ask again! 😊";
            }
            
            return "I'm ChaiyoAI, currently loading data 🤖\n\nReady to help with:\n- Water systems and irrigation 💧\n- Company products and services 🔧\n- General advice and information 💡\n\nPlease feel free to ask me anything! 😊";
        }
    }

    /**
     * Get default response for empty input
     */
    private function getDefaultResponse(string $language): string
    {
        if ($language === 'thai') {
            return "สวัสดีครับ! ฉันคือ **ChaiyoAI** 🤖\n\nตัวแทน AI ของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด และ บริษัท กนกส์โปรดัก จำกัด\n\nมีอะไรให้ช่วยเหลือไหมครับ? 🌿";
        } else {
            return "Hello! I'm **ChaiyoAI** 🤖\n\nThe official AI representative of Chaiyo Pipe & Fitting Co., Ltd. and Kanok Product Co., Ltd.\n\nHow can I help you today? 🌿";
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
            $testMessage = 'สวัสดี บริษัทไชโยมีสินค้าอะไรบ้าง';
            $response = $this->generateResponse($testMessage, 'thai');
            
            return [
                'success' => true,
                'response' => $response,
                'api_key_configured' => !empty($this->apiKey),
                'test_message' => $testMessage,
                'company_knowledge_loaded' => !empty($this->companyKnowledge)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'api_key_configured' => !empty($this->apiKey),
                'company_knowledge_loaded' => !empty($this->companyKnowledge)
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
            'service_name' => 'ChaiyoAI - Enhanced Company Representative',
            'model' => 'gemini-1.5-pro',
            'company_knowledge_loaded' => !empty($this->companyKnowledge),
            'supported_companies' => [
                'chaiyo_pipe_fitting' => 'บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด',
                'kanok_product' => 'บริษัท กนกส์โปรดัก จำกัด'
            ],
            'features' => [
                'general_chat' => true,
                'company_information' => true,
                'product_consultation' => true,
                'irrigation_expertise' => true,
                'multilingual_support' => true,
                'context_awareness' => true
            ],
            'status' => !empty($this->apiKey) ? 'ready' : 'not_configured'
        ];
    }

    /**
     * Get company information for specific queries
     */
    public function getCompanyInfo(string $category = 'overview'): array
    {
        switch ($category) {
            case 'overview':
                return $this->companyKnowledge['company_overview'] ?? [];
            case 'products':
                return $this->companyKnowledge['products'] ?? [];
            case 'contact':
                return $this->companyKnowledge['contact_info'] ?? [];
            case 'certifications':
                return $this->companyKnowledge['certifications'] ?? [];
            case 'partnerships':
                return $this->companyKnowledge['partnerships'] ?? [];
            case 'timeline':
                return $this->companyKnowledge['company_timeline'] ?? [];
            default:
                return $this->companyKnowledge ?? [];
        }
    }
}