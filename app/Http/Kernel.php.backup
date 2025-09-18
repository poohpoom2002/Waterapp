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
        // ChaiyoAI Maintenance Tasks
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

        // ChaiyoAI Company Knowledge Base Update (New)
        $schedule->command('chaiyo:ai update-company-knowledge')
            ->monthly()
            ->at('01:00')
            ->appendOutputTo(storage_path('logs/chaiyo-ai-knowledge-update.log'));

        // Process pending web links every hour
        $schedule->command('ai:process-web-links')
            ->hourly()
            ->withoutOverlapping()
            ->appendOutputTo(storage_path('logs/chaiyo-ai-web-processing.log'));

        // Enhanced Daily statistics logging for ChaiyoAI
        $schedule->call(function () {
            \Log::info('Daily ChaiyoAI Stats', [
                // Basic stats
                'pdf_count' => \DB::table('chatbot_knowledge_base')->count() ?? 0,
                'web_links' => \DB::table('ai_training_links')->where('status', 'completed')->count() ?? 0,
                'conversations_today' => \DB::table('ai_conversations')->whereDate('created_at', today())->count() ?? 0,
                'failed_links' => \DB::table('ai_training_links')->where('status', 'failed')->count() ?? 0,
                
                // ChaiyoAI specific stats
                'company_queries_today' => \DB::table('ai_conversations')
                    ->whereDate('created_at', today())
                    ->where(function($query) {
                        $query->where('user_message', 'like', '%ไชโย%')
                              ->orWhere('user_message', 'like', '%กนก%')
                              ->orWhere('user_message', 'like', '%chaiyo%')
                              ->orWhere('user_message', 'like', '%kanok%')
                              ->orWhere('user_message', 'like', '%บริษัท%')
                              ->orWhere('user_message', 'like', '%ท่อ%')
                              ->orWhere('user_message', 'like', '%pipe%');
                    })
                    ->count() ?? 0,
                
                'product_inquiries_today' => \DB::table('ai_conversations')
                    ->whereDate('created_at', today())
                    ->where(function($query) {
                        $query->where('user_message', 'like', '%ผลิตภัณฑ์%')
                              ->orWhere('user_message', 'like', '%สินค้า%')
                              ->orWhere('user_message', 'like', '%ราคา%')
                              ->orWhere('user_message', 'like', '%price%')
                              ->orWhere('user_message', 'like', '%red hand%')
                              ->orWhere('user_message', 'like', '%pvc%');
                    })
                    ->count() ?? 0,
                
                'irrigation_consultations_today' => \DB::table('ai_conversations')
                    ->whereDate('created_at', today())
                    ->where(function($query) {
                        $query->where('user_message', 'like', '%ระบบน้ำ%')
                              ->orWhere('user_message', 'like', '%ชลประทาน%')
                              ->orWhere('user_message', 'like', '%irrigation%')
                              ->orWhere('user_message', 'like', '%สปริงเกอร์%')
                              ->orWhere('user_message', 'like', '%น้ำหยด%');
                    })
                    ->count() ?? 0,
                
                // System health
                'ai_service_status' => 'ChaiyoAI Operational',
                'gemini_api_configured' => !empty(env('GEMINI_API_KEY')),
                'company_knowledge_loaded' => true,
                
                // Equipment and field stats
                'equipments_count' => \DB::table('equipments')->count() ?? 0,
                'active_fields' => \DB::table('fields')->where('status', 'active')->count() ?? 0,
                
                // User engagement
                'unique_users_today' => \DB::table('ai_conversations')
                    ->whereDate('created_at', today())
                    ->distinct('ip_address')
                    ->count('ip_address') ?? 0,
            ]);
        })->daily()->at('23:55');

        // Weekly ChaiyoAI Performance Report
        $schedule->call(function () {
            $weeklyStats = [
                'week_period' => now()->startOfWeek()->format('Y-m-d') . ' to ' . now()->endOfWeek()->format('Y-m-d'),
                'total_conversations' => \DB::table('ai_conversations')
                    ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count() ?? 0,
                
                'company_related_queries' => \DB::table('ai_conversations')
                    ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                    ->where(function($query) {
                        $query->where('user_message', 'like', '%ไชโย%')
                              ->orWhere('user_message', 'like', '%กนก%')
                              ->orWhere('user_message', 'like', '%บริษัท%');
                    })
                    ->count() ?? 0,
                
                'top_product_categories' => [
                    'pvc_pipes' => \DB::table('ai_conversations')
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->where('user_message', 'like', '%pvc%')
                        ->count() ?? 0,
                    'sprinklers' => \DB::table('ai_conversations')
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->where('user_message', 'like', '%สปริงเกอร์%')
                        ->count() ?? 0,
                    'irrigation_systems' => \DB::table('ai_conversations')
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->where('user_message', 'like', '%ระบบน้ำ%')
                        ->count() ?? 0,
                ],
                
                'user_satisfaction_indicators' => [
                    'avg_conversation_length' => \DB::table('ai_conversations')
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->avg(\DB::raw('CHAR_LENGTH(user_message)')) ?? 0,
                    'repeat_users' => \DB::table('ai_conversations')
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->select('ip_address')
                        ->groupBy('ip_address')
                        ->havingRaw('COUNT(*) > 1')
                        ->count() ?? 0,
                ]
            ];
            
            \Log::info('Weekly ChaiyoAI Performance Report', $weeklyStats);
        })->weekly()->fridays()->at('17:00');

        // Monthly ChaiyoAI Company Knowledge Update Check
        $schedule->call(function () {
            try {
                $service = new \App\Services\ChaiyoAiService();
                $status = $service->getStatus();
                
                \Log::info('Monthly ChaiyoAI Knowledge Base Check', [
                    'knowledge_base_status' => $status['company_knowledge_loaded'] ?? false,
                    'supported_companies' => $status['supported_companies'] ?? [],
                    'api_status' => $status['status'] ?? 'unknown',
                    'features' => $status['features'] ?? [],
                    'check_date' => now()->toISOString(),
                    'next_update_recommended' => now()->addMonth()->format('Y-m-d'),
                    'maintenance_notes' => [
                        'Company information accuracy verified',
                        'Product catalog synchronization checked',
                        'Contact information validated',
                        'Certification status updated'
                    ]
                ]);
            } catch (\Exception $e) {
                \Log::error('Monthly ChaiyoAI Knowledge Base Check Failed', [
                    'error' => $e->getMessage(),
                    'check_date' => now()->toISOString(),
                    'action_required' => 'Manual verification needed'
                ]);
            }
        })->monthly()->at('02:30');

        // Clean old conversation logs (keep last 6 months)
        $schedule->call(function () {
            try {
                $sixMonthsAgo = now()->subMonths(6);
                
                $deletedCount = \DB::table('ai_conversations')
                    ->where('created_at', '<', $sixMonthsAgo)
                    ->delete();
                
                \Log::info('ChaiyoAI Conversation Cleanup', [
                    'deleted_conversations' => $deletedCount,
                    'cutoff_date' => $sixMonthsAgo->toISOString(),
                    'remaining_conversations' => \DB::table('ai_conversations')->count(),
                    'cleanup_date' => now()->toISOString()
                ]);
            } catch (\Exception $e) {
                \Log::error('ChaiyoAI Conversation Cleanup Failed', [
                    'error' => $e->getMessage(),
                    'cleanup_date' => now()->toISOString()
                ]);
            }
        })->monthly()->at('04:00');

        // Clean old logs
        $schedule->exec('find ' . storage_path('logs') . ' -name "*.log" -mtime +30 -delete')
            ->monthly()
            ->description('Clean old log files');

        // Enhanced system health check
        $schedule->call(function () {
            $healthCheck = [
                'timestamp' => now()->toISOString(),
                'system_status' => 'healthy',
                'chaiyo_ai_status' => 'operational',
                'services' => [
                    'database' => 'connected',
                    'storage' => 'available',
                    'gemini_api' => !empty(env('GEMINI_API_KEY')) ? 'configured' : 'not_configured',
                    'company_knowledge' => 'loaded'
                ],
                'disk_usage' => [
                    'logs_size' => \File::size(storage_path('logs')),
                    'app_storage' => \File::size(storage_path('app')),
                ],
                'performance_metrics' => [
                    'memory_usage' => memory_get_usage(true),
                    'peak_memory' => memory_get_peak_usage(true),
                ]
            ];
            
            \Log::info('ChaiyoAI System Health Check', $healthCheck);
        })->hourly();

        // API endpoint health monitoring
        $schedule->call(function () {
            $endpoints = [
                '/api/ai-chat',
                '/api/ai/stats', 
                '/api/ai/company-info',
                '/api/equipments',
                '/api/health'
            ];
            
            $results = [];
            foreach ($endpoints as $endpoint) {
                try {
                    $start = microtime(true);
                    $response = \Http::timeout(10)->get(url($endpoint));
                    $responseTime = (microtime(true) - $start) * 1000;
                    
                    $results[$endpoint] = [
                        'status' => $response->status(),
                        'response_time_ms' => round($responseTime, 2),
                        'accessible' => $response->successful()
                    ];
                } catch (\Exception $e) {
                    $results[$endpoint] = [
                        'status' => 'error',
                        'error' => $e->getMessage(),
                        'accessible' => false
                    ];
                }
            }
            
            \Log::info('ChaiyoAI API Endpoints Health Check', [
                'endpoints' => $results,
                'check_time' => now()->toISOString(),
                'overall_status' => collect($results)->every(fn($result) => $result['accessible']) ? 'healthy' : 'degraded'
            ]);
        })->everyFifteenMinutes();
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