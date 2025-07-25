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
