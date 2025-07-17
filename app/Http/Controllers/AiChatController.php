<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiChatController extends Controller
{
    public function handleChat(Request $request)
    {
        $userMessages = $request->input('messages', []);
        if (empty($userMessages)) {
            return response()->json(['reply' => 'ไม่พบข้อความ'], 400);
        }

        $latestUserMessage = end($userMessages)['content'];

        try {
            // 1. ค้นหาข้อมูลที่เกี่ยวข้องด้วย MySQL Full-Text Search
            $relatedKnowledge = DB::table('chatbot_knowledge_base')
                ->select('content', 'source_name')
                ->whereRaw('MATCH(content) AGAINST(? IN BOOLEAN MODE)', [$latestUserMessage])
                ->take(5) // ดึงข้อมูลที่เกี่ยวข้องมา 5 ชิ้น
                ->get();

            $context = "ข้อมูลจากเอกสารภายในองค์กร:\n";
            if ($relatedKnowledge->isNotEmpty()) {
                foreach ($relatedKnowledge as $item) {
                    $context .= "- (ที่มา: {$item->source_name}) " . $item->content . "\n\n";
                }
            } else {
                $context .= "ไม่พบข้อมูลที่เกี่ยวข้องโดยตรงในฐานข้อมูลความรู้\n";
            }

            // 2. สร้าง System Prompt ที่ฉลาดและครอบคลุม
            $systemPrompt = "คุณคือ 'เกษตรอัจฉริยะ' สุดยอดผู้ช่วย AI ที่เชี่ยวชาญด้านระบบน้ำเพื่อการเกษตรของ 'บริษัท กนกโปรดักส์' และมีความรู้เกี่ยวกับผลิตภัณฑ์ของ 'บริษัท ไชโยไปป์' เป็นอย่างดี
            
            **ภารกิจหลักของคุณ:**
            1.  **ตอบจากข้อมูลเฉพาะทางก่อน:** ให้ใช้ข้อมูลในส่วน 'Context' ที่ให้มาเป็นหลักในการตอบคำถามที่เกี่ยวข้องกับระบบน้ำ, การเกษตร, โรงเรือน, หรือผลิตภัณฑ์ของบริษัท
            2.  **ถ้าข้อมูลไม่มี ให้ใช้ความรู้ทั่วไป:** หากคำถามไม่เกี่ยวกับข้อมูลใน 'Context' หรือข้อมูลไม่เพียงพอ ให้ใช้ความรู้ทั่วไปของคุณในฐานะ AI เพื่อตอบคำถามนั้นๆ อย่างเป็นธรรมชาติ เช่น การทักทาย, ความรู้รอบตัว, หรือเรื่องอื่นๆ
            3.  **ตอบตามภาษาของผู้ใช้:** จงตรวจจับภาษาของคำถามล่าสุดจากผู้ใช้ และตอบกลับเป็นภาษานั้นๆ (เช่น ถามไทย ตอบไทย, ถามอังกฤษ ตอบอังกฤษ)
            4.  **เป็นมิตรและมืออาชีพ:** ตอบด้วยความเป็นมิตร, สุภาพ, และให้ข้อมูลที่ถูกต้องชัดเจน
            5.  **อ้างอิงแหล่งที่มา:** หากคำตอบมาจากข้อมูลใน 'Context' ให้วงเล็บชื่อไฟล์ (ที่มา: ...) ต่อท้ายประโยคเสมอถ้าเป็นไปได้
            6.  **ใช้ Markdown:** จัดรูปแบบคำตอบให้อ่านง่ายโดยใช้ Markdown (ใช้ *, - สำหรับลิสต์ และ 1., 2. สำหรับขั้นตอน)";

            // 3. ประกอบ Prompt สุดท้ายเพื่อส่งให้ AI
            $finalMessages = [
                ['role' => 'user', 'parts' => [['text' => $systemPrompt]]],
                ['role' => 'model', 'parts' => [['text' => 'สวัสดีครับ ผมคือผู้ช่วย AI จากกนกโปรดักส์และไชโยไปป์ พร้อมให้คำปรึกษาด้านระบบน้ำครับ มีอะไรให้ผมช่วยไหมครับ?']]],
                ['role' => 'user', 'parts' => [['text' => "Context:\n---\n{$context}\n---\n\nUser's Latest Question: '{$latestUserMessage}'"]]]
            ];
            
            // 4. เรียก Gemini API เพื่อขอคำตอบ
            $response = Http::retry(3, 1000)->withHeaders(['Content-Type' => 'application/json'])
                ->post(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . env('GEMINI_API_KEY'),
                    [
                        'contents' => $finalMessages,
                        'generationConfig' => [
                            'maxOutputTokens' => 2048,
                            'temperature' => 0.6,
                        ],
                    ]
                );

            $response->throw();
            $reply = data_get($response->json(), 'candidates.0.content.parts.0.text', 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว');

            return response()->json(['reply' => $reply]);

        } catch (Throwable $e) {
            Log::error("AiChatController Error: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['reply' => 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง'], 500);
        }
    }
}
