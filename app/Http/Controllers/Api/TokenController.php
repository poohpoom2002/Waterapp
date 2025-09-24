<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class TokenController extends Controller
{
    /**
     * Get current user's token status.
     */
    public function getTokenStatus(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        return response()->json([
            'success' => true,
            'token_status' => $user->getTokenStatus()
        ]);
    }


    /**
     * Consume tokens for an operation.
     */
    public function consumeTokens(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $request->validate([
            'tokens' => 'required|integer|min:1',
            'operation' => 'required|string'
        ]);

        $tokensToConsume = $request->input('tokens');
        $operation = $request->input('operation');

        if ($user->consumeTokens($tokensToConsume)) {
            return response()->json([
                'success' => true,
                'message' => "Successfully consumed {$tokensToConsume} tokens for {$operation}",
                'token_status' => $user->getTokenStatus()
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient tokens',
                'token_status' => $user->getTokenStatus()
            ], 400);
        }
    }

    /**
     * Check if user has enough tokens for an operation.
     */
    public function checkTokens(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $request->validate([
            'tokens' => 'required|integer|min:1'
        ]);

        $requiredTokens = $request->input('tokens');
        $hasEnough = $user->hasEnoughTokens($requiredTokens);

        return response()->json([
            'success' => true,
            'has_enough_tokens' => $hasEnough,
            'required_tokens' => $requiredTokens,
            'current_tokens' => $user->tokens,
            'token_status' => $user->getTokenStatus()
        ]);
    }

    /**
     * Add tokens to user account (admin only).
     */
    public function addTokens(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$user->is_super_user) {
            return response()->json([
                'success' => false,
                'message' => 'Admin privileges required'
            ], 403);
        }

        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'tokens' => 'required|integer|min:1'
        ]);

        $targetUser = \App\Models\User::findOrFail($request->input('user_id'));
        $tokensToAdd = $request->input('tokens');
        
        $targetUser->addTokens($tokensToAdd);

        return response()->json([
            'success' => true,
            'message' => "Added {$tokensToAdd} tokens to user {$targetUser->name}",
            'user_token_status' => $targetUser->getTokenStatus()
        ]);
    }

    /**
     * Get token usage statistics (admin only).
     */
    public function getTokenStats(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$user->is_super_user) {
            return response()->json([
                'success' => false,
                'message' => 'Admin privileges required'
            ], 403);
        }

        $stats = [
            'total_users' => \App\Models\User::count(),
            'total_tokens_in_circulation' => \App\Models\User::sum('tokens'),
            'total_tokens_used' => \App\Models\User::sum('total_tokens_used'),
            'users_with_tokens' => \App\Models\User::where('tokens', '>', 0)->count(),
            'users_without_tokens' => \App\Models\User::where('tokens', '=', 0)->count(),
            'average_tokens_per_user' => \App\Models\User::avg('tokens'),
            'top_token_users' => \App\Models\User::orderBy('total_tokens_used', 'desc')
                ->select('name', 'email', 'total_tokens_used', 'tokens')
                ->take(10)
                ->get()
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}