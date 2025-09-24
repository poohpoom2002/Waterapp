<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    /**
     * Get pricing plans information with token costs.
     */
    public function getPricingPlans(): JsonResponse
    {
        $plans = [
            'pro' => [
                'name' => 'Pro Plan',
                'token_cost' => 500, // Cost in tokens per month
                'monthly_tokens' => 500,
                'daily_tokens' => 100,
                'features' => [
                    'Advanced irrigation planning',
                    'Priority support',
                    'Export capabilities',
                    'Advanced analytics'
                ]
            ],
            'advanced' => [
                'name' => 'Advanced Plan',
                'token_cost' => 1000, // Cost in tokens per month
                'monthly_tokens' => 1000,
                'daily_tokens' => 200,
                'features' => [
                    'Premium irrigation planning',
                    '24/7 priority support',
                    'Unlimited exports',
                    'Advanced analytics',
                    'Custom integrations',
                    'API access'
                ]
            ]
        ];

        return response()->json([
            'success' => true,
            'plans' => $plans
        ]);
    }

    /**
     * Purchase a plan with tokens.
     */
    public function purchasePlanWithTokens(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'plan_type' => 'required|in:pro,advanced',
            'months' => 'required|integer|min:1|max:12',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $planType = $request->input('plan_type');
        $months = $request->input('months');
        
        // Calculate token cost
        $tokenCosts = [
            'pro' => 500,
            'advanced' => 1000
        ];
        
        $totalTokenCost = $tokenCosts[$planType] * $months;

        // Check if user has enough tokens
        if (!$user->hasEnoughTokens($totalTokenCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient tokens',
                'required_tokens' => $totalTokenCost,
                'current_tokens' => $user->tokens
            ], 400);
        }

        // Consume tokens
        if (!$user->consumeTokens($totalTokenCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to consume tokens'
            ], 500);
        }

        // Upgrade user tier
        if (!$user->upgradeTier($planType, $months)) {
            // If tier upgrade fails, refund tokens
            $user->addTokens($totalTokenCost);
            return response()->json([
                'success' => false,
                'message' => 'Failed to upgrade tier'
            ], 500);
        }

        // Create a record of this purchase (optional - for tracking)
        Payment::create([
            'user_id' => $user->id,
            'plan_type' => $planType,
            'months' => $months,
            'amount' => 0, // No monetary cost
            'currency' => 'TOKENS',
            'tokens_purchased' => 0, // No tokens purchased, tokens were consumed
            'status' => 'approved', // Auto-approved since it's token-based
            'payment_proof' => 'Token Purchase',
            'notes' => "Purchased {$planType} plan for {$months} month(s) using {$totalTokenCost} tokens",
            'approved_by' => $user->id, // Self-approved
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Successfully upgraded to {$planType} plan for {$months} month(s)",
            'tokens_consumed' => $totalTokenCost,
            'remaining_tokens' => $user->tokens,
            'new_tier' => $user->tier,
            'tier_expires_at' => $user->tier_expires_at
        ]);
    }

    /**
     * Create a payment request for buying tokens directly.
     */
    public function createTokenPurchaseRequest(Request $request): JsonResponse
    {
        // Ensure session is started
        if (!session()->isStarted()) {
            session()->start();
        }
        
        $user = Auth::user();
        
        \Log::info('Token purchase request received', [
            'user_id' => $user ? $user->id : 'null',
            'user_name' => $user ? $user->name : 'null',
            'request_data' => $request->all(),
            'session_id' => session()->getId(),
            'auth_check' => Auth::check(),
            'session_data' => session()->all()
        ]);
        
        if (!$user) {
            \Log::warning('Token purchase request failed: User not authenticated', [
                'session_id' => session()->getId(),
                'auth_check' => Auth::check(),
                'session_data' => session()->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated. Please refresh the page and try again.'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'tokens' => 'required|integer|min:1|max:10000',
            'amount' => 'required|numeric|min:1',
            'payment_proof' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // Max 5MB
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $tokens = $request->input('tokens');
        $amount = $request->input('amount');

        // Check if user already has a pending token purchase request
        $existingTokenPurchase = Payment::where('user_id', $user->id)
            ->where('plan_type', 'token_purchase')
            ->where('status', 'pending')
            ->first();

        if ($existingTokenPurchase) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a pending token purchase request. Please wait for admin approval or contact support.'
            ], 400);
        }

        try {
            // Handle file upload
            $paymentProofPath = null;
            if ($request->hasFile('payment_proof')) {
                $file = $request->file('payment_proof');
                $filename = 'payment_proof_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $paymentProofPath = $file->storeAs('payment_proofs', $filename, 'public');
            }

            $payment = Payment::create([
                'user_id' => $user->id,
                'plan_type' => 'token_purchase',
                'months' => 1,
                'amount' => $amount,
                'currency' => 'THB',
                'tokens_purchased' => $tokens,
                'status' => 'pending',
                'payment_proof' => $paymentProofPath,
                'notes' => $request->input('notes'),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Token purchase request submitted successfully. You will receive tokens once approved by admin.',
                'payment' => $payment
            ]);
        } catch (\Exception $e) {
            \Log::error('Token purchase request failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create token purchase request. Please try again.'
            ], 500);
        }
    }

    /**
     * Create a payment request.
     */
    public function createPaymentRequest(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'plan_type' => 'required|in:pro,advanced',
            'months' => 'required|integer|min:1|max:12',
            'payment_proof' => 'nullable|string',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $planType = $request->input('plan_type');
        $months = $request->input('months');
        
        // Calculate pricing
        $planPrices = [
            'pro' => 299,
            'advanced' => 599
        ];
        
        $amount = $planPrices[$planType] * $months;
        $tokensPurchased = ($planType === 'pro' ? 500 : 1000) * $months;

        // Check if user already has a pending payment for the same plan
        $existingPayment = Payment::where('user_id', $user->id)
            ->where('plan_type', $planType)
            ->where('status', 'pending')
            ->first();

        if ($existingPayment) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a pending payment request for this plan'
            ], 400);
        }

        $payment = Payment::create([
            'user_id' => $user->id,
            'plan_type' => $planType,
            'months' => $months,
            'amount' => $amount,
            'currency' => 'THB',
            'tokens_purchased' => $tokensPurchased,
            'status' => 'pending',
            'payment_proof' => $request->input('payment_proof'),
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment request created successfully',
            'payment' => $payment->load('user')
        ]);
    }

    /**
     * Get user's payment history.
     */
    public function getUserPayments(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $payments = Payment::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'payments' => $payments
        ]);
    }

    /**
     * Get all pending payments (super user only).
     */
    public function getPendingPayments(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$user->is_super_user) {
            return response()->json([
                'success' => false,
                'message' => 'Super user privileges required'
            ], 403);
        }

        $payments = Payment::with(['user', 'approver'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'payments' => $payments
        ]);
    }

    /**
     * Get all payments (super user only).
     */
    public function getAllPayments(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$user->is_super_user) {
            return response()->json([
                'success' => false,
                'message' => 'Super user privileges required'
            ], 403);
        }

        $payments = Payment::with(['user', 'approver'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'payments' => $payments
        ]);
    }

    /**
     * Approve a payment (super user only).
     */
    public function approvePayment(Request $request, $paymentId): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$user->is_super_user) {
            return response()->json([
                'success' => false,
                'message' => 'Super user privileges required'
            ], 403);
        }

        $payment = Payment::with('user')->findOrFail($paymentId);

        if ($payment->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Payment is not pending'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Update payment status
        $payment->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'admin_notes' => $request->input('admin_notes'),
        ]);

        // Add tokens to user account
        $payment->user->addTokens($payment->tokens_purchased);

        // Upgrade user tier if needed
        if ($payment->plan_type !== 'free') {
            $payment->user->upgradeTier($payment->plan_type, $payment->months);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment approved successfully',
            'payment' => $payment->load(['user', 'approver'])
        ]);
    }

    /**
     * Update a payment (super user only).
     */
    public function updatePayment(Request $request, $paymentId): JsonResponse
    {
        $user = Auth::user();
        
        \Log::info('Payment update request received', [
            'payment_id' => $paymentId,
            'user_id' => $user ? $user->id : 'null',
            'user_name' => $user ? $user->name : 'null',
            'is_super_user' => $user ? $user->is_super_user : false,
            'request_data' => $request->all()
        ]);
        
        if (!$user || !$user->is_super_user) {
            \Log::warning('Payment update failed: Super user privileges required');
            return response()->json([
                'success' => false,
                'message' => 'Super user privileges required'
            ], 403);
        }

        try {
            $payment = Payment::findOrFail($paymentId);
            
            \Log::info('Payment found for update', [
                'payment_id' => $payment->id,
                'current_status' => $payment->status,
                'payment_user_id' => $payment->user_id
            ]);

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:pending,approved,rejected',
                'admin_notes' => 'nullable|string|max:1000',
                'force_remove_tokens' => 'boolean',
            ]);

            if ($validator->fails()) {
                \Log::warning('Payment update failed: Validation failed', [
                    'payment_id' => $payment->id,
                    'validation_errors' => $validator->errors()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $newStatus = $request->input('status');
            $adminNotes = $request->input('admin_notes');
            $forceRemoveTokens = $request->input('force_remove_tokens', false);

            // If changing to rejected, admin notes are required
            if ($newStatus === 'rejected' && empty($adminNotes)) {
                \Log::warning('Payment update failed: Admin notes required for rejection', [
                    'payment_id' => $payment->id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Admin notes are required when rejecting a payment'
                ], 422);
            }

            // Prepare update data
            $updateData = [
                'status' => $newStatus,
                'admin_notes' => $adminNotes,
            ];

            // If changing from pending to approved/rejected, set approval details
            if ($payment->status === 'pending' && in_array($newStatus, ['approved', 'rejected'])) {
                $updateData['approved_by'] = $user->id;
                $updateData['approved_at'] = now();
            }

            // If changing to approved, add tokens to user
            if ($newStatus === 'approved' && $payment->status !== 'approved') {
                $paymentUser = $payment->user;
                $paymentUser->addTokens($payment->tokens_purchased);
                \Log::info('Tokens added to user', [
                    'user_id' => $paymentUser->id,
                    'tokens_added' => $payment->tokens_purchased,
                    'new_balance' => $paymentUser->tokens
                ]);
            }

            // If changing from approved to something else, remove tokens from user
            if ($payment->status === 'approved' && $newStatus !== 'approved') {
                $paymentUser = $payment->user;
                $tokensToRemove = $payment->tokens_purchased;
                
                // Check if user has enough tokens to remove
                if (!$paymentUser->hasEnoughTokens($tokensToRemove)) {
                    if ($forceRemoveTokens) {
                        // Force remove tokens (can go negative)
                        $paymentUser->forceRemoveTokens($tokensToRemove);
                        \Log::warning('Tokens force removed: User had insufficient balance', [
                            'user_id' => $paymentUser->id,
                            'current_tokens_before' => $paymentUser->tokens + $tokensToRemove,
                            'tokens_removed' => $tokensToRemove,
                            'new_balance' => $paymentUser->tokens,
                            'payment_id' => $payment->id,
                            'forced_by' => $user->id
                        ]);
                    } else {
                        \Log::warning('Cannot remove tokens: User has insufficient balance', [
                            'user_id' => $paymentUser->id,
                            'current_tokens' => $paymentUser->tokens,
                            'tokens_to_remove' => $tokensToRemove,
                            'payment_id' => $payment->id
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => "Cannot change payment status: User has insufficient tokens. Current balance: {$paymentUser->tokens}, Required to remove: {$tokensToRemove}. The user may have already spent these tokens. Use 'force_remove_tokens: true' to force remove tokens (this can result in negative balance)."
                        ], 400);
                    }
                } else {
                    // Normal token removal
                    $success = $paymentUser->consumeTokens($tokensToRemove);
                    if (!$success) {
                        \Log::error('Failed to remove tokens from user', [
                            'user_id' => $paymentUser->id,
                            'tokens_to_remove' => $tokensToRemove,
                            'payment_id' => $payment->id
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'Failed to remove tokens from user account. Please try again.'
                        ], 500);
                    }
                }
                
                \Log::info('Tokens removed from user', [
                    'user_id' => $paymentUser->id,
                    'tokens_removed' => $tokensToRemove,
                    'new_balance' => $paymentUser->tokens
                ]);
            }

            // Update payment status
            $payment->update($updateData);

            \Log::info('Payment updated successfully', [
                'payment_id' => $payment->id,
                'old_status' => $payment->status,
                'new_status' => $newStatus,
                'updated_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment updated successfully',
                'payment' => $payment->load(['user', 'approver'])
            ]);
        } catch (\Exception $e) {
            \Log::error('Payment update failed with exception', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a payment (super user only).
     */
    public function rejectPayment(Request $request, $paymentId): JsonResponse
    {
        $user = Auth::user();
        
        \Log::info('Payment rejection request received', [
            'payment_id' => $paymentId,
            'user_id' => $user ? $user->id : 'null',
            'user_name' => $user ? $user->name : 'null',
            'is_super_user' => $user ? $user->is_super_user : false,
            'request_data' => $request->all()
        ]);
        
        if (!$user || !$user->is_super_user) {
            \Log::warning('Payment rejection failed: Super user privileges required');
            return response()->json([
                'success' => false,
                'message' => 'Super user privileges required'
            ], 403);
        }

        try {
            $payment = Payment::findOrFail($paymentId);
            
            \Log::info('Payment found for rejection', [
                'payment_id' => $payment->id,
                'payment_status' => $payment->status,
                'payment_user_id' => $payment->user_id
            ]);

            if ($payment->status !== 'pending') {
                \Log::warning('Payment rejection failed: Payment is not pending', [
                    'payment_id' => $payment->id,
                    'current_status' => $payment->status
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment is not pending'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'admin_notes' => 'required|string|min:1|max:1000',
            ]);

            if ($validator->fails()) {
                \Log::warning('Payment rejection failed: Validation failed', [
                    'payment_id' => $payment->id,
                    'validation_errors' => $validator->errors(),
                    'admin_notes' => $request->input('admin_notes')
                ]);
                
                $errorMessage = 'Validation failed: ';
                if ($validator->errors()->has('admin_notes')) {
                    $errorMessage .= 'Admin notes are required and must be at least 1 character long.';
                } else {
                    $errorMessage .= 'Please check your input.';
                }
                
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Update payment status
            $payment->update([
                'status' => 'rejected',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'admin_notes' => $request->input('admin_notes'),
            ]);

            \Log::info('Payment rejected successfully', [
                'payment_id' => $payment->id,
                'rejected_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment rejected',
                'payment' => $payment->load(['user', 'approver'])
            ]);
        } catch (\Exception $e) {
            \Log::error('Payment rejection failed with exception', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment statistics (super user only).
     */
    public function getPaymentStats(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$user->is_super_user) {
            return response()->json([
                'success' => false,
                'message' => 'Super user privileges required'
            ], 403);
        }

        $stats = [
            'total_payments' => Payment::count(),
            'pending_payments' => Payment::where('status', 'pending')->count(),
            'approved_payments' => Payment::where('status', 'approved')->count(),
            'rejected_payments' => Payment::where('status', 'rejected')->count(),
            'total_revenue' => Payment::where('status', 'approved')->sum('amount'),
            'total_tokens_sold' => Payment::where('status', 'approved')->sum('tokens_purchased'),
            'recent_payments' => Payment::with(['user', 'approver'])
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}