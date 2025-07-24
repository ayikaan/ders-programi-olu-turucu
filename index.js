let pdfData = [];
let jointPdfData = [];

document.addEventListener('DOMContentLoaded', function() {
    // PDF.js setup
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);

    script.onload = function() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        document.getElementById('pdf-file')?.addEventListener('change', function() {
            handlePdfFile('pdf-file', 'pdf-status', 'pdf');
        });

        document.getElementById('joint-pdf-file')?.addEventListener('change', function() {
            handlePdfFile('joint-pdf-file', 'joint-pdf-status', 'joint');
        });

        // Initialize course input listeners after PDF.js loads
        setupCourseInputListeners();
    };
});

function setupCourseInputListeners() {
    // Single tab course inputs
    const singleCourseInputs = document.getElementById('course-inputs');
    if (singleCourseInputs) {
        setupCourseContainer(singleCourseInputs, 'preferred-sections-inputs');
    }

    // Joint tab course inputs
    const person1CourseInputs = document.getElementById('person1-courses');
    if (person1CourseInputs) {
        setupCourseContainer(person1CourseInputs, 'person1-preferred-sections-inputs');
    }

    const person2CourseInputs = document.getElementById('person2-courses');
    if (person2CourseInputs) {
        setupCourseContainer(person2CourseInputs, 'person2-preferred-sections-inputs');
    }
}

function setupCourseContainer(courseContainer, preferredSectionsId) {
    const preferredSectionsContainer = document.getElementById(preferredSectionsId);
    
    if (!preferredSectionsContainer) return;
    
    // Function to handle updates
    const handleUpdate = debounce(function() {
        updatePreferredSections(courseContainer, preferredSectionsContainer);
    }, 100);

    // Monitor changes in course inputs using event delegation
    courseContainer.addEventListener('input', function(e) {
        if (e.target.type === 'text') {
            handleUpdate();
        }
    });

    // Monitor DOM changes (when courses are added/removed)
    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) {
            handleUpdate();
        }
    });

    observer.observe(courseContainer, {
        childList: true,
        subtree: false
    });

    // Initial setup
    setTimeout(() => {
        updatePreferredSections(courseContainer, preferredSectionsContainer);
    }, 50);
}

function updatePreferredSections(courseContainer, preferredSectionsContainer) {
    if (!preferredSectionsContainer) return;

    const courseInputs = courseContainer.querySelectorAll('input[type="text"]');
    const courseCodes = Array.from(courseInputs)
        .map(input => input.value.trim())
        .filter(code => code);

    // Clear existing preferred sections
    preferredSectionsContainer.innerHTML = '';

    // Add preferred section input for each course code
    courseCodes.forEach(courseCode => {
        if (courseCode) {
            addPreferredSectionInput(courseCode, preferredSectionsContainer);
        }
    });
}

function addPreferredSectionInput(courseCode, container) {
    const preferredSectionDiv = document.createElement('div');
    preferredSectionDiv.className = 'preferred-section-input';
    preferredSectionDiv.innerHTML = `
        <div class="course-code-display">${courseCode}</div>
        <input type="text" class="section-selection" placeholder="Şubeleri virgülle ayır (örn: 1,3)" autocomplete="off" />
    `;
    container.appendChild(preferredSectionDiv);
}

// Global functions for adding/removing courses
window.addPreferredSectionInput = addPreferredSectionInput;

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
    const dayKeywords = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];
    const timeRegex = /\b(\d{2}:\d{2})\b/g;
    const courseCodeRegex = /\b([A-Z]{2,6}\s?\d{3,4})\b/i;
    const sectionNumRegex = /\b(\d{1,2})\b/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
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
                '', foundSection, foundCourseCode, foundDay, foundStartTime, foundEndTime, ''
            ]);
        }
    }
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

    statusDiv.innerHTML = '<div class="file-status loading">⏳ PDF dosyası işleniyor...</div>';

    try {
        const text = await extractTextFromPDF(file);
        const parsedData = parsePdfText(text);

        if (dataVariable === 'pdf') {
            pdfData = parsedData;
        } else {
            jointPdfData = parsedData;
        }

        statusDiv.innerHTML = `<div class="file-status success">✅ PDF başarıyla yüklendi (${parsedData.length} veri satırı)</div>`;
        return true;
    } catch (error) {
        statusDiv.innerHTML = '<div class="file-status error">❌ PDF dosyası işlenirken hata oluştu</div>';
        console.error('PDF processing error:', error);
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

function addCourse() {
    const courseInputs = document.getElementById('course-inputs');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    courseInputs.appendChild(newInput);
    
    const input = newInput.querySelector('input');
    input.focus();
    if (navigator.vibrate) navigator.vibrate(10);
    
    // Trigger update for preferred sections
    setTimeout(() => {
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }, 100);
}

function addCoursePerson1() {
    const courseInputs = document.getElementById('person1-courses');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    courseInputs.appendChild(newInput);
    
    const input = newInput.querySelector('input');
    input.focus();
    if (navigator.vibrate) navigator.vibrate(10);
    
    // Trigger update for preferred sections
    setTimeout(() => {
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }, 100);
}

function addCoursePerson2() {
    const courseInputs = document.getElementById('person2-courses');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: MATH 1132)" autocomplete="off" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
    `;
    courseInputs.appendChild(newInput);
    
    const input = newInput.querySelector('input');
    input.focus();
    if (navigator.vibrate) navigator.vibrate(10);
    
    // Trigger update for preferred sections
    setTimeout(() => {
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }, 100);
}

function removeCourse(button) {
    button.parentElement.remove();
    if (navigator.vibrate) navigator.vibrate(15);
}

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
            html += `<h4>Kişi 1 Programı:</h4>`;
            for (const [courseName, option] of Object.entries(schedule.person1Schedule)) {
                html += `
                    <div class="course-item">
                        <div class="course-name">${courseName}</div>
                        <div class="course-details">${option.toString()}</div>
                    </div>
                `;
            }
            html += `<h4>Kişi 2 Programı:</h4>`;
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
                        ⏰ Ortak Boş Saat (30dk'lık bloklar): ${commonFreeHours}
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
}

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
// Initial setup - check existing inputs immediately
    const existingInputs = courseContainer.querySelectorAll('input[type="text"]');
    existingInputs.forEach(input => {
        if (input.value.trim()) {
            // Add preferred section input for existing course codes
            const courseCode = input.value.trim();
            addPreferredSectionInput(courseCode, preferredSectionsContainer);
        }
    });
    
    // Also run the general update after a delay
    setTimeout(() => {
        updatePreferredSections(courseContainer, preferredSectionsContainer);
    }, 100);