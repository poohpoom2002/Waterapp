<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile page.
     */
    public function show(Request $request): Response
    {
        $user = $request->user();
        
        return Inertia::render('profile', [
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'created_at' => $user->created_at,
                    'profile_photo_url' => $user->profile_photo_url,
                    'is_super_user' => $user->is_super_user,
                    'tier' => $user->tier,
                    'tier_expires_at' => $user->tier_expires_at,
                    'monthly_tokens' => $user->monthly_tokens,
                    'tokens' => $user->tokens,
                    'total_tokens_used' => $user->total_tokens_used,
                    'tier_info' => $user->getTierInfo(),
                ],
            ],
        ]);
    }
}
