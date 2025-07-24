<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Folder;

class SystemFoldersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        
        foreach ($users as $user) {
            $systemFolders = [
                [
                    'name' => 'Finished',
                    'type' => 'finished',
                    'color' => '#10b981',
                    'icon' => '✅',
                    'user_id' => $user->id,
                ],
                [
                    'name' => 'Unfinished',
                    'type' => 'unfinished',
                    'color' => '#f59e0b',
                    'icon' => '⏳',
                    'user_id' => $user->id,
                ],
            ];

            foreach ($systemFolders as $folderData) {
                $exists = Folder::where('name', $folderData['name'])
                    ->where('user_id', $user->id)
                    ->first();
                
                if (!$exists) {
                    Folder::create($folderData);
                    $this->command->info("Created folder '{$folderData['name']}' for user {$user->name}");
                } else {
                    $this->command->info("Folder '{$folderData['name']}' already exists for user {$user->name}");
                }
            }
        }
        
        $this->command->info('System folders creation completed!');
    }
}
