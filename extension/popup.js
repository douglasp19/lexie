// lexie/extension/popup.js

document.addEventListener('DOMContentLoaded', async () => {
    const viewIdle = document.getElementById('view-idle');
    const viewRecording = document.getElementById('view-recording');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const timerDisplay = document.getElementById('timer');
    const sessionIdInput = document.getElementById('session-id');

    let timerInterval;

    // Função para formatar o tempo (MM:SS)
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Alternar entre as telas
    const updateUI = (isRecording, seconds = 0) => {
        if (isRecording) {
            viewIdle.style.display = 'none';
            viewRecording.style.display = 'block';
            timerDisplay.textContent = formatTime(seconds);
        } else {
            viewIdle.style.display = 'block';
            viewRecording.style.display = 'none';
            // Gera um ID mockado por enquanto
            sessionIdInput.value = Math.random().toString(36).substring(2, 10);
        }
    };

    // 1. Verificar estado atual com o background ao abrir o popup
    chrome.runtime.sendMessage({ action: "getState" }, (response) => {
        if (response && response.isRecording) {
            const elapsed = Math.floor((Date.now() - response.startTime) / 1000);
            updateUI(true, elapsed);
            
            // Retoma o timer no frontend
            timerInterval = setInterval(() => {
                const currentElapsed = Math.floor((Date.now() - response.startTime) / 1000);
                timerDisplay.textContent = formatTime(currentElapsed);
            }, 1000);
        } else {
            updateUI(false);
        }
    });

    // 2. Iniciar Gravação
    btnStart.addEventListener('click', async () => {
        try {
            // NOVIDADE: Pede a permissão "na cara" do usuário (visível)
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Permissão concedida? Desliga a escuta aqui no popup imediatamente, 
            // pois quem vai gravar de verdade é o nosso offscreen!
            micStream.getTracks().forEach(track => track.stop());

            // Agora sim, chama o background para fazer o trabalho pesado
            chrome.runtime.sendMessage({ action: "startCapture" }, (response) => {
                if (response.success) {
                    const startTime = Date.now();
                    updateUI(true, 0);
                    
                    timerInterval = setInterval(() => {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        timerDisplay.textContent = formatTime(elapsed);
                    }, 1000);
                } else {
                    alert("Erro ao tentar gravar a aba.");
                }
            });

        } catch (error) {
            // Se der erro de permissão, abre a página de configuração em uma nova aba
            chrome.tabs.create({ url: chrome.runtime.getURL("setup.html") });
        }
    });

    // 3. Parar Gravação
    btnStop.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "stopCapture" }, (response) => {
            clearInterval(timerInterval);
            updateUI(false);
            if (response.success) {
                alert("Áudio salvo com sucesso! (Em breve enviaremos para a API)");
            }
        });
    });
});