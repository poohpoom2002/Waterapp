<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\GeminiAiService;
use Exception;

class SimpleAiTestCommand extends Command
{
    protected $signature = 'ai:test {message?} {--lang=auto} {--detail}';
    protected $description = '🧪 ทดสอบระบบ AI Chat อย่างง่าย';

    private $testResults = [];

    public function handle()
    {
        $this->info('🚀 เริ่มทดสอบระบบ AI Chat');
        $this->info('========================');
        $this->newLine();

        try {
            // Test 1: System Configuration
            $this->testConfiguration();
            
            // Test 2: Service Initialization
            $this->testServiceInit();
            
            // Test 3: API Connection
            $this->testApiConnection();
            
            // Test 4: Basic Chat
            $this->testBasicChat();
            
            // Test 5: Custom Message (if provided)
            $customMessage = $this->argument('message');
            if ($customMessage) {
                $this->testCustomMessage($customMessage);
            }
            
            // Test 6: Language Support
            $this->testLanguages();
            
            // Show summary
            $this->showSummary();

        } catch (Exception $e) {
            $this->error('❌ การทดสอบล้มเหลว: ' . $e->getMessage());
            if ($this->option('detail')) {
                $this->error('Stack trace: ' . $e->getTraceAsString());
            }
            return 1;
        }

        return 0;
    }

    private function testConfiguration()
    {
        $this->info('🔧 ทดสอบการกำหนดค่า...');

        // Check .env file
        $envPath = base_path('.env');
        if (!file_exists($envPath)) {
            $this->error('❌ ไม่พบไฟล์ .env');
            $this->testResults['env_file'] = false;
        } else {
            $this->info('✅ พบไฟล์ .env');
            $this->testResults['env_file'] = true;
        }

        // Check Gemini API Key
        $geminiKey = env('GEMINI_API_KEY');
        if (empty($geminiKey)) {
            $this->error('❌ GEMINI_API_KEY ไม่ได้ตั้งค่า');
            $this->testResults['api_key'] = false;
        } else {
            $this->info('✅ GEMINI_API_KEY: ' . substr($geminiKey, 0, 15) . '...');
            $this->testResults['api_key'] = true;
        }

        // Check PHP
        $phpVersion = PHP_VERSION;
        $this->info("✅ PHP Version: {$phpVersion}");
        $this->testResults['php_version'] = $phpVersion;

        // Check required extensions
        $extensions = ['curl', 'json', 'mbstring'];
        $missing = [];
        foreach ($extensions as $ext) {
            if (!extension_loaded($ext)) {
                $missing[] = $ext;
            }
        }
        
        if (empty($missing)) {
            $this->info('✅ PHP Extensions: พร้อมใช้งาน');
            $this->testResults['extensions'] = true;
        } else {
            $this->error('❌ PHP Extensions ที่ขาด: ' . implode(', ', $missing));
            $this->testResults['extensions'] = false;
        }

        $this->newLine();
    }

    private function testServiceInit()
    {
        $this->info('⚙️ ทดสอบการเริ่มต้นระบบ...');

        try {
            $service = new GeminiAiService();
            $this->info('✅ สร้าง GeminiAiService สำเร็จ');
            $this->testResults['service_init'] = true;
            
            $status = $service->getStatus();
            $this->line("   📊 สถานะ: {$status['status']}");
            $this->line("   🔑 API Key: {$status['api_key_preview']}");
            $this->line("   🤖 Model: {$status['model']}");
            
        } catch (Exception $e) {
            $this->error('❌ ไม่สามารถสร้าง GeminiAiService: ' . $e->getMessage());
            $this->testResults['service_init'] = false;
            throw $e;
        }

        $this->newLine();
    }

    private function testApiConnection()
    {
        $this->info('🌐 ทดสอบการเชื่อมต่อ API...');

        try {
            $service = new GeminiAiService();
            $test = $service->testConnection();
            
            if ($test['success']) {
                $this->info('✅ เชื่อมต่อ Gemini API สำเร็จ');
                if ($this->option('detail')) {
                    $preview = substr($test['response'], 0, 100) . '...';
                    $this->line("   📝 ตัวอย่างการตอบ: {$preview}");
                }
                $this->testResults['api_connection'] = true;
            } else {
                $this->error('❌ เชื่อมต่อ API ไม่สำเร็จ');
                $this->error("   Error: {$test['error']}");
                $this->testResults['api_connection'] = false;
            }
            
        } catch (Exception $e) {
            $this->error('❌ API Connection Error: ' . $e->getMessage());
            $this->testResults['api_connection'] = false;
        }

        $this->newLine();
    }

    private function testBasicChat()
    {
        $this->info('💬 ทดสอบการสนทนาพื้นฐาน...');

        $testMessages = [
            'สวัสดี' => 'การทักทายไทย',
            'Hello' => 'การทักทายอังกฤษ',
            'คุณคือใคร' => 'คำถามเกี่ยวกับตัวตน',
            'อธิบายเรื่อง AI หน่อย' => 'คำถามความรู้'
        ];

        $service = new GeminiAiService();
        $this->testResults['basic_chat'] = [];

        foreach ($testMessages as $message => $description) {
            try {
                $this->line("   ทดสอบ: {$description}");
                $startTime = microtime(true);
                $response = $service->generateResponse($message);
                $endTime = microtime(true);
                
                $time = round(($endTime - $startTime) * 1000, 2);
                
                if (!empty($response)) {
                    $this->info("     ✅ สำเร็จ ({$time}ms)");
                    if ($this->option('detail')) {
                        $preview = substr($response, 0, 80) . '...';
                        $this->line("     📝 {$preview}");
                    }
                    $this->testResults['basic_chat'][$message] = [
                        'success' => true,
                        'time' => $time,
                        'length' => mb_strlen($response)
                    ];
                } else {
                    $this->warn("     ⚠️ คำตอบเปล่า");
                    $this->testResults['basic_chat'][$message] = [
                        'success' => false,
                        'error' => 'empty_response'
                    ];
                }

            } catch (Exception $e) {
                $this->error("     ❌ Error: " . $e->getMessage());
                $this->testResults['basic_chat'][$message] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        $this->newLine();
    }

    private function testCustomMessage($message)
    {
        $this->info("🎯 ทดสอบข้อความที่กำหนด: \"{$message}\"");

        try {
            $service = new GeminiAiService();
            $startTime = microtime(true);
            $response = $service->generateResponse($message);
            $endTime = microtime(true);
            
            $time = round(($endTime - $startTime) * 1000, 2);
            
            $this->info("✅ ได้รับคำตอบสำเร็จ ({$time}ms)");
            $this->line("📝 คำตอบ: {$response}");
            
            $this->testResults['custom_message'] = [
                'success' => true,
                'message' => $message,
                'response' => $response,
                'time' => $time
            ];

        } catch (Exception $e) {
            $this->error('❌ ไม่สามารถได้รับคำตอบ: ' . $e->getMessage());
            $this->testResults['custom_message'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        $this->newLine();
    }

    private function testLanguages()
    {
        $this->info('🌏 ทดสอบการรองรับภาษา...');

        $tests = [
            'thai' => 'คุณคือใคร',
            'english' => 'Who are you?'
        ];

        $service = new GeminiAiService();
        $this->testResults['languages'] = [];

        foreach ($tests as $lang => $message) {
            try {
                $this->line("   ทดสอบภาษา: {$lang}");
                $response = $service->generateResponse($message, $lang);
                
                if (!empty($response)) {
                    $this->info("     ✅ ภาษา {$lang}: สำเร็จ");
                    $this->testResults['languages'][$lang] = [
                        'success' => true,
                        'length' => mb_strlen($response)
                    ];
                } else {
                    $this->warn("     ⚠️ ภาษา {$lang}: คำตอบเปล่า");
                    $this->testResults['languages'][$lang] = [
                        'success' => false
                    ];
                }

            } catch (Exception $e) {
                $this->error("     ❌ ภาษา {$lang}: Error - " . $e->getMessage());
                $this->testResults['languages'][$lang] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        $this->newLine();
    }

    private function showSummary()
    {
        $this->info('📋 สรุปผลการทดสอบ');
        $this->info('===================');

        // Check critical tests
        $critical = ['env_file', 'api_key', 'service_init', 'api_connection'];
        $allCriticalPassed = true;
        foreach ($critical as $test) {
            if (!isset($this->testResults[$test]) || !$this->testResults[$test]) {
                $allCriticalPassed = false;
                break;
            }
        }

        // System info
        $this->line("🖥️  ระบบ: PHP " . $this->testResults['php_version']);
        $this->line("🔑 API Key: " . ($this->testResults['api_key'] ? '✅ กำหนดแล้ว' : '❌ ไม่ได้กำหนด'));
        $this->line("🤖 Gemini API: " . ($this->testResults['api_connection'] ? '✅ เชื่อมต่อได้' : '❌ เชื่อมต่อไม่ได้'));

        // Chat performance
        if (isset($this->testResults['basic_chat'])) {
            $successful = count(array_filter($this->testResults['basic_chat'], function($r) {
                return $r['success'];
            }));
            $total = count($this->testResults['basic_chat']);
            $this->line("💬 การสนทนา: {$successful}/{$total} สำเร็จ");

            // Average response time
            $times = [];
            foreach ($this->testResults['basic_chat'] as $result) {
                if (isset($result['time'])) {
                    $times[] = $result['time'];
                }
            }
            if (!empty($times)) {
                $avgTime = round(array_sum($times) / count($times), 2);
                $this->line("⚡ เวลาตอบสนองเฉลี่ย: {$avgTime}ms");
            }
        }

        // Language support
        if (isset($this->testResults['languages'])) {
            $supportedLangs = count(array_filter($this->testResults['languages'], function($r) {
                return $r['success'];
            }));
            $totalLangs = count($this->testResults['languages']);
            $this->line("🌏 รองรับภาษา: {$supportedLangs}/{$totalLangs} ภาษา");
        }

        $this->newLine();
        
        // Overall result
        if ($allCriticalPassed) {
            $this->info('🎉 ระบบ AI Chat พร้อมใช้งาน!');
            $this->info('✨ สามารถเริ่มสนทนากับ AI ได้เลย');
        } else {
            $this->error('⚠️ ระบบยังไม่พร้อมใช้งาน');
            $this->error('🔧 กรุณาแก้ไขปัญหาก่อนใช้งาน');
        }

        $this->newLine();
        $this->info('🚀 วิธีใช้งาน:');
        $this->line('• ทดสอบ API: POST /api/ai-chat');
        $this->line('• ทดสอบข้อความ: php artisan ai:test "สวัสดี"');
        $this->line('• ทดสอบละเอียด: php artisan ai:test --detail');
        $this->line('• ดูสถานะ: GET /api/ai/health');
        $this->line('• เปิดใช้ frontend chat interface');

        if ($this->option('detail')) {
            $this->newLine();
            $this->line('📊 ผลลาพธ์แบบละเอียด:');
            $this->line(json_encode($this->testResults, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
}