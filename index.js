// index.js
// Ortak değişkenler ve yardımcı fonksiyonlar buraya taşındı
let pdfData = [];
let jointPdfData = [];

// PDF.js kütüphanesini yükle
document.addEventListener('DOMContentLoaded', function() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);

    script.onload = function() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // PDF dosya inputlarına event listener ekle
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
    };
});

// PDF'ten metin çıkarma fonksiyonu
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
                        // Yeni satır tespiti, y konumuna göre
                        if (lastY === -1 || Math.abs(item.transform[5] - lastY) > 10) {
                            if (lineBuffer.length > 0) {
                                fullText += lineBuffer.join(' ').trim() + '\n';
                            }
                            lineBuffer = [item.str];
                        } else {
                            // Aynı satırda ise boşluk ekle
                            lineBuffer.push(item.str);
                        }
                        lastY = item.transform[5];
                    }
                    // Son satırı da ekle
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

// PDF metnini ayrıştırma fonksiyonu
function parsePdfText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const data = [];
    console.log("PDF'ten çıkarılan satırlar (parsePdfText içinde):", lines);

    const dayKeywords = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];
    const timeRegex = /\b(\d{2}:\d{2})\b/g;
    const courseCodeRegex = /\b([A-Z]{2,6}\s?\d{3,4})\b/i;
    const sectionNumRegex = /\b(\d{1,2})\b/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const originalLine = line;
        console.log(`İşlenen satır: "${originalLine}"`);

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
                '', // SIRA NO
                foundSection, // Şube
                foundCourseCode, // Ders Kodu
                foundDay, // Gün
                foundStartTime, // Başlangıç Saati
                foundEndTime, // Bitiş Saati
                '' // Derslik
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

// PDF dosyasını işleme fonksiyonu
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

// Sekme değiştirme fonksiyonu
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');

    // Tüm çıktıları, durum mesajlarını ve dosya inputlarını temizle
    document.getElementById('results').innerHTML = '';
    document.getElementById('pdf-status').innerHTML = '';
    document.getElementById('joint-pdf-status').innerHTML = '';

    // PDF inputlarını sıfırla
    const pdfFileInputSingle = document.getElementById('pdf-file');
    const pdfFileInputJoint = document.getElementById('joint-pdf-file');

    if (pdfFileInputSingle) {
        pdfFileInputSingle.value = ''; // Inputu sıfırla
        pdfData = []; // Saklanan PDF verisini sıfırla
    }
    if (pdfFileInputJoint) {
        pdfFileInputJoint.value = ''; // Inputu sıfırla
        jointPdfData = []; // Saklanan ortak PDF verisini sıfırla
    }
}

// Yardımcı UI fonksiyonları
function addCourse() {
    const courseInputs = document.getElementById('course-inputs');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)">Sil</button>
    `;
    courseInputs.appendChild(newInput);
}

function addCoursePerson1() {
    const courseInputs = document.getElementById('person1-courses');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: SE 1108)" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)">Sil</button>
    `;
    courseInputs.appendChild(newInput);
}

function addCoursePerson2() {
    const courseInputs = document.getElementById('person2-courses');
    const newInput = document.createElement('div');
    newInput.className = 'course-input';
    newInput.innerHTML = `
        <input type="text" placeholder="Ders kodu (örn: MATH 1132)" />
        <button class="btn btn-danger btn-small" onclick="removeCourse(this)">Sil</button>
    `;
    courseInputs.appendChild(newInput);
}

function removeCourse(button) {
    button.parentElement.remove();
}

// Sonuçları ekrana basan fonksiyon (her iki program tipi de kullanabilir)
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
        const freeDays = getFreeDays(isJoint ? schedule.person1Schedule : schedule); // Ortak programda ayrı bir yapıya sahip olabilir
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

        } else { // Tekil Program
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

// Ders, Şube ve Zaman Dilimi Sınıfları (Global olarak kalsın ki tüm scriptler erişebilsin)
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

// Zaman aralığı kontrolü (her iki program tipi de kullanabilir)
function timeInRange(start, end, check) {
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);
    const checkTime = new Date(`1970-01-01T${check}:00`);
    return startTime <= checkTime && checkTime <= endTime;
}

function isScheduleWithinTimeRange(schedule, startTime, endTime) {
    // isJoint parametresi kontrolü eklendi, ancak varsayılan olarak tekil program bekler
    let schedulesToCheck = [schedule];
    if (schedule.person1Schedule && schedule.person2Schedule) { // Ortak program yapısı ise
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

// Boş günleri hesaplama (her iki program tipi de kullanabilir)
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