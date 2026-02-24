<?php
// lexie/api/app/Http/Controllers/AudioController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AudioController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'audio' => 'required|file',
            'session_id' => 'required|string'
        ]);

        $file = $request->file('audio');
        $sessionId = $request->input('session_id');

        $filename = $sessionId . '_' . time() . '.webm';

        // MUDANÇA AQUI: Trocamos o disco 'public' pelo 'local'
        // Agora o arquivo vai para storage/app/audios/ (totalmente inacessível pela web)
        $path = $file->storeAs('audios', $filename, 'local');

        return response()->json([
            'success' => true,
            'message' => 'Áudio protegido e salvo com sucesso!',
            'path' => $path
        ]);
    }
}