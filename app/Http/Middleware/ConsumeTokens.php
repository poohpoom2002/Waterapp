<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ConsumeTokens
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, int $tokensToConsume = 1): Response
    {
        $user = auth()->user();
        
        // Super users don't consume tokens
        if (!$user || $user->is_super_user) {
            return $next($request);
        }

        // Check if user has enough tokens
        if (!$user->hasEnoughTokens($tokensToConsume)) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient tokens. You need at least ' . $tokensToConsume . ' tokens to perform this action.',
                'required_tokens' => $tokensToConsume,
                'current_tokens' => $user->tokens,
                'token_status' => $user->getTokenStatus()
            ], 402); // 402 Payment Required
        }

        // Consume tokens
        if (!$user->consumeTokens($tokensToConsume)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to consume tokens. Please try again.',
                'token_status' => $user->getTokenStatus()
            ], 500);
        }

        // Add token consumption info to the request
        $request->merge([
            'tokens_consumed' => $tokensToConsume,
            'remaining_tokens' => $user->tokens
        ]);

        $response = $next($request);

        // Add token info to response headers for frontend
        $response->headers->set('X-Tokens-Consumed', $tokensToConsume);
        $response->headers->set('X-Remaining-Tokens', $user->tokens);

        return $response;
    }
}