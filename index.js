// index.js - Fixed Section Selection
let pdfData = [];
let jointPdfData = [];

// PDF.js setup
document.addEventListener('DOMContentLoaded', function() {
    if (window.innerWidth < 768 && window.mobileUtils) {
        window.mobileUtils.showLoadingOverlay('Uygulama başlatılıyor...');
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);

    script.onload = function() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfFileInput = document.getElementById('pdf-file');
        const jointPdfFileInput = document.getElementById('joint-pdf-file');

        if (pdfFileInput) {
            pdfFileInput.addEventListener('change', function() {
                handlePdfFile('pdf-file', 'pdf-status', 'pdf');
            });
        }

        if (jointPdfFileInput) {
            jointPdfFileInput.addEventListener('change', function() {
                handlePdfFile('joint-pdf-file', 'joint-pdf-status', 'joint');
            });
        }

        // Initialize course input listeners
        initializeCourseInputs();

        if (window.innerWidth < 768 && window.mobileUtils) {
            setTimeout(() => {
                window.mobileUtils.hideLoadingOverlay();
            }, 500);
        }
    };

    script.onerror = function() {
        if (window.mobileUtils) {
            window.mobileUtils.hideLoadingOverlay();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = '❌ PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.';
        document.body.appendChild(errorDiv);
    };
});

// Initialize course input listeners
function initializeCourseInputs() {
    // Single program course inputs
    const singleCourseContainer = document.getElementById('course-inputs');
    const singlePreferredContainer = document.getElementById('preferred-sections-inputs');
    
    setupCourseInputListener(singleCourseContainer, singlePreferredContainer);
    
    // Joint program course inputs
    const person1Container = document.getElementById('person1-courses');
    const person1PreferredContainer = document.getElementById('person1-preferred-sections-inputs');
    
    const person2Container = document.getElementById('person2-courses');
    const person2PreferredContainer = document.getElementById('person2-preferred-sections-inputs');
    
    setupCourseInputListener(person1Container, person1PreferredContainer);
    setupCourseInputListener(person2Container, person2PreferredContainer);
}

// Setup course input listener for a container
function setupCourseInputListener(courseContainer, preferredContainer) {
    if (!courseContainer || !preferredContainer) return;
    
    // Initialize existing inputs
    courseContainer.querySelectorAll('input[type="text"]').forEach(input => {
        if (input.value.trim() !== '') {
            addPreferredSectionInput(input.value.trim(), preferredContainer);
            input.dataset.originalCourseCode = input.value.trim();
        }
        
        // Add input event listener
        input.addEventListener('input', debounce(function() {
            const originalCode = this.dataset.originalCourseCode || '';
            const newCode = this.value.trim();
            updatePreferredSectionInput(originalCode, newCode, preferredContainer);
            this.dataset.originalCourseCode = newCode;
        }, 300));
        
        // Mobile keyboard handling
        input.addEventListener('focus', function() {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
    
    // Handle course removal
    courseContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-danger') && event.target.classList.contains('btn-small')) {
            const courseInputDiv = event.target.closest('.course-input');
            const courseCodeInput = courseInputDiv.querySelector('input[type="text"]');
            
            if (courseCodeInput && courseCodeInput.value.trim()) {
                const courseCode = courseCodeInput.value.trim().toUpperCase();
                const preferredSectionDiv = preferredContainer.querySelector(`.preferred-section-input[data-course-code="${courseCode.replace(/\s/g, '')}"]`);
                if (preferredSectionDiv) {
                    preferredSectionDiv.remove();
                }
            }
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(15);
            }
        }
    });
}

// Add preferred section input
function addPreferredSectionInput(courseCode, container) {
    const normalizedCode = courseCode.toUpperCase().replace(/\s/g, '');
    if (container.querySelector(`.preferred-section-input[data-course-code="${normalizedCode}"]`)) {
        return;
    }

    const newPreferredSectionDiv = document.createElement('div');
    newPreferredSectionDiv.className = 'course-input preferred-section-input';
    newPreferredSectionDiv.dataset.courseCode = normalizedCode;

    newPreferredSectionDiv.innerHTML = `
        <span class="course-code-display">${courseCode.toUpperCase()}</span>
        <input type="text" class="section-selection" placeholder="Şubeleri virgülle ayır (örn: 1,3)" autocomplete="off" />
    `;
    container.appendChild(newPreferredSectionDiv);
}

// Update preferred section input
function updatePreferredSectionInput(originalCode, newCode, container) {
    const normalizedOriginalCode = originalCode.toUpperCase().replace(/\s/g, '');
    const normalizedNewCode = newCode.toUpperCase().replace(/\s/g, '');
    const existingDiv = container.querySelector(`.preferred-section-input[data-course-code="${normalizedOriginalCode}"]`);

    if (existingDiv) {
        if (newCode.trim() === '') {
            existingDiv.remove();
        } else {
            existingDiv.dataset.courseCode = normalizedNewCode;
            existingDiv.querySelector('.course-code-display').textContent = newCode.toUpperCase();
        }
    } else if (newCode.trim() !== '') {
        addPreferredSectionInput(newCode, container);
    }
}

// Enhanced addCourse functions
function addCourse() {
    const courseInputs = document.getElementById('course-inputs');
    const preferredContainer = document.getElementById('preferred-sections-inputs');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    courseInputs.appendChild(newInput);
    
    const input = newInput.querySelector('input');
    
    // Add event listener for new input
    input.addEventListener('input', debounce(function() {
        const originalCode = this.dataset.originalCourseCode || '';
        const newCode = this.value.trim();
        updatePreferredSectionInput(originalCode, newCode, preferredContainer);
        this.dataset.originalCourseCode = newCode;
    }, 300));
    
    input.addEventListener('focus', function() {
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
    
    input.focus();
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function addCoursePerson1() {
    const courseInputs = document.getElementById('person1-courses');
    const preferredContainer = document.getElementById('person1-preferred-sections-inputs');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    courseInputs.appendChild(newInput);
    
    const input = newInput.querySelector('input');
    
    input.addEventListener('input', debounce(function() {
        const originalCode = this.dataset.originalCourseCode || '';
        const newCode = this.value.trim();
        updatePreferredSectionInput(originalCode, newCode, preferredContainer);
        this.dataset.originalCourseCode = newCode;
    }, 300));
    
    input.addEventListener('focus', function() {
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
    
    input.focus();
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function addCoursePerson2() {
    const courseInputs = document.getElementById('person2-courses');
    const preferredContainer = document.getElementById('person2-preferred-sections-inputs');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: MATH 1132)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    courseInputs.appendChild(newInput);
    
    const input = newInput.querySelector('input');
    
    input.addEventListener('input', debounce(function() {
        const originalCode = this.dataset.originalCourseCode || '';
        const newCode = this.value.trim();
        updatePreferredSectionInput(originalCode, newCode, preferredContainer);
        this.dataset.originalCourseCode = newCode;
    }, 300));
    
    input.addEventListener('focus', function() {
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
    
    input.focus();
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function removeCourse(button) {
    button.parentElement.remove();
    
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
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

// PDF processing functions
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';

                let processedPages = 0;
                const totalPages = pdf.numPages;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    let lastY = -1;
                    let lineBuffer = [];
                    
                    for (const item of textContent.items) {
                        if (lastY === -1 || Math.abs(item.transform[5] - lastY) > 10) {
                            if (lineBuffer.length > 0) {
                                fullText += lineBuffer.join(' ').trim() + '\n';
                            }
                            lineBuffer = [item.str];
                        } else {
                            lineBuffer.push(item.str);
                        }
                        lastY = item.transform[5];
                    }
                    
                    if (lineBuffer.length > 0) {
                        fullText += lineBuffer.join(' ').trim() + '\n';
                    }

                    processedPages++;
                    if (window.mobileUtils && window.innerWidth < 768 && totalPages > 3) {
                        const progress = Math.round((processedPages / totalPages) * 100);
                        window.mobileUtils.showLoadingOverlay(`PDF işleniyor... ${progress}%`);
                    }
                }
                
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function parsePdfText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const data = [];
    
    console.log("PDF'ten çıkarılan satırlar (parsePdfText içinde):", lines);

    const dayKeywords = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];
    const timeRegex = /\b(\d{2}:\d{2})\b/g;
    const courseCodeRegex = /\b([A-Z]{2,6}\s?\d{3,4})\b/i;
    const sectionNumRegex = /\b(\d{1,2})\b/;

    let processedLines = 0;
    const totalLines = lines.length;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const originalLine = line;
        
        processedLines++;
        if (window.mobileUtils && window.innerWidth < 768 && totalLines > 100 && processedLines % 20 === 0) {
            const progress = Math.round((processedLines / totalLines) * 100);
            window.mobileUtils.showLoadingOverlay(`Veriler ayrıştırılıyor... ${progress}%`);
        }

        let foundCourseCode = '';
        let foundSection = '';
        let foundDay = '';
        let foundStartTime = '';
        let foundEndTime = '';

        const timesInLine = [...line.matchAll(timeRegex)].map(match => match[1]);
        if (timesInLine.length >= 2) {
            foundStartTime = timesInLine[0];
            foundEndTime = timesInLine[1];
        }

        for (const dayKey of dayKeywords) {
            if (line.toUpperCase().includes(dayKey)) {
                foundDay = dayKey;
                break;
            }
        }

        const codeMatch = line.match(courseCodeRegex);
        if (codeMatch) {
            foundCourseCode = codeMatch[1].toUpperCase().replace(/\s/g, '');
        }

        if (foundCourseCode) {
            const tempLine = line.replace(new RegExp(foundCourseCode.replace(/\s/g, '\\s?'), 'i'), '').trim();
            const sectionMatch = tempLine.match(sectionNumRegex);
            if (sectionMatch && sectionMatch[1].length <= 2) {
                foundSection = sectionMatch[1];
            } else {
                const partsAroundCode = line.split(new RegExp(foundCourseCode.replace(/\s/g, '\\s?'), 'i'));
                if (partsAroundCode.length > 1) {
                    const beforeCode = partsAroundCode[0];
                    const afterCode = partsAroundCode.slice(1).join('');

                    const sectionBeforeMatch = beforeCode.match(sectionNumRegex);
                    if (sectionBeforeMatch && sectionBeforeMatch[1].length <= 2) {
                        foundSection = sectionBeforeMatch[1];
                    } else {
                        const sectionAfterMatch = afterCode.match(sectionNumRegex);
                        if (sectionAfterMatch && sectionAfterMatch[1].length <= 2) {
                            foundSection = sectionAfterMatch[1];
                        }
                    }
                }
            }
        }

        if (!foundSection) {
             const startNumMatch = line.match(/^\s*(\d+)/);
             if (startNumMatch && startNumMatch[1].length <= 2) {
                 foundSection = startNumMatch[1];
             }
        }

        if (foundCourseCode && !foundSection) {
            foundSection = '1';
        }

        if (foundCourseCode && foundSection && foundDay && foundStartTime && foundEndTime) {
            data.push([
                '',
                foundSection,
                foundCourseCode,
                foundDay,
                foundStartTime,
                foundEndTime,
                ''
            ]);
            console.log(`Başarıyla ayrıştırıldı: Ders: ${foundCourseCode}, Şube: ${foundSection}, Gün: ${foundDay}, Saat: ${foundStartTime}-${foundEndTime}`);
        } else {
            console.warn(`Ayrıştırma başarısız oldu (eksik bilgi): Satır: "${originalLine}"`, {
                code: foundCourseCode,
                section: foundSection,
                day: foundDay,
                start: foundStartTime,
                end: foundEndTime
            });
        }
    }
    
    console.log(`parsePdfText fonksiyonu tamamlandı. Toplam ${data.length} satır ayrıştırıldı.`);
    return data;
}

async function handlePdfFile(fileInputId, statusId, dataVariable) {
    const fileInput = document.getElementById(fileInputId);
    const statusDiv = document.getElementById(statusId);
    const file = fileInput.files[0];

    if (!file) {
        statusDiv.innerHTML = '<div class="file-status error">❌ Lütfen bir PDF dosyası seçin</div>';
        return false;
    }

    if (file.type !== 'application/pdf') {
        statusDiv.innerHTML = '<div class="file-status error">❌ Sadece PDF dosyaları desteklenir</div>';
        return false;
    }

    const maxSize = window.innerWidth < 768 ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        statusDiv.innerHTML = `<div class="file-status error">❌ Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır</div>`;
        return false;
    }

    statusDiv.innerHTML = '<div class="file-status loading">⏳ PDF dosyası işleniyor...</div>';
    
    if (window.mobileUtils && window.innerWidth < 768) {
        window.mobileUtils.showLoadingOverlay('PDF okunuyor...');
    }

    try {
        const text = await extractTextFromPDF(file);
        
        if (window.mobileUtils && window.innerWidth < 768) {
            window.mobileUtils.showLoadingOverlay('Veri ayrıştırılıyor...');
        }
        
        const parsedData = parsePdfText(text);

        if (dataVariable === 'pdf') {
            pdfData = parsedData;
        } else {
            jointPdfData = parsedData;
        }

        statusDiv.innerHTML = `<div class="file-status success">✅ PDF başarıyla yüklendi (${parsedData.length} veri satırı)</div>`;
        
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
        
        if (window.mobileUtils) {
            window.mobileUtils.hideLoadingOverlay();
        }
        
        return true;
        
    } catch (error) {
        statusDiv.innerHTML = '<div class="file-status error">❌ PDF dosyası işlenirken hata oluştu</div>';
        console.error('PDF processing error:', error);
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        if (window.mobileUtils) {
            window.mobileUtils.hideLoadingOverlay();
        }
        
        return false;
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.closest('.tab').classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');

    document.getElementById('results').innerHTML = '';
    document.getElementById('pdf-status').innerHTML = '';
    document.getElementById('joint-pdf-status').innerHTML = '';

    const pdfFileInputSingle = document.getElementById('pdf-file');
    const pdfFileInputJoint = document.getElementById('joint-pdf-file');

    if (pdfFileInputSingle) {
        pdfFileInputSingle.value = '';
        pdfData = [];
    }
    if (pdfFileInputJoint) {
        pdfFileInputJoint.value = '';
        jointPdfData = [];
    }
}

// Display results
function displayResults(schedules, startTime, endTime, isJoint = false) {
    const resultsDiv = document.getElementById('results');

    if (schedules.length === 0) {
        resultsDiv.innerHTML = `
            <div class="error">
                ❌ ${startTime} - ${endTime} arasında uygun program bulunamadı.
            </div>
        `;
        return;
    }

    let html = `
        <div class="success">
            ✅ ${schedules.length} adet uygun program bulundu!
        </div>
    `;

    schedules.forEach((schedule, index) => {
        const freeDays = getFreeDays(isJoint ? schedule.person1Schedule : schedule);
        const commonFreeDays = isJoint ? calculateCommonFreeDays(schedule.person1Schedule, schedule.person2Schedule) : null;
        const commonFreeHours = isJoint ? calculateCommonFreeHours(schedule.person1Schedule, schedule.person2Schedule) : null;

        html += `
            <div class="schedule-card">
                <h3>📋 Program ${index + 1}</h3>
        `;

        if (isJoint) {
            html += `<h4>👥 Kişi 1 Programı:</h4>`;
            for (const [courseName, option] of Object.entries(schedule.person1Schedule)) {
                html += `
                    <div class="course-item">
                        <div class="course-name">${courseName}</div>
                        <div class="course-details">${option.toString()}</div>
                    </div>
                `;
            }
            html += `<h4>👤 Kişi 2 Programı:</h4>`;
            for (const [courseName, option] of Object.entries(schedule.person2Schedule)) {
                html += `
                    <div class="course-item">
                        <div class="course-name">${courseName}</div>
                        <div class="course-details">${option.toString()}</div>
                    </div>
                `;
            }
            if (commonFreeDays && commonFreeDays.length > 0) {
                html += `
                    <div class="free-days">
                        🎯 Ortak Boş Günler: ${commonFreeDays.join(', ')}
                    </div>
                `;
            } else {
                html += `
                    <div class="free-days" style="background: #fff3cd; color: #856404;">
                        ⚠️ Ortak Boş Gün Yok
                    </div>
                `;
            }
            if (commonFreeHours !== null) {
                html += `
                    <div class="free-days" style="background: #e0f7fa; color: #00796b;">
                        ⏰ Ortak Boş Saat (30dk blok): ${commonFreeHours}
                    </div>
                `;
            }

        } else {
            for (const [courseName, option] of Object.entries(schedule)) {
                html += `
                    <div class="course-item">
                        <div class="course-name">${courseName}</div>
                        <div class="course-details">${option.toString()}</div>
                    </div>
                `;
            }
            if (freeDays.length > 0) {
                html += `
                    <div class="free-days">
                        🎯 Boş günler: ${freeDays.join(', ')}
                    </div>
                `;
            } else {
                html += `
                    <div class="free-days" style="background: #fff3cd; color: #856404;">
                        ⚠️ Boş gün yok
                    </div>
                `;
            }
        }

        html += '</div>';
    });

    resultsDiv.innerHTML = html;
    
    if (window.innerWidth < 768) {
        setTimeout(() => {
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// Global classes
class TimeSlot {
    constructor(day, startTime, endTime) {
        this.day = day;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    conflictsWith(other) {
        if (this.day !== other.day) return false;
        return !(this.endTime <= other.startTime || other.endTime <= this.startTime);
    }

    toString() {
        return `${this.day} ${this.startTime}-${this.endTime}`;
    }
}

class ScheduleOption {
    constructor(sectionName, slots) {
        this.sectionName = sectionName;
        this.slots = slots;
    }

    conflictsWith(other) {
        return this.slots.some(s1 =>
            other.slots.some(s2 => s1.conflictsWith(s2))
        );
    }

    toString() {
        return `${this.sectionName}: [${this.slots.join(', ')}]`;
    }
}

class Course {
    constructor(name, options) {
        this.name = name;
        this.options = options;
    }
}

// Helper functions
function timeInRange(start, end, check) {
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);
    const checkTime = new Date(`1970-01-01T${check}:00`);
    return startTime <= checkTime && checkTime <= endTime;
}

function isScheduleWithinTimeRange(schedule, startTime, endTime) {
    let schedulesToCheck = [schedule];
    if (schedule.person1Schedule && schedule.person2Schedule) {
        schedulesToCheck = [schedule.person1Schedule, schedule.person2Schedule];
    }

    for (const sch of schedulesToCheck) {
        for (const option of Object.values(sch)) {
            for (const slot of option.slots) {
                if (!timeInRange(startTime, endTime, slot.startTime) ||
                    !timeInRange(startTime, endTime, slot.endTime)) {
                    return false;
                }
            }
        }
    }
    return true;
}

function getFreeDays(schedule) {
    const allDays = new Set(['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA']);
    const busyDays = new Set();

    for (const option of Object.values(schedule)) {
        for (const slot of option.slots) {
            busyDays.add(slot.day);
        }
    }

    return Array.from(allDays).filter(day => !busyDays.has(day)).sort();
}