// Get elements
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const video = document.getElementById('backgroundVideo');
const audio = document.getElementById('backgroundMusic');

// Create custom cursor elements
const cursorDot = document.createElement('div');
cursorDot.className = 'cursor-dot';
document.body.appendChild(cursorDot);

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse tracking variables
let mouseX = 0;
let mouseY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSpeed = 0;
let videoPlaying = false;

// Circle size parameters
const baseRadius = 58.59375; // 117.1875px diameter (25% larger than 93.75px)
const maxRadius = 234.375; // 25% larger than 187.5
const speedMultiplier = 2;

// Trail circles array
const circles = [];

// Current shape selection
let currentShape = 'star';

// Volume control variables
let isMuted = false;
let previousVolume = 0.5;

// Video mask toggle
let showFullVideo = true;


// Handle video autoplay with proper Promise handling
const playVideo = () => {
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log('Video autoplay started successfully');
                videoPlaying = true;
            })
            .catch(error => {
                console.error('Video autoplay was prevented:', error);
                // Set up fallback for first user interaction
                const startVideoOnInteraction = () => {
                    video.play()
                        .then(() => {
                            console.log('Video started after user interaction');
                            videoPlaying = true;
                        })
                        .catch(e => console.error('Video play still failed:', e));
                };
                
                // Try on various user interactions
                document.addEventListener('click', startVideoOnInteraction, { once: true });
                document.addEventListener('touchstart', startVideoOnInteraction, { once: true });
                document.addEventListener('mousemove', startVideoOnInteraction, { once: true });
            });
    }
};

// Wait for video to be ready before attempting play
video.addEventListener('loadedmetadata', () => {
    console.log('Video metadata loaded, attempting to play...');
    playVideo();
});

// Also try playing if video is already ready
if (video.readyState >= 3) {
    playVideo();
}

// Ensure video keeps playing
video.addEventListener('pause', () => {
    if (!video.ended) {
        video.play();
    }
});

// Add comprehensive video error handling
video.addEventListener('error', (e) => {
    console.error('Video loading error:', e);
    console.error('Video error code:', video.error?.code);
    console.error('Video error message:', video.error?.message);
    
    // Provide user-friendly error messages
    switch(video.error?.code) {
        case 1:
            console.error('Video loading aborted');
            break;
        case 2:
            console.error('Network error while loading video');
            break;
        case 3:
            console.error('Video decoding error');
            break;
        case 4:
            console.error('Video format not supported');
            break;
    }
});

// Add loading state handling
video.addEventListener('waiting', () => {
    console.log('Video is buffering...');
});

video.addEventListener('stalled', () => {
    console.log('Video loading stalled');
});

video.addEventListener('suspend', () => {
    console.log('Video loading suspended');
});

// Mouse move handler with throttling for better performance
let lastTrailTime = 0;
const trailInterval = 16; // Roughly 60fps for trail additions

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Update cursor position
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
    
    // Calculate mouse speed
    const deltaX = mouseX - lastMouseX;
    const deltaY = mouseY - lastMouseY;
    mouseSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Calculate dynamic radius
    const dynamicRadius = Math.min(baseRadius + (mouseSpeed * speedMultiplier), maxRadius);
    
    // Throttle trail circle additions for better performance
    const now = performance.now();
    if (mouseSpeed > 1 && now - lastTrailTime > trailInterval) {
        circles.push({
            x: mouseX,
            y: mouseY,
            radius: dynamicRadius,
            opacity: 0.8,
            shape: currentShape
        });
        
        // Limit trail length (25% longer: 63 -> 78.75, rounded to 79)
        if (circles.length > 79) {
            circles.shift();
        }
        
        lastTrailTime = now;
    }
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;
});

// Hide cursor when leaving window
document.addEventListener('mouseleave', () => {
    cursorDot.style.display = 'none';
});

document.addEventListener('mouseenter', () => {
    cursorDot.style.display = 'block';
});

// Pre-create off-screen canvas to avoid recreating it every frame
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');

// Main render loop
function render() {
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Check if video is ready
    if (video.readyState >= 3) {
        // If showing full video, just draw it directly
        if (showFullVideo) {
            const videoAspect = video.videoWidth / video.videoHeight;
            const canvasAspect = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (videoAspect > canvasAspect) {
                drawHeight = canvas.height;
                drawWidth = drawHeight * videoAspect;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = drawWidth / videoAspect;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            }
            
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
            requestAnimationFrame(render);
            return;
        }
        // Resize off-screen canvas only if needed
        if (offCanvas.width !== canvas.width || offCanvas.height !== canvas.height) {
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
        }
        
        // Draw video with proper cropping (no stretching)
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (videoAspect > canvasAspect) {
            // Video is wider than canvas - fit to height, crop sides
            drawHeight = canvas.height;
            drawWidth = drawHeight * videoAspect;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
        } else {
            // Video is taller than canvas - fit to width, crop top/bottom
            drawWidth = canvas.width;
            drawHeight = drawWidth / videoAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
        }
        
        // Clear and draw video to off-screen canvas
        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        offCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        
        // Use composite operation for better performance
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw each trail shape individually
        circles.forEach(circle => {
            ctx.save();
            ctx.beginPath();
            drawShape(ctx, circle.x, circle.y, circle.radius * circle.opacity, circle.shape);
            ctx.clip();
            ctx.drawImage(offCanvas, 0, 0);
            ctx.restore();
        });
        
        // Draw current mouse position shape
        if (mouseX > 0 || mouseY > 0) {
            ctx.save();
            const currentRadius = Math.min(baseRadius + (mouseSpeed * speedMultiplier), maxRadius);
            ctx.beginPath();
            drawShape(ctx, mouseX, mouseY, currentRadius, currentShape);
            ctx.clip();
            ctx.drawImage(offCanvas, 0, 0);
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    // Update trail opacity (slower fade for longer lasting trails)
    for (let i = circles.length - 1; i >= 0; i--) {
        circles[i].opacity -= 0.006;
        if (circles[i].opacity <= 0) {
            circles.splice(i, 1);
        }
    }
    
    requestAnimationFrame(render);
}

// Start render loop
render();

// Shape drawing functions
function drawShape(ctx, x, y, radius, shape) {
    ctx.beginPath();
    
    switch(shape) {
        case 'circle':
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            break;
            
        case 'square':
            const size = radius * 1.5; // Square side length
            ctx.rect(x - size/2, y - size/2, size, size);
            break;
            
        case 'triangle':
            const triangleSize = radius * 1.8;
            ctx.moveTo(x, y - triangleSize * 0.7);
            ctx.lineTo(x - triangleSize * 0.6, y + triangleSize * 0.35);
            ctx.lineTo(x + triangleSize * 0.6, y + triangleSize * 0.35);
            ctx.closePath();
            break;
            
        case 'star':
            const outerRadius = radius * 1.5;
            const innerRadius = radius * 0.6;
            const spikes = 5;
            let rot = Math.PI / 2 * 3;
            const step = Math.PI / spikes;
            
            ctx.moveTo(x, y - outerRadius);
            for (let i = 0; i < spikes; i++) {
                ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
                rot += step;
                ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
                rot += step;
            }
            ctx.closePath();
            break;
            
        case 'heart':
            const heartSize = radius * 1.4;
            const centerY = y - heartSize * 0.2;
            
            // Start at the bottom center
            ctx.moveTo(x, centerY + heartSize * 0.95);
            
            // Left side - bottom to top
            ctx.bezierCurveTo(
                x - heartSize * 0.5, centerY + heartSize * 0.6,
                x - heartSize * 0.9, centerY + heartSize * 0.3,
                x - heartSize * 0.9, centerY
            );
            
            // Left top curve
            ctx.bezierCurveTo(
                x - heartSize * 0.9, centerY - heartSize * 0.5,
                x - heartSize * 0.5, centerY - heartSize * 0.6,
                x, centerY - heartSize * 0.3
            );
            
            // Right top curve
            ctx.bezierCurveTo(
                x + heartSize * 0.5, centerY - heartSize * 0.6,
                x + heartSize * 0.9, centerY - heartSize * 0.5,
                x + heartSize * 0.9, centerY
            );
            
            // Right side - top to bottom
            ctx.bezierCurveTo(
                x + heartSize * 0.9, centerY + heartSize * 0.3,
                x + heartSize * 0.5, centerY + heartSize * 0.6,
                x, centerY + heartSize * 0.95
            );
            
            ctx.closePath();
            break;
    }
}

// Update cursor visual based on shape
function updateCursorVisual() {
    // No cursor ring needed - video reveal shows the actual shape
}

// Shape selector event listeners
document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active state
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update current shape
        currentShape = btn.dataset.shape;
        updateCursorVisual();
        
        console.log('Shape changed to:', currentShape);
    });
});

// Volume control functionality
const playPauseBtn = document.getElementById('playPauseBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');

// Set initial volume
audio.volume = 0.5;
let isPlaying = false;

// Play/Pause button event
playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
        playPauseBtn.textContent = '▶️';
        isPlaying = false;
    } else {
        audio.play().catch(err => console.log('Audio play failed:', err));
        playPauseBtn.textContent = '⏸️';
        isPlaying = true;
    }
});

// Volume slider event
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    audio.volume = volume;
    
    if (volume === 0) {
        muteBtn.textContent = '🔇';
        muteBtn.classList.add('muted');
        isMuted = true;
    } else {
        muteBtn.textContent = '🔊';
        muteBtn.classList.remove('muted');
        isMuted = false;
        previousVolume = volume;
    }
});

// Mute button event
muteBtn.addEventListener('click', () => {
    if (isMuted) {
        // Unmute
        audio.volume = previousVolume;
        volumeSlider.value = previousVolume * 100;
        muteBtn.textContent = '🔊';
        muteBtn.classList.remove('muted');
        isMuted = false;
    } else {
        // Mute
        previousVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
        muteBtn.textContent = '🔇';
        muteBtn.classList.add('muted');
        isMuted = true;
    }
});

// Minimize functionality for unified control panel
const panelMinimizeBtn = document.getElementById('panelMinimizeBtn');
const floatingSettingsBtn = document.getElementById('floatingSettingsBtn');
const panelContent = document.getElementById('panelContent');
const controlPanel = document.getElementById('controlPanel');
const mainHeader = document.querySelector('.main-header');

// Function to toggle control panel
function toggleControlPanel() {
    const isMinimized = controlPanel.classList.contains('minimized');
    
    if (isMinimized) {
        // Show panel and header, hide floating button
        controlPanel.classList.remove('minimized');
        floatingSettingsBtn.style.display = 'none';
        mainHeader.style.display = 'flex';
    } else {
        // Hide panel and header, show floating button
        controlPanel.classList.add('minimized');
        floatingSettingsBtn.style.display = 'flex';
        mainHeader.style.display = 'none';
    }
}

// Control panel minimize (cog in panel)
panelMinimizeBtn.addEventListener('click', toggleControlPanel);

// Floating settings button (shows when panel is hidden)
floatingSettingsBtn.addEventListener('click', toggleControlPanel);

// Video toggle functionality
const videoToggleBtn = document.getElementById('videoToggleBtn');
const defaultLogo = document.getElementById('defaultLogo');
const altLogo = document.getElementById('altLogo');


videoToggleBtn.addEventListener('click', () => {
    showFullVideo = !showFullVideo;
    
    // Update button appearance
    if (showFullVideo) {
        // Full video mode - show eye icon to enable mask
        videoToggleBtn.textContent = '👁';
        videoToggleBtn.classList.add('active');
        videoToggleBtn.title = 'Enable Mouse Mask Effect';
        
        // Show alternate logo when in full video mode
        defaultLogo.style.display = 'none';
        altLogo.style.display = 'block';
    } else {
        // Mask mode - show mask icon to disable mask
        videoToggleBtn.textContent = '🎭';
        videoToggleBtn.classList.remove('active');
        videoToggleBtn.title = 'Disable Mouse Mask Effect';
        
        // Show default logo when in mask mode
        defaultLogo.style.display = 'block';
        altLogo.style.display = 'none';
    }
});

// Header navigation functionality
const clientsBtn = document.getElementById('clientsBtn');
const contactBtn = document.getElementById('contactBtn');

clientsBtn.addEventListener('click', () => {
    window.open('https://birdsong.djintelligence.com/client/', '_blank');
});

contactBtn.addEventListener('click', () => {
    window.open('https://birdsong.djintelligence.com/contact/', '_blank');
});

// Debug info
console.log('Interactive mouse effect initialized');
console.log('Move your mouse to reveal the video');

video.addEventListener('loadeddata', () => {
    console.log('Video loaded and ready');
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('Video duration:', video.duration);
    videoPlaying = true;
});

video.addEventListener('loadstart', () => {
    console.log('Video load started');
});

video.addEventListener('canplay', () => {
    console.log('Video can play');
});

// Check video source and network state
console.log('Video source:', video.currentSrc || 'No source loaded');
console.log('Video ready state:', video.readyState);
console.log('Video network state:', video.networkState);
console.log('Video error:', video.error);

// Add more detailed debugging
video.addEventListener('loadstart', () => {
    console.log('Video load started - URL:', video.currentSrc);
});

video.addEventListener('loadeddata', () => {
    console.log('Video data loaded successfully');
    console.log('Video can play through:', video.readyState >= 4);
});

// Touch support for mobile devices
let touchActive = false;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
    // Hide cursor dot on mobile
    cursorDot.style.display = 'none';
    
    // Show full video without mask on mobile
    showFullVideo = true;
    
    // Show logo-alt on mobile
    const defaultLogo = document.getElementById('defaultLogo');
    const altLogo = document.getElementById('altLogo');
    if (defaultLogo && altLogo) {
        defaultLogo.style.display = 'none';
        altLogo.style.display = 'block';
    }
    
    // No touch interaction needed on mobile since video is shown in full
} else {
    // Initialize video toggle button state for desktop
    // Since showFullVideo defaults to true now, set initial button state
    videoToggleBtn.textContent = '👁';
    videoToggleBtn.classList.add('active');
    videoToggleBtn.title = 'Enable Mouse Mask Effect';
    
    // Show alternate logo by default when video is in full view
    defaultLogo.style.display = 'none';
    altLogo.style.display = 'block';
}