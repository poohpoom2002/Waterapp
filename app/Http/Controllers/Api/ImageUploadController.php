<?php
// app\Http\Controllers\Api\ImageUploadController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ImageUploadController extends Controller
{
    /**
     * Upload single image
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid image file',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('image');
            
            // Generate unique filename
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            
            // Store in public disk under images folder
            $path = $file->storeAs('images', $filename, 'public');
            
            // Get full URL
            $url = Storage::url($path);
            
            return response()->json([
                'success' => true,
                'message' => 'Image uploaded successfully',
                'url' => $url,
                'path' => $path,
                'filename' => $filename
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload multiple images
     */
    public function multiple(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'images' => 'required|array|max:10', // Maximum 10 images
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max each
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid image files',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $uploadedImages = [];
            
            foreach ($request->file('images') as $file) {
                // Generate unique filename
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                
                // Store in public disk under images folder
                $path = $file->storeAs('images', $filename, 'public');
                
                // Get full URL
                $url = Storage::url($path);
                
                $uploadedImages[] = [
                    'url' => $url,
                    'path' => $path,
                    'filename' => $filename,
                    'original_name' => $file->getClientOriginalName(),
                    'size' => $file->getSize()
                ];
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Images uploaded successfully',
                'images' => $uploadedImages,
                'count' => count($uploadedImages)
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to upload images: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete image
     */
    public function destroy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Path is required',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $path = $request->path;
            
            // Remove /storage/ prefix if present
            $path = str_replace('/storage/', '', $path);
            
            // Check if file exists and delete
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Image deleted successfully'
                ]);
            } else {
                return response()->json([
                    'error' => 'Image not found'
                ], 404);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete image: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get image info
     */
    public function show(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Path is required',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $path = $request->path;
            
            // Remove /storage/ prefix if present
            $path = str_replace('/storage/', '', $path);
            
            // Check if file exists
            if (Storage::disk('public')->exists($path)) {
                $url = Storage::url($path);
                $size = Storage::disk('public')->size($path);
                $lastModified = Storage::disk('public')->lastModified($path);
                
                return response()->json([
                    'success' => true,
                    'image' => [
                        'url' => $url,
                        'path' => $path,
                        'size' => $size,
                        'last_modified' => date('Y-m-d H:i:s', $lastModified),
                        'exists' => true
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'image' => [
                        'path' => $path,
                        'exists' => false
                    ]
                ], 404);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get image info: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List all images
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $perPage = min($request->get('per_page', 20), 100);
            
            // Get all image files
            $files = Storage::disk('public')->files('images');
            
            // Filter only image files
            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $images = collect($files)->filter(function ($file) use ($imageExtensions) {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                return in_array($extension, $imageExtensions);
            })->map(function ($file) {
                return [
                    'url' => Storage::url($file),
                    'path' => $file,
                    'filename' => basename($file),
                    'size' => Storage::disk('public')->size($file),
                    'last_modified' => date('Y-m-d H:i:s', Storage::disk('public')->lastModified($file))
                ];
            })->sortByDesc('last_modified')->values();

            // Paginate
            $total = $images->count();
            $offset = ($page - 1) * $perPage;
            $paginatedImages = $images->slice($offset, $perPage)->values();

            return response()->json([
                'success' => true,
                'images' => $paginatedImages,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage),
                    'from' => $offset + 1,
                    'to' => min($offset + $perPage, $total)
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to list images: ' . $e->getMessage()
            ], 500);
        }
    }
}