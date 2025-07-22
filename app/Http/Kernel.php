<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Chaiyo AI Maintenance Tasks
        $schedule->command('chaiyo:ai update')
            ->daily()
            ->at('02:00')
            ->appendOutputTo(storage_path('logs/chaiyo-ai-maintenance.log'));

        $schedule->command('chaiyo:ai clean')
            ->weekly()
            ->sundays()
            ->at('03:00')
            ->appendOutputTo(storage_path('logs/chaiyo-ai-maintenance.log'));

        $schedule->command('chaiyo:ai optimize')
            ->weekly()
            ->sundays()
            ->at('04:00')
            ->appendOutputTo(storage_path('logs/chaiyo-ai-maintenance.log'));

        // Process pending web links every hour
        $schedule->command('ai:process-web-links')
            ->hourly()
            ->withoutOverlapping()
            ->appendOutputTo(storage_path('logs/chaiyo-ai-web-processing.log'));

        // Daily statistics logging
        $schedule->call(function () {
            \Log::info('Daily Chaiyo AI Stats', [
                'pdf_count' => \DB::table('chatbot_knowledge_base')->count(),
                'web_links' => \DB::table('ai_training_links')->where('status', 'completed')->count(),
                'conversations_today' => \DB::table('ai_conversations')->whereDate('created_at', today())->count() ?? 0,
                'failed_links' => \DB::table('ai_training_links')->where('status', 'failed')->count(),
            ]);
        })->daily()->at('23:55');

        // Clean old logs
        $schedule->exec('find ' . storage_path('logs') . ' -name "*.log" -mtime +30 -delete')
            ->monthly()
            ->description('Clean old log files');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}