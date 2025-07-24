// mobile-utils.js - Mobil optimizasyonları (GÜNCEL VERSİYON)

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
    // Küçük bir gecikme, cihazın yönlendirme değişikliğini tamamlamasına izin verir.
    setTimeout(setViewportHeight, 100);
});
setViewportHeight();

// Touch optimizations
document.addEventListener('touchstart', handleTouchStart, { passive: true });
// Yatay kaydırma engellemesi için passive: false tutulmalı
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
    
    // Yalnızca yatay kaydırmaları engelle
    // Dikey kaydırmalar sayfa içinde gezinmek için gereklidir.
    if (Math.abs(diffX) > Math.abs(diffY)) {
        e.preventDefault();
    }
}

function handleTouchEnd() {
    touchStartY = null;
    touchStartX = null;
}

// Keyboard handling for mobile - REVİZE EDİLDİ
function handleMobileKeyboard() {
    // Sadece metin ve zaman girişlerini hedefle, dosya girişlerini değil.
    const inputsToHandle = document.querySelectorAll('input[type="text"], input[type="time"], input[type="number"], textarea');
    
    inputsToHandle.forEach(input => {
        input.addEventListener('focus', () => {
            // Klavyenin açılmasıyla otomatik kaydırmayı tarayıcıya bırakmak genellikle en iyisidir.
            // Sadece eğer element ekranın altına gizleniyorsa müdahale et.
            setTimeout(() => {
                const rect = input.getBoundingClientRect();
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                
                // Eğer input elementinin alt kenarı viewport'ın alt kenarından daha aşağıdaysa
                if (rect.bottom > viewportHeight) {
                    input.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest' // En az kaydırmayla en yakın pozisyona getir
                    });
                }
            }, 100); // Tarayıcının kendi kaydırmasını yapması için kısa bir gecikme
        });
        
        input.addEventListener('blur', () => {
            // Klavye kapandığında sayfayı zorla kaydırmayı kaldırıyoruz.
            // Tarayıcının varsayılan davranışı genellikle yeterli ve daha az rahatsız edicidir.
            // setTimeout(() => {
            //     window.scrollTo({ top: 0, behavior: 'smooth' });
            // }, 100);
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

    const targetTabElement = event ? event.target.closest('.tab') : document.querySelector(`.tab[onclick*="switchTab('${tabName}')"]`);
    if (targetTabElement) {
        targetTabElement.classList.add('active');
    } else {
        document.querySelector(`.tabs .tab[onclick*="switchTab('${tabName}')"]`).classList.add('active');
    }
    
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
    document.body.style.overflow = 'hidden'; // Sayfa kaydırmasını engelle
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto'; // Sayfa kaydırmasını geri aç
}

// Optimize PDF file input for mobile
function optimizePdfInput() {
    const pdfInputs = document.querySelectorAll('input[type="file"]');
    
    pdfInputs.forEach(input => {
        // Dosya inputlarında kaydırma mantığı uygulamıyoruz, tarayıcıya bırakıyoruz.
        // Sadece dosya seçildiğinde geri bildirim ve haptik titreşim ekle.
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const statusDiv = this.parentElement.querySelector('.file-status');
                if (statusDiv) {
                    statusDiv.innerHTML = '<div class="file-status loading">⏳ Dosya yükleniyor...</div>';
                }
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
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    tabsContainer.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;
        
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        if (Math.abs(diffX) > 50) {
            const activeTab = document.querySelector('.tab.active');
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const currentIndex = tabs.indexOf(activeTab);
            
            if (diffX > 0 && currentIndex < tabs.length - 1) {
                tabs[currentIndex + 1].click(); 
            } else if (diffX < 0 && currentIndex > 0) {
                tabs[currentIndex - 1].click(); 
            }
        }
        
        startX = null;
        startY = null;
    }, { passive: true });
}

// Performance optimizations
function optimizePerformance() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            setViewportHeight();
        }, 100);
    });
    
    // Scroll optimizasyonunda, loading overlay'i gizleme mantığını kaldırdım.
    // Çünkü hideLoadingOverlay, işlem bittiğinde çağrılmalı, scroll ile değil.
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Opsiyonel: Eğer scroll anında herhangi bir görsel güncelleme veya pahalı işlem varsa buraya eklenebilir.
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
    const inputs = document.querySelectorAll('input[type="text"], input[type="time"], input[type="number"], textarea');
    
    inputs.forEach(input => {
        if (!input.id && !input.name) {
            console.warn('Auto-save: Input elementinin id veya name attribute\'u yok, otomatik kaydetme devre dışı bırakıldı.', input);
            return;
        }
        const key = `autosave_${input.id || input.name}`;
        
        input.addEventListener('input', debounce(() => {
            localStorage.setItem(key, input.value);
        }, 500));
        
        const saved = localStorage.getItem(key);
        if (saved !== null && input.value === '') { 
            input.value = saved;
        }
    });
}

// Debounce utility (tekrar eden tanımlama)
// Bu fonksiyon, index.js dosyasında da tanımlanmıştır.
// İki dosyada da aynı fonksiyona sahip olmak yerine, bir tanesi kaldırılabilir.
// Genellikle ortak yardımcı fonksiyonlar için ayrı bir "utils.js" dosyası oluşturulur
// ve tüm scriptler bu dosyayı kullanır. Şimdilik burada bırakıyorum, ancak aklınızda bulunsun.
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
    
    // Loading overlay stilleri styles.css'e taşınmış olmalı.
    // Bu JS bloğunu buradan kaldırıyoruz.
});

// Global fonksiyonların üzerine yazma ve dışa aktarma
// switchTab fonksiyonunun mobile-utils.js içinde tanımlanıp
// burada window.switchTab = switchTab; ile dışa aktarılması,
// diğer scriptlerde ve HTML'deki onclick olaylarında doğru çalışmasını sağlar.
// index.js içindeki switchTab tanımının kaldırıldığından emin olun.
window.switchTab = switchTab;

window.mobileUtils = {
    showLoadingOverlay,
    hideLoadingOverlay,
    setViewportHeight
};