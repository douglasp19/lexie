// lexie/extension/offscreen.js

let mediaRecorder;
let audioChunks = [];
let audioContext;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.action === 'startRecording') {
        startRecording(message.streamId);
    } else if (message.action === 'stopRecording') {
        stopRecording();
    }
});

async function startRecording(streamId) {
    try {
        // 1. Captura o áudio do paciente (Aba)
        const tabStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            }
        });

        // 2. Captura o áudio da nutricionista (Microfone local)
        let micStream;
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.warn("Lexie: Microfone não encontrado ou sem permissão. Gravando apenas a aba.");
        }

        // 3. O Mixer de Áudio (Junta paciente + nutri)
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        // Conecta a aba no mixer
        const tabSource = audioContext.createMediaStreamSource(tabStream);
        tabSource.connect(destination);
        
        // TRUQUE MÁGICO: O Chrome muta a aba quando gravamos. 
        // Essa linha joga o áudio de volta para o alto-falante para a nutri ouvir o paciente!
        tabSource.connect(audioContext.destination);

        // Conecta o microfone no mixer (se o usuário deu permissão)
        if (micStream) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
        }

        // 4. Grava a mistura final
        mediaRecorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        // 5. Finalização e envio
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                chrome.runtime.sendMessage({
                    action: "audioFinished",
                    audio: reader.result
                });
            };

            // Desliga as "câmeras e microfones" para não ficar a bolinha vermelha no navegador
            tabStream.getTracks().forEach(track => track.stop());
            if (micStream) micStream.getTracks().forEach(track => track.stop());
            if (audioContext) audioContext.close();
        };

        mediaRecorder.start();

    } catch (error) {
        console.error("Lexie: Erro geral na gravação:", error);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}