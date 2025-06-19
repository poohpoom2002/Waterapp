<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http; // ยังคงใช้ Http facade เดิม

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        // 1. รับ messages จาก frontend
        // Note: Gemini API มีรูปแบบ role ที่ต่างจาก OpenAI เล็กน้อย
        // 'user' สำหรับผู้ใช้
        // 'model' สำหรับ AI (Gemini)
        // ดังนั้นอาจต้องมีการแปลง role ถ้า frontend ส่งมาเป็น 'assistant'
        $rawMessages = $request->input('messages', []);

        // แปลงรูปแบบ messages ให้เข้ากับ Gemini API
        // ถ้า frontend ส่ง role เป็น 'assistant' ให้เปลี่ยนเป็น 'model'
        $geminiMessages = [];
        foreach ($rawMessages as $msg) {
            $role = ($msg['role'] === 'assistant') ? 'model' : $msg['role'];
            $geminiMessages[] = [
                'role' => $role,
                'parts' => [
                    ['text' => $msg['content']]
                ]
            ];
        }

        // เพิ่มข้อความล่าสุดจากผู้ใช้ (หากยังไม่รวมใน $rawMessages)
        // หรือถ้าคุณต้องการรับเฉพาะข้อความล่าสุดจาก frontend
        // $userMessage = $request->input('message');
        // $geminiMessages[] = ['role' => 'user', 'parts' => [['text' => $userMessage]]];

        // ในตัวอย่างนี้ ผมสมมติว่า frontend ส่ง 'messages' array มาให้ครบ
        // และถ้าข้อความสุดท้ายเป็น 'user' มันจะถูกรวมอยู่ใน $geminiMessages แล้ว

        try {
            // 2. เรียกใช้ Gemini API
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . env('GEMINI_API_KEY'),
                [
                    'contents' => $geminiMessages, // ใช้ messages ที่แปลงแล้ว
                    'generationConfig' => [
                        'maxOutputTokens' => 300, // กำหนดจำนวน tokens สูงสุดของคำตอบ
                        'temperature' => 0.7,     // กำหนดความสุ่มของคำตอบ (0.0-1.0, สูงคือสุ่มมาก)
                        // 'topP' => 0.95,
                        // 'topK' => 40,
                    ],
                    // 'safetySettings' => [
                    //     // ตั้งค่าความปลอดภัย (Optional)
                    //     // ดูเอกสาร Gemini API สำหรับรายละเอียด
                    // ],
                ]
            );

            // ตรวจสอบว่า API ตอบกลับมาสำเร็จหรือไม่
            $response->throw(); // จะ throw Exception ถ้า response เป็น error (4xx หรือ 5xx)

            $responseData = $response->json();

            // 3. ดึงคำตอบจาก response ของ Gemini
            // โครงสร้างของ response จาก Gemini จะต่างจาก OpenAI/OpenRouter
            $reply = data_get($responseData, 'candidates.0.content.parts.0.text', 'ไม่สามารถตอบได้');

            // หากมี error จาก Gemini แต่ response เป็น 200 OK
            if (isset($responseData['promptFeedback']['blockReason'])) {
                 $reply = 'ไม่สามารถประมวลผลคำถามนี้ได้เนื่องจากเหตุผลด้านความปลอดภัย: ' . $responseData['promptFeedback']['blockReason'];
            }

            return response()->json(['reply' => $reply]);

        } catch (\Illuminate\Http\Client\RequestException $e) {
            // ดักจับข้อผิดพลาดในการเรียก API (เช่น Network error, 4xx, 5xx)
            $statusCode = $e->response ? $e->response->status() : 'N/A';
            $errorMessage = $e->getMessage();
            \Log::error("Gemini API Error: Status {$statusCode} - {$errorMessage}", ['response' => $e->response ? $e->response->json() : null]);
            return response()->json(['reply' => 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง'], 500);
        } catch (\Exception $e) {
            // ดักจับข้อผิดพลาดอื่นๆ
            \Log::error("General Error in ChatController: " . $e->getMessage());
            return response()->json(['reply' => 'เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแล'], 500);
        }
    }
}

// namespace App\Http\Controllers;

// use Illuminate\Http\Request;
// use Illuminate\Support\Facades\Http;

// class ChatController extends Controller
// {
//     public function chat(Request $request)
// {
//     $messages = $request->input('messages', []);

//     $response = Http::withHeaders([
//         'Authorization' => 'Bearer ' . env('OPENROUTER_API_KEY'),
//         'Content-Type'  => 'application/json',
//     ])->post('https://openrouter.ai/api/v1/chat/completions', [
//         'model' => 'openai/gpt-3.5-turbo',
//         'max_tokens' => 300,
//         'temperature' => 0.7,
//         'messages' => $messages,
//     ]);

//     $reply = data_get($response->json(), 'choices.0.message.content', 'ไม่สามารถตอบได้');

//     return response()->json(['reply' => $reply]);
// }

// }
