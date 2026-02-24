<?php // lexie/api/routes/api.php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AudioController; // Isso é essencial para ele achar o arquivo!

// O Laravel já adiciona o "/api" antes de tudo que está aqui
Route::post('/audio/upload', [AudioController::class, 'upload']);