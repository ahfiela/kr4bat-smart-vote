<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VoterController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware('ability:role:admin')->prefix('admin')->group(function () {
            Route::get('/sessions', [AdminController::class, 'index']);
            Route::post('/sessions', [AdminController::class, 'storeSession']);
            Route::get('/sessions/{session}', [AdminController::class, 'show']);
            Route::put('/sessions/{session}', [AdminController::class, 'updateSession']);
            Route::delete('/sessions/{session}', [AdminController::class, 'destroySession']);
            Route::patch('/sessions/{session}/status', [AdminController::class, 'updateStatus']);
            Route::post('/sessions/{session}/publish', [AdminController::class, 'publishResults']);

            // Categories
            Route::get('/categories', [AdminController::class, 'getCategories']);
            Route::post('/categories', [AdminController::class, 'storeCategory']);
            Route::put('/categories/{category}', [AdminController::class, 'updateCategory']);
            Route::delete('/categories/{category}', [AdminController::class, 'destroyCategory']);

            // Candidates
            Route::get('/sessions/{session}/candidates', [AdminController::class, 'getCandidates']);
            Route::post('/sessions/{session}/candidates', [AdminController::class, 'storeCandidate']);
            Route::post('/candidates/{candidate}', [AdminController::class, 'updateCandidate']); // use POST for form-data (file upload support)
            Route::delete('/candidates/{candidate}', [AdminController::class, 'destroyCandidate']);

            // Voters
            Route::get('/voters', [AdminController::class, 'getVoters']);
            Route::post('/voters', [AdminController::class, 'storeVoter']);
            Route::put('/voters/{voter}', [AdminController::class, 'updateVoter']);
            Route::delete('/voters/{voter}', [AdminController::class, 'destroyVoter']);
            Route::post('/voters/import', [AdminController::class, 'importVoters']);
            Route::get('/voters/classes', [AdminController::class, 'getVoterClasses']);

            Route::put('/profile', [AdminController::class, 'updateProfile']);
        });

        Route::middleware('ability:role:voter')->prefix('voter')->group(function () {
            Route::get('/sessions', [VoterController::class, 'getAvailableSessions']);
            Route::post('/room/verify', [VoterController::class, 'verifyRoomCode']);
            Route::post('/vote', [VoterController::class, 'submitVote']);
            Route::get('/results', [VoterController::class, 'getResults']);
            Route::get('/history', [VoterController::class, 'getHistory']);
        });
    });
});