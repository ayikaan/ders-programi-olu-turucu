// index.js - Fixed Section Selection
let pdfData = [];
let jointPdfData = [];

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializePDFJS();
    initializeCourseInputs();
});

function initializePDFJS() {
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

        if (window.innerWidth < 768 && window.mobileUtils) {
            setTimeout(() => {
                window.mobileUtils.hideLoadingOverlay();
            }, 500);
        }
    };
}

function initializeCourseInputs() {
    // Single program
    setupCourseContainer('course-inputs', 'preferred-sections-inputs');
    
    // Joint program
    setupCourseContainer('person1-courses', 'person1-preferred-sections-inputs');
    setupCourseContainer('person2-courses', 'person2-preferred-sections-inputs');
}

function setupCourseContainer(courseContainerId, preferredContainerId) {
    const courseContainer = document.getElementById(courseContainerId);
    const preferredContainer = document.getElementById(preferredContainerId);
    
    if (!courseContainer || !preferredContainer) return;
    
    // Setup existing inputs
    courseContainer.querySelectorAll('input[type="text"]').forEach(input => {
        setupCourseInput(input, preferredContainer);
    });
    
    // Observe additions to courseContainer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('course-input')) {
                        const newInput = node.querySelector('input[type="text"]');
                        if (newInput) {
                            setupCourseInput(newInput, preferredContainer);
                        }
                    }
                });
            }
        });
    });

    observer.observe(courseContainer, { childList: true, subtree: true });

    // Handle removal
    courseContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-danger')) {
            const courseInputDiv = event.target.closest('.course-input');
            const courseCodeInput = courseInputDiv.querySelector('input[type="text"]');
            
            if (courseCodeInput && courseCodeInput.value.trim()) {
                const courseCode = courseCodeInput.value.trim().toUpperCase().replace(/\s/g, '');
                const preferredDiv = preferredContainer.querySelector(`.preferred-section-input[data-course-code="${courseCode}"]`);
                if (preferredDiv) {
                    preferredDiv.remove();
                }
            }
            
            if (navigator.vibrate) navigator.vibrate(15);
        }
    });
}

function setupCourseInput(input, preferredContainer) {
    // Initial add for existing values
    if (input.value.trim()) {
        addPreferredSectionInput(input.value.trim(), preferredContainer);
        input.dataset.originalCourseCode = input.value.trim();
    }
    
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
}

function addPreferredSectionInput(courseCode, container) {
    const normalizedCode = courseCode.toUpperCase().replace(/\s/g, '');
    if (container.querySelector(`.preferred-section-input[data-course-code="${normalizedCode}"]`)) {
        return;
    }

    const div = document.createElement('div');
    div.className = 'course-input preferred-section-input';
    div.dataset.courseCode = normalizedCode;
    div.innerHTML = `
        <span class="course-code-display">${courseCode.toUpperCase()}</span>
        <input type="text" class="section-selection" placeholder="Şubeleri virgülle ayır (örn: 1,3)" autocomplete="off" />
    `;
    container.appendChild(div);
}

function updatePreferredSectionInput(originalCode, newCode, container) {
    const normalizedOriginal = originalCode.toUpperCase().replace(/\s/g, '');
    const normalizedNew = newCode.toUpperCase().replace(/\s/g, '');
    const existing = container.querySelector(`.preferred-section-input[data-course-code="${normalizedOriginal}"]`);

    if (existing) {
        if (newCode.trim() === '') {
            existing.remove();
        } else {
            existing.dataset.courseCode = normalizedNew;
            existing.querySelector('.course-code-display').textContent = newCode.toUpperCase();
        }
    } else if (newCode.trim() !== '') {
        addPreferredSectionInput(newCode, container);
    }
}

function addCourse() {
    const container = document.getElementById('course-inputs');
    const div = document.createElement('div');
    div.className = 'course-input';
    div.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    container.appendChild(div);
    
    const input = div.querySelector('input');
    input.focus();
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function addCoursePerson1() {
    const container = document.getElementById('person1-courses');
    const div = document.createElement('div');
    div.className = 'course-input';
    div.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    container.appendChild(div);
    
    const input = div.querySelector('input');
    input.focus();
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function addCoursePerson2() {
    const container = document.getElementById('person2-courses');
    const div = document.createElement('div');
    div.className = 'course-input';
    div.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: MATH 1132)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    container.appendChild(div);
    
    const input = div.querySelector('input');
    input.focus();
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function removeCourse(button) {
    const courseInputDiv = button.parentElement;
    const courseCodeInput = courseInputDiv.querySelector('input[type="text"]');
    
    if (courseCodeInput && courseCodeInput.value.trim()) {
        const courseCode = courseCodeInput.value.trim().toUpperCase().replace(/\s/g, '');
        const preferredSectionsContainerId = courseInputDiv.closest('#single-tab') ? 'preferred-sections-inputs' : 
                                             courseInputDiv.closest('#joint-tab') && courseInputDiv.closest('#person1-courses') ? 'person1-preferred-sections-inputs' : 
                                             courseInputDiv.closest('#joint-tab') && courseInputDiv.closest('#person2-courses') ? 'person2-preferred-sections-inputs' : null;
        
        if (preferredSectionsContainerId) {
            const preferredContainer = document.getElementById(preferredSectionsContainerId);
            const preferredDiv = preferredContainer.querySelector(`.preferred-section-input[data-course-code="${courseCode}"]`);
            if (preferredDiv) {
                preferredDiv.remove();
            }
        }
    }
    
    courseInputDiv.remove();
    if (navigator.vibrate) navigator.vibrate(15);
}


function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// [PDF processing functions remain same...]
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
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
    const dayKeywords = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA'];
    const timeRegex = /\b(\d{2}:\d{2})\b/g;
    const courseCodeRegex = /\b([A-Z]{2,6}\s?\d{3,4})\b/i;
    const sectionNumRegex = /\b(\d{1,2})\b/;

    for (const line of lines) {
        let foundCourseCode = '';
        let foundSection = '';
        let foundDay = '';
        let foundStartTime = '';
        let foundEndTime = '';

        const times = [...line.matchAll(timeRegex)].map(m => m[1]);
        if (times.length >= 2) {
            foundStartTime = times[0];
            foundEndTime = times[1];
        }

        for (const day of dayKeywords) {
            if (line.toUpperCase().includes(day)) {
                foundDay = day;
                break;
            }
        }

        const codeMatch = line.match(courseCodeRegex);
        if (codeMatch) {
            foundCourseCode = codeMatch[1].toUpperCase().replace(/\s/g, '');
        }

        if (foundCourseCode) {
            const tempLine = line.replace(new RegExp(foundCourseCode.replace(/\s/g, '\\s?'), 'i'), '');
            const sectionMatch = tempLine.match(sectionNumRegex);
            if (sectionMatch && sectionMatch[1].length <= 2) {
                foundSection = sectionMatch[1];
            }
        }

        if (!foundSection) {
            const startMatch = line.match(/^\s*(\d+)/);
            if (startMatch && startMatch[1].length <= 2) {
                foundSection = startMatch[1];
            }
        }

        if (foundCourseCode && !foundSection) {
            foundSection = '1';
        }

        if (foundCourseCode && foundSection && foundDay && foundStartTime && foundEndTime) {
            data.push(['', foundSection, foundCourseCode, foundDay, foundStartTime, foundEndTime, '']);
        }
    }
    return data;
}

async function handlePdfFile(fileInputId, statusId, dataVariable) {
    const fileInput = document.getElementById(fileInputId);
    const statusDiv = document.getElementById(statusId);
    const file = fileInput.files[0];

    if (!file) {
        statusDiv.innerHTML = '<div class="file-status error">❌ PDF dosyası seçin</div>';
        return false;
    }

    if (file.type !== 'application/pdf') {
        statusDiv.innerHTML = '<div class="file-status error">❌ Sadece PDF desteklenir</div>';
        return false;
    }

    statusDiv.innerHTML = '<div class="file-status loading">⏳ PDF işleniyor...</div>';

    try {
        const text = await extractTextFromPDF(file);
        const parsedData = parsePdfText(text);

        if (dataVariable === 'pdf') {
            pdfData = parsedData;
        } else {
            jointPdfData = parsedData;
        }

        statusDiv.innerHTML = `<div class="file-status success">✅ PDF yüklendi (${parsedData.length} veri)</div>`;
        return true;
    } catch (error) {
        statusDiv.innerHTML = '<div class="file-status error">❌ PDF işlem hatası</div>';
        return false;
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.target.closest('.tab').classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
    document.getElementById('results').innerHTML = '';
    document.getElementById('pdf-status').innerHTML = '';
    document.getElementById('joint-pdf-status').innerHTML = '';
    const single = document.getElementById('pdf-file');
    const joint = document.getElementById('joint-pdf-file');
    if (single) { single.value = ''; pdfData = []; }
    if (joint) { joint.value = ''; jointPdfData = []; }
}

// Classes and helpers
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
        return this.slots.some(s1 => other.slots.some(s2 => s1.conflictsWith(s2)));
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
                if (!timeInRange(startTime, endTime, slot.startTime) || !timeInRange(startTime, endTime, slot.endTime)) {
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