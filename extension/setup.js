// lexie/extension/setup.js

document.getElementById('btn-allow').addEventListener('click', async () => {
    try {
        // Agora sim o navegador vai abrir aquele prompt clássico de "Permitir / Bloquear"
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Pega a permissão e desliga o mic logo em seguida
        stream.getTracks().forEach(track => track.stop());
        
        // Troca o visual para mostrar que deu tudo certo
        document.querySelector('.card').innerHTML = `
            <h2 style="color: #4CAF50;">Tudo Certo! 🎉</h2>
            <p>O microfone foi liberado. Pode fechar esta aba e usar a Lexie normalmente.</p>
        `;
    } catch (error) {
        alert("Poxa, você negou a permissão. A extensão precisa dela para ouvir sua voz na consulta.");
    }
});