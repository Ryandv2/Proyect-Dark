class VideoPlayer {
    constructor() {
        this.videoUrl = 'https://vibuxer.com/e/83kqfqtghrdx';
        this.player = null;
        this.hls = null;
        this.init();
    }

    async init() {
        try {
            // Primero intentar obtener stream directo
            const streamUrl = await this.extractStream();
            
            if (streamUrl) {
                await this.setupVideoJS(streamUrl);
                this.updateStatus('Stream directo', 'online');
            } else {
                throw new Error('No se encontró stream directo');
            }
        } catch (error) {
            console.log('Usando reproductor alternativo...');
            this.useIframe();
        }
    }

    async extractStream() {
        try {
            const response = await fetch('api/proxy.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: this.videoUrl })
            });
            
            const data = await response.json();
            return data.success ? data.streamUrl : null;
        } catch (error) {
            return null;
        }
    }

    async setupVideoJS(streamUrl) {
        document.getElementById('loading-overlay').classList.add('hidden');
        
        const videoElement = document.getElementById('main-player');
        
        if (streamUrl.includes('.m3u8') || streamUrl.includes('m3u8')) {
            if (Hls.isSupported()) {
                this.hls = new Hls({
                    enableWorker: false,
                    lowLatencyMode: true,
                });
                
                this.hls.loadSource(streamUrl);
                this.hls.attachMedia(videoElement);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.player) {
                        this.player.play();
                    }
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('Error HLS:', data);
                    if (data.fatal) {
                        this.showError('Error al cargar el stream HLS');
                    }
                });
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = streamUrl;
            }
        } else {
            videoElement.src = streamUrl;
        }
        
        // Inicializar Video.js
        this.player = videojs('main-player', {
            controls: true,
            autoplay: true,
            preload: 'auto',
            fluid: true,
            playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
            userActions: {
                hotkeys: true
            }
        });
        
        this.player.on('playing', () => {
            document.getElementById('loading-overlay').classList.add('hidden');
            this.updateStatus('Reproduciendo', 'online');
        });
        
        this.player.on('error', () => {
            this.showError('Error de reproducción');
        });
    }

    useIframe() {
        document.getElementById('main-player').classList.add('hidden');
        document.getElementById('loading-overlay').classList.add('hidden');
        
        const iframe = document.getElementById('fallback-iframe');
        iframe.src = this.videoUrl;
        iframe.classList.remove('hidden');
        
        this.updateStatus('Modo alternativo', 'iframe');
        
        if (this.player) {
            this.player.dispose();
        }
        if (this.hls) {
            this.hls.destroy();
        }
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-container').classList.remove('hidden');
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    updateStatus(text, type) {
        document.getElementById('status-text').textContent = text;
        const streamType = document.getElementById('stream-type');
        
        if (type === 'online') {
            streamType.textContent = 'Directo';
            streamType.style.color = '#4caf50';
        } else if (type === 'iframe') {
            streamType.textContent = 'Alternativo';
            streamType.style.color = '#ffa500';
        }
    }
}

// Botón de fallback
document.addEventListener('DOMContentLoaded', () => {
    window.player = new VideoPlayer();
    
    document.getElementById('btn-fallback').addEventListener('click', () => {
        document.getElementById('error-container').classList.add('hidden');
        window.player.useIframe();
    });
});
