<?php
// app/Http/Controllers/ChatController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log; // เพิ่ม Log facade

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        $rawMessages = $request->input('messages', []);

        // 1. สร้าง System Prompt เพื่อกำหนดบทบาทและความสามารถของ AI
        $systemPrompt = "คุณคือ 'เกษตรอัจฉริยะ' ผู้ช่วยและที่ปรึกษาในแอปพลิเคชันเกี่ยวกับการวางระบบน้ำและอุปกรณ์การเกษตร
- ความเชี่ยวชาญของคุณคือ: ระบบสปริงเกลอร์, ปั๊มน้ำ, ท่อ, และการเกษตรทั่วไป
- ตอบคำถามด้วยความเป็นมิตรและเป็นมืออาชีพ
- เมื่อต้องการแสดงรายการ ให้ใช้ Markdown bullet points (เครื่องหมาย * หรือ -)
- หากเป็นการแนะนำขั้นตอน ให้ใช้ Markdown numbered list (ตัวเลข 1., 2., 3.)
- ตอบเป็นภาษาไทย";

        // 2. แปลง Messages จาก Frontend และเพิ่ม System Prompt เข้าไป
        $geminiMessages = [];

        // เพิ่ม System Prompt เป็นข้อความแรกสุดในการสนทนา
        // Gemini ทำงานได้ดีเมื่อมี role 'user' และ 'model' สลับกัน
        $geminiMessages[] = ['role' => 'user', 'parts' => [['text' => $systemPrompt]]];
        $geminiMessages[] = ['role' => 'model', 'parts' => [['text' => 'รับทราบครับ! ผมคือเกษตรอัจฉริยะ พร้อมให้คำปรึกษาด้านระบบน้ำและการเกษตรแล้วครับ มีอะไรให้ผมช่วยไหมครับ?']]];


        foreach ($rawMessages as $msg) {
            // แปลง role 'assistant' ของ frontend ให้เป็น 'model' ของ Gemini
            $role = ($msg['role'] === 'assistant') ? 'model' : $msg['role'];
            $geminiMessages[] = [
                'role' => $role,
                'parts' => [['text' => $msg['content']]]
            ];
        }


        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . env('GEMINI_API_KEY'),
                [
                    'contents' => $geminiMessages,
                    'generationConfig' => [
                        // เพิ่มจำนวน Tokens เพื่อให้ AI ตอบได้ยาวและละเอียดขึ้น
                        'maxOutputTokens' => 1024,
                        'temperature' => 0.7,
                    ],
                ]
            );

            $response->throw();

            $responseData = $response->json();

            $reply = data_get($responseData, 'candidates.0.content.parts.0.text', 'ขออภัยค่ะ ไม่สามารถตอบได้ในขณะนี้');

            if (isset($responseData['promptFeedback']['blockReason'])) {
                 $reply = 'ไม่สามารถประมวลผลคำถามนี้ได้เนื่องจากเหตุผลด้านความปลอดภัย: ' . $responseData['promptFeedback']['blockReason'];
            }

            return response()->json(['reply' => $reply]);

        } catch (\Illuminate\Http\Client\RequestException $e) {
            $statusCode = $e->response ? $e->response->status() : 'N/A';
            $errorMessage = $e->getMessage();
            Log::error("Gemini API Error: Status {$statusCode} - {$errorMessage}", ['response' => $e->response ? $e->response->json() : null]);
            return response()->json(['reply' => 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง'], 500);
        } catch (\Exception $e) {
            Log::error("General Error in ChatController: " . $e->getMessage());
            return response()->json(['reply' => 'เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแล'], 500);
        }
    }
}