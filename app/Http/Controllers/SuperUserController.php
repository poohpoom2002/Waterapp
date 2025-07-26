<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Field;
use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SuperUserController extends Controller
{
    /**
     * Check if the current user is a super user.
     */
    private function checkSuperUser()
    {
        $user = auth()->user();
        if (!$user || !$user->isSuperUser()) {
            abort(403, 'Access denied. Super user privileges required.');
        }
    }

    /**
     * Get super user dashboard data.
     */
    public function dashboard(): JsonResponse
    {
        $this->checkSuperUser();

        $stats = [
            'total_users' => User::count(),
            'total_fields' => Field::count(),
            'total_folders' => Folder::count(),
            'recent_users' => User::latest()->take(5)->get(),
            'recent_fields' => Field::with('user')->latest()->take(5)->get(),
            'recent_folders' => Folder::with('user')->latest()->take(5)->get(),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }

    /**
     * Get all users.
     */
    public function getUsers(): JsonResponse
    {
        $this->checkSuperUser();

        $users = User::all();

        return response()->json([
            'success' => true,
            'users' => $users
        ]);
    }

    /**
     * Create a new user.
     */
    public function createUser(Request $request): JsonResponse
    {
        $this->checkSuperUser();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'is_super_user' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_super_user' => $validated['is_super_user'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'user' => $user,
            'message' => 'User created successfully'
        ]);
    }

    /**
     * Update a user.
     */
    public function updateUser(Request $request, $userId): JsonResponse
    {
        $this->checkSuperUser();

        $user = User::findOrFail($userId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($userId)],
            'password' => 'nullable|string|min:8',
            'is_super_user' => 'boolean',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'is_super_user' => $validated['is_super_user'] ?? false,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return response()->json([
            'success' => true,
            'user' => $user,
            'message' => 'User updated successfully'
        ]);
    }

    /**
     * Delete a user.
     */
    public function deleteUser($userId): JsonResponse
    {
        $this->checkSuperUser();

        $user = User::findOrFail($userId);

        // Don't allow super user to delete themselves
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete your own account'
            ], 400);
        }

        // Delete user's fields and folders
        Field::where('user_id', $userId)->delete();
        Folder::where('user_id', $userId)->delete();

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Get all fields (super user view).
     */
    public function getFields(): JsonResponse
    {
        $this->checkSuperUser();

        $fields = Field::with('user')->get();

        return response()->json([
            'success' => true,
            'fields' => $fields
        ]);
    }

    /**
     * Delete a field (super user).
     */
    public function deleteField($fieldId): JsonResponse
    {
        $this->checkSuperUser();

        $field = Field::findOrFail($fieldId);
        $field->delete();

        return response()->json([
            'success' => true,
            'message' => 'Field deleted successfully'
        ]);
    }

    /**
     * Get all folders (super user view).
     */
    public function getFolders(): JsonResponse
    {
        $this->checkSuperUser();

        $folders = Folder::with('user')->get();

        return response()->json([
            'success' => true,
            'folders' => $folders
        ]);
    }

    /**
     * Create a folder for a specific user (super user).
     */
    public function createFolderForUser(Request $request): JsonResponse
    {
        $this->checkSuperUser();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:finished,unfinished,custom,customer,category',
            'user_id' => 'required|exists:users,id',
            'color' => 'nullable|string',
            'icon' => 'nullable|string',
        ]);

        $folder = Folder::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'user_id' => $validated['user_id'],
            'color' => $validated['color'] ?? '#6366f1',
            'icon' => $validated['icon'] ?? '📁',
        ]);

        return response()->json([
            'success' => true,
            'folder' => $folder->load('user'),
            'message' => 'Folder created successfully'
        ]);
    }

    /**
     * Delete a folder (super user).
     */
    public function deleteFolder($folderId): JsonResponse
    {
        $this->checkSuperUser();

        $folder = Folder::findOrFail($folderId);
        
        // Move fields to uncategorized
        Field::where('folder_id', $folderId)->update(['folder_id' => null]);
        
        $folder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Folder deleted successfully'
        ]);
    }

    /**
     * Get user details with their fields and folders.
     */
    public function getUserDetails($userId): JsonResponse
    {
        $this->checkSuperUser();

        $user = User::with(['fields', 'folders'])->findOrFail($userId);

        return response()->json([
            'success' => true,
            'user' => $user
        ]);
    }
}
