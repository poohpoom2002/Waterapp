<?php
// app\Http\Controllers\Api\ImageUploadController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

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
            Log::error('Image validation failed', $validator->errors()->toArray());
            return response()->json([
                'error' => 'Invalid image file',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('image');
            
            // สร้างโฟลเดอร์ images ถ้ายังไม่มี
            $imagesPath = storage_path('app/public/images');
            if (!file_exists($imagesPath)) {
                mkdir($imagesPath, 0755, true);
            }
            
            // Generate unique filename
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            
            // Store in public disk under images folder
            $path = $file->storeAs('images', $filename, 'public');
            
            // ตรวจสอบว่าไฟล์ถูกสร้างจริง
            $fullPath = storage_path('app/public/' . $path);
            if (!file_exists($fullPath)) {
                throw new \Exception('File was not created successfully');
            }
            
            // ตั้งค่า permission
            chmod($fullPath, 0644);
            
            // Get full URL
            $url = Storage::url($path);
            
            Log::info('Image uploaded successfully', [
                'filename' => $filename,
                'path' => $path,
                'url' => $url,
                'file_exists' => file_exists($fullPath),
                'file_size' => file_exists($fullPath) ? filesize($fullPath) : 0
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Image uploaded successfully',
                'url' => $url,
                'path' => $path,
                'filename' => $filename,
                'full_path' => $fullPath, // เพื่อ debug
                'file_exists' => file_exists($fullPath)
            ]);
            
        } catch (\Exception $e) {
            Log::error('Image upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
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
            'images' => 'required|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid image files',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $uploadedImages = [];
            
            // สร้างโฟลเดอร์ images ถ้ายังไม่มี
            $imagesPath = storage_path('app/public/images');
            if (!file_exists($imagesPath)) {
                mkdir($imagesPath, 0755, true);
            }
            
            foreach ($request->file('images') as $file) {
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('images', $filename, 'public');
                
                // ตั้งค่า permission
                $fullPath = storage_path('app/public/' . $path);
                if (file_exists($fullPath)) {
                    chmod($fullPath, 0644);
                }
                
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
            Log::error('Multiple images upload failed', [
                'error' => $e->getMessage()
            ]);
            
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
                
                Log::info('Image deleted successfully', ['path' => $path]);
                
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
            Log::error('Image deletion failed', [
                'error' => $e->getMessage()
            ]);
            
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
            Log::error('Get image info failed', [
                'error' => $e->getMessage()
            ]);
            
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
            Log::error('List images failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to list images: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ตรวจสอบ storage configuration
     */
    public function checkStorage()
    {
        try {
            $info = [
                'storage_path' => storage_path('app/public'),
                'public_path' => public_path('storage'),
                'symlink_exists' => is_link(public_path('storage')),
                'symlink_target' => is_link(public_path('storage')) ? readlink(public_path('storage')) : null,
                'images_directory_exists' => is_dir(storage_path('app/public/images')),
                'images_directory_writable' => is_writable(storage_path('app/public/images')),
                'images_directory_permissions' => is_dir(storage_path('app/public/images')) ? 
                    substr(sprintf('%o', fileperms(storage_path('app/public/images'))), -4) : null,
            ];
            
            return response()->json([
                'success' => true,
                'storage_info' => $info
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to check storage: ' . $e->getMessage()
            ], 500);
        }
    }
}