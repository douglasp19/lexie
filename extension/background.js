// lexie/extension/background.js

let isRecording = false;
let startTime = null;

// Função para iniciar o documento invisível
async function setupOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) return;

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Gravar áudio da aba ativa para o resumo da consulta na Lexie'
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Retorna o estado atual para o visual (Popup)
    if (request.action === "getState") {
        sendResponse({ isRecording, startTime });
        return true;
    }

    // O usuário clicou em "Iniciar Gravação"
    if (request.action === "startCapture") {
        (async () => {
            // Pede ao Chrome o "passe de acesso" para gravar a aba atual
            const streamId = await new Promise((resolve) => {
                chrome.tabCapture.getMediaStreamId({ consumerTabId: sender.tab?.id }, (id) => resolve(id));
            });

            if (!streamId) {
                sendResponse({ success: false, error: "Não foi possível obter o ID da aba." });
                return;
            }

            // Inicia o motor invisível
            await setupOffscreenDocument();

            // Manda a ordem de gravar passando o ID da aba
            chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'startRecording',
                streamId: streamId
            });

            isRecording = true;
            startTime = Date.now();
            sendResponse({ success: true });
        })();
        return true;
    }

    // O usuário clicou em "Parar e Enviar"
    if (request.action === "stopCapture") {
        (async () => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'stopRecording'
            });

            isRecording = false;
            startTime = null;
            sendResponse({ success: true });
        })();
        return true;
    }

    // O Offscreen terminou de processar o áudio e nos devolveu
    if (request.action === "audioFinished") {
        console.log("Lexie: Preparando envio para o Laravel...");

        // 1. Converte o Base64 de volta para um arquivo binário (Blob)
        fetch(request.audio)
            .then(res => res.blob())
            .then(blob => {
                // 2. Monta o pacote de dados como se fosse um formulário HTML
                const formData = new FormData();
                formData.append('audio', blob, 'audio.webm');
                formData.append('session_id', 'sessao_teste_123'); // Depois pegaremos isso dinamicamente

                // 3. Dispara para a nossa nova rota no Laravel
                return fetch('http://localhost:8000/api/audio/upload', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log("Lexie: Sucesso!", data);
            })
            .catch(error => {
                console.error("Lexie: Erro ao enviar áudio:", error);
            });
    }
});