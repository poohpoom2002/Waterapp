<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

class ProfilePhotoController extends Controller
{
    /**
     * Upload a new profile photo.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            'crop_data' => 'nullable|array',
            'crop_data.x' => 'nullable|numeric',
            'crop_data.y' => 'nullable|numeric',
            'crop_data.width' => 'nullable|numeric',
            'crop_data.height' => 'nullable|numeric',
        ]);

        try {
            $user = Auth::user();
            $file = $request->file('photo');
            
            // Generate unique filename
            $filename = 'profile-photos/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
            
            // Process and crop the image if crop data is provided
            if ($request->has('crop_data') && $request->crop_data) {
                $image = Image::make($file);
                
                $cropData = $request->crop_data;
                $image->crop(
                    (int) $cropData['width'],
                    (int) $cropData['height'],
                    (int) $cropData['x'],
                    (int) $cropData['y']
                );
                
                // Resize to standard profile photo size (300x300)
                $image->resize(300, 300, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });
                
                // Save the processed image
                $image->save(storage_path('app/public/' . $filename));
            } else {
                // Store original image and resize
                $image = Image::make($file);
                $image->resize(300, 300, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });
                
                $image->save(storage_path('app/public/' . $filename));
            }
            
            // Delete old profile photo if exists
            if ($user->profile_photo_path) {
                Storage::disk('public')->delete($user->profile_photo_path);
            }
            
            // Update user's profile photo path
            $user->update(['profile_photo_path' => $filename]);
            
            return response()->json([
                'success' => true,
                'message' => 'Profile photo uploaded successfully',
                'photo_url' => $user->profile_photo_url,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload profile photo: ' . $e->getMessage(),
            ], 500);
        }
    }
    
    /**
     * Delete the current profile photo.
     */
    public function delete()
    {
        try {
            $user = Auth::user();
            
            if ($user->profile_photo_path) {
                Storage::disk('public')->delete($user->profile_photo_path);
                $user->update(['profile_photo_path' => null]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Profile photo deleted successfully',
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'No profile photo to delete',
            ], 404);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete profile photo: ' . $e->getMessage(),
            ], 500);
        }
    }
}
