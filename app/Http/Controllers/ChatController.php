<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function chat(Request $request)
{
    $messages = $request->input('messages', []);

    $response = Http::withHeaders([
        'Authorization' => 'Bearer ' . env('OPENROUTER_API_KEY'),
        'Content-Type'  => 'application/json',
    ])->post('https://openrouter.ai/api/v1/chat/completions', [
        'model' => 'openai/gpt-3.5-turbo',
        'max_tokens' => 300,
        'temperature' => 0.7,
        'messages' => $messages,
    ]);

    $reply = data_get($response->json(), 'choices.0.message.content', 'ไม่สามารถตอบได้');

    return response()->json(['reply' => $reply]);
}

}
