// mobile-utils.js - Mobil optimizasyonları

// Touch event desteği
let touchStartY = null;
let touchStartX = null;

// Viewport height fix for mobile browsers
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// iOS Safari viewport fix
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
});
setViewportHeight();

// Touch optimizations
document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: true });

function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
    if (!touchStartY || !touchStartX) return;
    
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const diffY = touchStartY - touchY;
    const diffX = touchStartX - touchX;
    
    // Prevent horizontal scroll on mobile
    if (Math.abs(diffX) > Math.abs(diffY)) {
        e.preventDefault();
    }
}

function handleTouchEnd() {
    touchStartY = null;
    touchStartX = null;
}

// Keyboard handling for mobile
function handleMobileKeyboard() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            // Scroll into view on focus
            setTimeout(() => {
                input.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        });
        
        input.addEventListener('blur', () => {
            // Reset viewport on blur
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        });
    });
}

// Tab switching with touch feedback
function switchTab(tabName) {
    // Add haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
    
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.closest('.tab').classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');

    // Clear results and status
    document.getElementById('results').innerHTML = '';
    document.getElementById('pdf-status').innerHTML = '';
    document.getElementById('joint-pdf-status').innerHTML = '';

    // Reset PDF inputs and data
    const pdfFileInputSingle = document.getElementById('pdf-file');
    const pdfFileInputJoint = document.getElementById('joint-pdf-file');

    if (pdfFileInputSingle) {
        pdfFileInputSingle.value = '';
        if (typeof pdfData !== 'undefined') pdfData = [];
    }
    if (pdfFileInputJoint) {
        pdfFileInputJoint.value = '';
        if (typeof jointPdfData !== 'undefined') jointPdfData = [];
    }
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Enhanced loading overlay
function showLoadingOverlay(message = 'İşlem devam ediyor...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = overlay.querySelector('p');
    messageEl.textContent = message;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Optimize PDF file input for mobile
function optimizePdfInput() {
    const pdfInputs = document.querySelectorAll('input[type="file"]');
    
    pdfInputs.forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Add loading state
                const statusDiv = this.parentElement.querySelector('.file-status');
                if (statusDiv) {
                    statusDiv.innerHTML = '<div class="file-status loading">⏳ Dosya yükleniyor...</div>';
                }
                
                // Haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
            }
        });
    });
}

// Enhanced button interactions
function enhanceButtonInteractions() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });
        
        button.addEventListener('touchend', function() {
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
        }, { passive: true });
        
        button.addEventListener('click', function() {
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(15);
            }
        });
    });
}

// Swipe gestures for tabs
function enableTabSwipeGestures() {
    const tabsContainer = document.querySelector('.tabs');
    let startX = null;
    let startY = null;
    
    tabsContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    tabsContainer.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // Only handle horizontal swipes
        if (Math.abs(diffX) > Math.abs(diffY)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    tabsContainer.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;
        
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        // Swipe threshold
        if (Math.abs(diffX) > 50) {
            const activeTab = document.querySelector('.tab.active');
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const currentIndex = tabs.indexOf(activeTab);
            
            if (diffX > 0 && currentIndex < tabs.length - 1) {
                // Swipe left - next tab
                tabs[currentIndex + 1].click();
            } else if (diffX < 0 && currentIndex > 0) {
                // Swipe right - previous tab
                tabs[currentIndex - 1].click();
            }
        }
        
        startX = null;
        startY = null;
    }, { passive: true });
}

// Performance optimizations
function optimizePerformance() {
    // Throttle resize events
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            setViewportHeight();
        }, 100);
    });
    
    // Optimize scroll performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Hide loading overlay on scroll
            if (window.scrollY > 100) {
                hideLoadingOverlay();
            }
        }, 50);
    }, { passive: true });
}

// Network status handling
function handleNetworkStatus() {
    window.addEventListener('online', () => {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'success';
        statusDiv.textContent = '✅ İnternet bağlantısı restore edildi';
        statusDiv.style.position = 'fixed';
        statusDiv.style.top = '20px';
        statusDiv.style.left = '20px';
        statusDiv.style.right = '20px';
        statusDiv.style.zIndex = '9999';
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 3000);
    });
    
    window.addEventListener('offline', () => {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'error';
        statusDiv.textContent = '❌ İnternet bağlantısı kesildi';
        statusDiv.style.position = 'fixed';
        statusDiv.style.top = '20px';
        statusDiv.style.left = '20px';
        statusDiv.style.right = '20px';
        statusDiv.style.zIndex = '9999';
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 5000);
    });
}

// Auto-save functionality for mobile
function enableAutoSave() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="time"]');
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce(() => {
            const key = `autosave_${input.id || input.name || Math.random()}`;
            localStorage.setItem(key, input.value);
        }, 500));
        
        // Restore saved values
        const key = `autosave_${input.id || input.name || Math.random()}`;
        const saved = localStorage.getItem(key);
        if (saved && !input.value) {
            input.value = saved;
        }
    });
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize all mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    handleMobileKeyboard();
    optimizePdfInput();
    enhanceButtonInteractions();
    enableTabSwipeGestures();
    optimizePerformance();
    handleNetworkStatus();
    enableAutoSave();
    
    // Add loading overlay styles
    const style = document.createElement('style');
    style.textContent = `
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        }
        
        .loading-content {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            text-align: center;
            max-width: 80%;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        
        .loading-content p {
            margin-top: 1rem;
            color: var(--text-secondary);
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
});

// Override global functions for mobile optimization
const originalSwitchTab = window.switchTab;
window.switchTab = switchTab;

// Export functions for use in other scripts
window.mobileUtils = {
    showLoadingOverlay,
    hideLoadingOverlay,
    setViewportHeight
};