<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'profile_photo_path',
        'is_super_user',
        'tier',
        'tier_expires_at',
        'monthly_tokens',
        'tokens',
        'total_tokens_used',
        'last_token_refresh',
        'token_refresh_count',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_user' => 'boolean',
            'tier_expires_at' => 'datetime',
            'monthly_tokens' => 'integer',
            'tokens' => 'integer',
            'total_tokens_used' => 'integer',
            'last_token_refresh' => 'datetime',
            'token_refresh_count' => 'integer',
        ];
    }

    /**
     * Get the user's profile photo URL.
     */
    public function getProfilePhotoUrlAttribute()
    {
        if ($this->profile_photo_path) {
            return asset('storage/' . $this->profile_photo_path);
        }
        return null;
    }

    /**
     * Check if the user is a super user.
     */
    public function isSuperUser(): bool
    {
        return $this->is_super_user;
    }

    /**
     * Get all users (super user only).
     */
    public static function getAllUsers()
    {
        return self::where('id', '!=', auth()->id())->get();
    }

    /**
     * Get all fields (super user only).
     */
    public static function getAllFields()
    {
        return \App\Models\Field::with('user')->get();
    }

    /**
     * Get all folders (super user only).
     */
    public static function getAllFolders()
    {
        return \App\Models\Folder::with('user')->get();
    }

    /**
     * Check if user has enough tokens for an operation.
     */
    public function hasEnoughTokens(int $requiredTokens = 1): bool
    {
        // Super users have unlimited tokens
        if ($this->is_super_user) {
            return true;
        }
        
        return $this->tokens >= $requiredTokens;
    }

    /**
     * Consume tokens for an operation.
     */
    public function consumeTokens(int $tokensToConsume = 1): bool
    {
        // Super users don't consume tokens
        if ($this->is_super_user) {
            return true;
        }

        if (!$this->hasEnoughTokens($tokensToConsume)) {
            return false;
        }

        $this->tokens -= $tokensToConsume;
        $this->total_tokens_used += $tokensToConsume;
        $this->save();

        return true;
    }

    /**
     * Add tokens to user account.
     */
    public function addTokens(int $tokensToAdd): void
    {
        $this->tokens += $tokensToAdd;
        $this->save();
    }

    /**
     * Refresh user tokens (daily refresh).
     */
    public function refreshTokens(): bool
    {
        // Super users don't need token refresh
        if ($this->is_super_user) {
            return true;
        }

        $now = now();
        $lastRefresh = $this->last_token_refresh;

        // Check if it's been at least 24 hours since last refresh
        if ($lastRefresh && $now->diffInHours($lastRefresh) < 24) {
            return false;
        }

        // Add tokens based on tier
        $tokensToAdd = $this->getDailyTokenAmount();
        $this->tokens += $tokensToAdd;
        $this->last_token_refresh = $now;
        $this->token_refresh_count += 1;
        $this->save();

        return true;
    }

    /**
     * Get daily token amount based on user tier.
     */
    public function getDailyTokenAmount(): int
    {
        if ($this->is_super_user) {
            return 0; // Super users don't need daily tokens
        }

        return match($this->tier) {
            'free' => 50,
            'pro' => 100,
            'advanced' => 200,
            default => 50
        };
    }

    /**
     * Get monthly token allowance based on user tier.
     */
    public function getMonthlyTokenAllowance(): int
    {
        if ($this->is_super_user) {
            return 999999; // Unlimited for super users
        }

        return match($this->tier) {
            'free' => 100,
            'pro' => 500,
            'advanced' => 1000,
            default => 100
        };
    }

    /**
     * Get token status information.
     */
    public function getTokenStatus(): array
    {
        return [
            'current_tokens' => $this->tokens,
            'total_used' => $this->total_tokens_used,
            'last_refresh' => $this->last_token_refresh,
            'refresh_count' => $this->token_refresh_count,
            'is_super_user' => $this->is_super_user,
            'can_refresh' => $this->canRefreshTokens(),
            'tier' => $this->tier,
            'daily_tokens' => $this->getDailyTokenAmount(),
            'monthly_allowance' => $this->getMonthlyTokenAllowance(),
        ];
    }

    /**
     * Check if user can refresh tokens.
     */
    public function canRefreshTokens(): bool
    {
        if ($this->is_super_user) {
            return false; // Super users don't need to refresh
        }

        if (!$this->last_token_refresh) {
            return true; // Never refreshed before
        }

        return now()->diffInHours($this->last_token_refresh) >= 24;
    }

    /**
     * Get user tier information.
     */
    public function getTierInfo(): array
    {
        return [
            'tier' => $this->tier,
            'tier_expires_at' => $this->tier_expires_at,
            'monthly_tokens' => $this->monthly_tokens,
            'is_tier_active' => $this->isTierActive(),
        ];
    }

    /**
     * Check if user's tier is active.
     */
    public function isTierActive(): bool
    {
        if ($this->is_super_user) {
            return true; // Super users always have active tier
        }

        if ($this->tier === 'free') {
            return true; // Free tier is always active
        }

        return $this->tier_expires_at && $this->tier_expires_at->isFuture();
    }

    /**
     * Upgrade user tier.
     */
    public function upgradeTier(string $newTier, int $months = 1): bool
    {
        if (!in_array($newTier, ['pro', 'advanced'])) {
            return false;
        }

        $this->tier = $newTier;
        
        // Set expiration date
        if ($this->tier_expires_at && $this->tier_expires_at->isFuture()) {
            // Extend existing subscription
            $this->tier_expires_at = $this->tier_expires_at->addMonths($months);
        } else {
            // New subscription
            $this->tier_expires_at = now()->addMonths($months);
        }

        // Set monthly tokens based on tier
        $this->monthly_tokens = $newTier === 'pro' ? 500 : 1000;
        
        $this->save();
        return true;
    }

    /**
     * Get tier display name.
     */
    public function getTierDisplayName(): string
    {
        return match($this->tier) {
            'free' => 'Free',
            'pro' => 'Pro',
            'advanced' => 'Advanced',
            default => 'Free'
        };
    }

    /**
     * Get the user's fields.
     */
    public function fields()
    {
        return $this->hasMany(Field::class);
    }

    /**
     * Get the user's folders.
     */
    public function folders()
    {
        return $this->hasMany(Folder::class);
    }
}
