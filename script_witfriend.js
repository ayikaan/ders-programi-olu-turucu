// script_witfriend.js

// Ortak program için dersleri oluşturma
function buildJointCourses(personCourseCodes, pdfDataArray, preferredSections = {}) {
    const grouped = {};
    const normalizedPersonCourseCodes = personCourseCodes.map(code => code.toUpperCase().replace(/\s/g, ''));

    normalizedPersonCourseCodes.forEach(code => {
        grouped[code] = {};
    });

    for (const row of pdfDataArray) {
        if (row.length < 6) {
            console.warn("buildJointCourses: Eksik veri satırı atlandı:", row);
            continue;
        }

        const section = String(row[1]).trim();
        const codeFromPdf = String(row[2]).toUpperCase().replace(/\s/g, '');
        const day = String(row[3]).toUpperCase();
        const startTime = String(row[4]).trim();
        const endTime = String(row[5]).trim();

        const normalizedPreferredSections = {};
        for (const key in preferredSections) {
            if (preferredSections.hasOwnProperty(key)) {
                normalizedPreferredSections[key.toUpperCase().replace(/\s/g, '')] = preferredSections[key].map(s => String(s).trim());
            }
        }

        if (!normalizedPersonCourseCodes.includes(codeFromPdf) || !section || !day || !startTime || !endTime) {
            continue;
        }

        if (normalizedPreferredSections[codeFromPdf] && normalizedPreferredSections[codeFromPdf].length > 0 && !normalizedPreferredSections[codeFromPdf].includes(section)) {
            continue;
        }

        const slot = new TimeSlot(day, startTime, endTime);

        if (!grouped[codeFromPdf][section]) {
            grouped[codeFromPdf][section] = [];
        }
        grouped[codeFromPdf][section].push(slot);
    }

    const coursesDict = {};
    for (const [code, sections] of Object.entries(grouped)) {
        const options = [];
        for (const [section, slots] of Object.entries(sections)) {
            let hasInternalConflict = false;
            for (let i = 0; i < slots.length; i++) {
                for (let j = i + 1; j < slots.length; j++) {
                    if (slots[i].conflictsWith(slots[j])) {
                        hasInternalConflict = true;
                        console.warn(`Uyarı (Ortak): ${code} Şube ${section} içinde çakışma bulundu: ${slots[i].toString()} ve ${slots[j].toString()}`);
                        break;
                    }
                }
                if (hasInternalConflict) break;
            }
            if (slots.length > 0 && !hasInternalConflict) {
                options.push(new ScheduleOption(`Şube ${section}`, slots));
            }
        }
        if (options.length > 0) {
            coursesDict[code] = new Course(code, options);
        }
    }
    return coursesDict;
}

// Ortak programları oluşturan ana backtracking fonksiyonu
function generateJointSchedulesLogic(
    person1CoursesDict,
    person2CoursesDict,
    commonCourseCodes
) {
    const results = [];
    const allUniqueCourseCodes = [...new Set([...Object.keys(person1CoursesDict), ...Object.keys(person2CoursesDict)])];
    
    const maxSchedules = 500; // Üretilecek maksimum program sayısı sınırı

    function backtrackJoint(
        idx,
        currentSchedule1,
        currentSchedule2
    ) {
        if (results.length >= maxSchedules) {
            return;
        }

        if (idx === allUniqueCourseCodes.length) {
            results.push({
                person1Schedule: {...currentSchedule1},
                person2Schedule: {...currentSchedule2}
            });
            return;
        }

        const courseCode = allUniqueCourseCodes[idx];

        const isCommon = commonCourseCodes.includes(courseCode);

        const p1Options = person1CoursesDict[courseCode] ? person1CoursesDict[courseCode].options : [null];
        const p2Options = person2CoursesDict[courseCode] ? person2CoursesDict[courseCode].options : [null];

        for (const opt1 of p1Options) {
            if (opt1 && conflictsWithExisting(opt1, currentSchedule1)) {
                continue;
            }

            for (const opt2 of p2Options) {
                if (opt2 && conflictsWithExisting(opt2, currentSchedule2)) {
                    continue;
                }

                if (isCommon && opt1 && opt2 && opt1.sectionName !== opt2.sectionName) {
                    continue;
                }
                
                if (!opt1 && !opt2) {
                    continue;
                }

                const newSchedule1 = {...currentSchedule1};
                const newSchedule2 = {...currentSchedule2};

                if (opt1) newSchedule1[courseCode] = opt1;
                if (opt2) newSchedule2[courseCode] = opt2;
                
                backtrackJoint(idx + 1, newSchedule1, newSchedule2);
            }
        }
    }

    backtrackJoint(0, {}, {});
    return results;
}

// Çakışma kontrolü için yardımcı fonksiyon
function conflictsWithExisting(option, currentSchedule) {
    return Object.values(currentSchedule).some(existing =>
        option.conflictsWith(existing)
    );
}

// İki programın ortak boş günlerini hesaplama
function calculateCommonFreeDays(schedule1, schedule2) {
    const allDays = new Set(['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA']);
    const busyDays1 = new Set();
    const busyDays2 = new Set();

    for (const option of Object.values(schedule1)) {
        for (const slot of option.slots) {
            busyDays1.add(slot.day);
        }
    }
    for (const option of Object.values(schedule2)) {
        for (const slot of option.slots) {
            busyDays2.add(slot.day);
        }
    }

    return Array.from(allDays).filter(day => !busyDays1.has(day) && !busyDays2.has(day)).sort();
}

// İki programın ortak boş saatlerini hesaplama (30 dakikalık bloklar halinde)
function calculateCommonFreeHours(schedule1, schedule2) {
    const fmt = "%H:%M";
    const halfHourBlocks = [];
    for (let h = 8; h <= 20; h++) {
        halfHourBlocks.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 20) halfHourBlocks.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const busyBlocks1 = new Set();
    const busyBlocks2 = new Set();

    function populateBusyBlocks(schedule, busySet) {
        for (const option of Object.values(schedule)) {
            for (const slot of option.slots) {
                let current = new Date(`1970-01-01T${slot.startTime}:00`);
                const end = new Date(`1970-01-01T${slot.endTime}:00`);
                while (current < end) {
                    busySet.add(current.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
                    current.setMinutes(current.getMinutes() + 30);
                }
            }
        }
    }

    populateBusyBlocks(schedule1, busyBlocks1);
    populateBusyBlocks(schedule2, busyBlocks2);

    let commonFreeCount = 0;
    for (const block of halfHourBlocks) {
        if (!busyBlocks1.has(block) && !busyBlocks2.has(block)) {
            commonFreeCount++;
        }
    }
    return commonFreeCount;
}

// Ortak program oluşturma ana fonksiyonu (index.html'den çağrılacak)
async function generateJointSchedule() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Ortak program oluşturuluyor...</div>';

    try {
        const person1CourseInputs = document.querySelectorAll('#person1-courses input[type="text"]');
        const person1CourseCodes = Array.from(person1CourseInputs)
            .map(input => input.value.trim())
            .filter(code => code);

        const person2CourseInputs = document.querySelectorAll('#person2-courses input[type="text"]');
        const person2CourseCodes = Array.from(person2CourseInputs)
            .map(input => input.value.trim())
            .filter(code => code);
        
        const person1PreferredSections = {};
        document.querySelectorAll('#person1-preferred-sections-inputs .preferred-section-input').forEach(div => {
            const courseCodeDisplay = div.querySelector('.course-code-display').textContent;
            const sectionInput = div.querySelector('.section-selection');
            if (courseCodeDisplay && sectionInput && sectionInput.value.trim()) {
                const sections = sectionInput.value.split(',').map(s => s.trim()).filter(s => s);
                if (sections.length > 0) {
                    person1PreferredSections[courseCodeDisplay] = sections;
                }
            }
        });

        const person2PreferredSections = {};
        document.querySelectorAll('#person2-preferred-sections-inputs .preferred-section-input').forEach(div => {
            const courseCodeDisplay = div.querySelector('.course-code-display').textContent;
            const sectionInput = div.querySelector('.section-selection');
            if (courseCodeDisplay && sectionInput && sectionInput.value.trim()) {
                const sections = sectionInput.value.split(',').map(s => s.trim()).filter(s => s);
                if (sections.length > 0) {
                    person2PreferredSections[courseCodeDisplay] = sections;
                }
            }
        });

        console.log("Kişi 1 tercih edilen şubeler:", person1PreferredSections);
        console.log("Kişi 2 tercih edilen şubeler:", person2PreferredSections);


        if (person1CourseCodes.length === 0 && person2CourseCodes.length === 0) {
            throw new Error('Her iki kişi için de en az bir ders kodu girmelisiniz.');
        }

        if (jointPdfData.length === 0) {
            const fileInput = document.getElementById('joint-pdf-file');
            if (!fileInput.files[0]) {
                throw new Error('Lütfen bir PDF dosyası seçin.');
            }
            const success = await handlePdfFile('joint-pdf-file', 'joint-pdf-status', 'joint');
            if (!success) {
                throw new Error('PDF dosyası işlenemedi.');
            }
        }

        const jointStartTime = document.getElementById('joint-start-time').value;
        const jointEndTime = document.getElementById('joint-end-time').value;

        const person1CoursesDict = buildJointCourses(person1CourseCodes, jointPdfData, person1PreferredSections);
        const person2CoursesDict = buildJointCourses(person2CourseCodes, jointPdfData, person2PreferredSections);

        const commonCourseCodes = [...new Set(person1CourseCodes)].filter(code => person2CourseCodes.includes(code));

        const allJointSchedules = generateJointSchedulesLogic(
            person1CoursesDict,
            person2CoursesDict,
            commonCourseCodes
        );

        const filteredJointSchedules = allJointSchedules.filter(schedule =>
            isScheduleWithinTimeRange(schedule, jointStartTime, jointEndTime)
        );

        filteredJointSchedules.sort((a, b) => {
            const commonHoursA = calculateCommonFreeHours(a.person1Schedule, a.person2Schedule);
            const commonHoursB = calculateCommonFreeHours(b.person1Schedule, b.person2Schedule);
            return commonHoursB - commonHoursA;
        });

        window.currentDisplayedJointSchedules = filteredJointSchedules;
        window.currentJointSchedulePageIndex = 0;
        const programsPerPageJoint = 20;

        displayPaginatedJointResults(window.currentDisplayedJointSchedules, programsPerPageJoint, jointStartTime, jointEndTime);

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">❌ Hata: ${error.message}</div>`;
    }
}

// Ortak program sonuçlarını sayfalayarak gösteren yardımcı fonksiyon
function displayPaginatedJointResults(schedules, programsPerPage, startTime, endTime) {
    const resultsDiv = document.getElementById('results');
    let html = '';

    if (schedules.length === 0) {
        resultsDiv.innerHTML = `
            <div class="error">
                ❌ ${startTime} - ${endTime} arasında uygun ortak program bulunamadı.
            </div>
        `;
        return;
    }

    if (window.currentJointSchedulePageIndex === 0) {
        resultsDiv.innerHTML = `
            <div class="success">
                ✅ Toplam ${schedules.length} adet uygun ortak program bulundu!
            </div>
        `;
        if (schedules.length >= 500) {
            resultsDiv.insertAdjacentHTML('beforeend', `
                <div class="error" style="background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;">
                    ⚠️ Çok fazla program kombinasyonu oluştuğu için arama 500 program ile kısıtlandı.
                    Daha az ders seçmeyi veya şube filtrelemeyi deneyin.
                </div>
            `);
        }
    }

    const startIndex = window.currentJointSchedulePageIndex * programsPerPage;
    const endIndex = Math.min(startIndex + programsPerPage, schedules.length);
    const schedulesToDisplay = schedules.slice(startIndex, endIndex);

    schedulesToDisplay.forEach((schedule, indexOffset) => {
        const actualIndex = startIndex + indexOffset;
        const commonFreeDays = calculateCommonFreeDays(schedule.person1Schedule, schedule.person2Schedule);
        const commonFreeHours = calculateCommonFreeHours(schedule.person1Schedule, schedule.person2Schedule);

        html += `
            <div class="schedule-card" id="joint-program-card-${actualIndex}">
                <h3>📋 Ortak Program ${actualIndex + 1}</h3>
                <h4>Kişi 1 Programı:</h4>
        `;
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

        // PDF İndir butonu
        html += `
                <button class="btn btn-secondary btn-small download-joint-pdf-btn" data-program-index="${actualIndex}" style="margin-top: 10px;">PDF İndir</button>
            </div>
        `;
    });

    let loadMoreButtonJoint = document.getElementById('load-more-joint-schedules');
    if (loadMoreButtonJoint) {
        loadMoreButtonJoint.remove();
    }

    resultsDiv.insertAdjacentHTML('beforeend', html);

    if (endIndex < schedules.length) {
        loadMoreButtonJoint = document.createElement('button');
        loadMoreButtonJoint.id = 'load-more-joint-schedules';
        loadMoreButtonJoint.className = 'btn btn-secondary';
        loadMoreButtonJoint.textContent = 'Daha Fazla Göster';
        loadMoreButtonJoint.style.marginTop = '20px';
        loadMoreButtonJoint.onclick = loadMoreJointSchedules;
        resultsDiv.appendChild(loadMoreButtonJoint);
    }

    // PDF İndir butonlarına tıklama olay dinleyicisi ekle
    document.querySelectorAll('.download-joint-pdf-btn').forEach(button => {
        button.onclick = function() {
            const programIndex = this.dataset.programIndex;
            downloadJointProgramAsPdf(programIndex, this); // Butonu da fonksiyona geçir
        };
    });
}

// Ortak program "Daha Fazla Göster" butonuna tıklanınca çalışacak fonksiyon
function loadMoreJointSchedules() {
    window.currentJointSchedulePageIndex++;
    const programsPerPageJoint = 20;
    displayPaginatedJointResults(window.currentDisplayedJointSchedules, programsPerPageJoint, 
                                 document.getElementById('joint-start-time').value, 
                                 document.getElementById('joint-end-time').value);
}

// Ortak Programı PDF olarak indirme fonksiyonu
async function downloadJointProgramAsPdf(programIndex, downloadButton) {
    const programCard = document.getElementById(`joint-program-card-${programIndex}`);
    if (!programCard) {
        alert("İndirilecek program bulunamadı!");
        return;
    }

    // Buton durumunu ayarla
    const originalButtonText = downloadButton.textContent;
    downloadButton.textContent = 'İndiriliyor...';
    downloadButton.disabled = true;
    downloadButton.style.opacity = '0.7';

    // jsPDF ve html2canvas kütüphanelerini dinamik olarak yükle
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        const scriptHtml2canvas = document.createElement('script');
        scriptHtml2canvas.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(scriptHtml2canvas);

        const scriptJsPDF = document.createElement('script');
        scriptJsPDF.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(scriptJsPDF);

        await Promise.all([
            new Promise(resolve => scriptHtml2canvas.onload = resolve),
            new Promise(resolve => scriptJsPDF.onload = resolve)
        ]);
    }

    try {
        // Kartın bir kopyasını oluştur ve içindeki butonu kaldır
        const tempCard = programCard.cloneNode(true);
        const tempButton = tempCard.querySelector('.download-joint-pdf-btn');
        if (tempButton) {
            tempButton.remove();
        }

        // Geçici kartı görünmez bir alana ekle
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(tempCard);
        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempCard, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({
            orientation: 'p', // 'p' dikey, 'l' yatay
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 genişliği mm
        const pageHeight = 297; // A4 yüksekliği mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`ortak_program_${parseInt(programIndex) + 1}.pdf`);

        document.body.removeChild(tempContainer);
        
    } catch (error) {
        console.error("Ortak PDF indirme hatası:", error);
        alert("Ortak PDF indirilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
        // İşlem bittiğinde butonu eski haline getir
        downloadButton.textContent = originalButtonText;
        downloadButton.disabled = false;
        downloadButton.style.opacity = '1';
    }
}


// Ortak program için ders inputlarına ve silme butonlarına olay dinleyicileri
document.addEventListener('DOMContentLoaded', function() {
    const person1CoursesContainer = document.getElementById('person1-courses');
    const person1PreferredSectionsContainer = document.getElementById('person1-preferred-sections-inputs');

    const person2CoursesContainer = document.getElementById('person2-courses');
    const person2PreferredSectionsContainer = document.getElementById('person2-preferred-sections-inputs');

    // Yardımcı fonksiyon: Ortak program şube seçimi inputu ekle
    function addPreferredSectionInputJoint(courseCode, targetContainer) {
        const normalizedCode = courseCode.toUpperCase().replace(/\s/g, '');
        if (targetContainer.querySelector(`.preferred-section-input[data-course-code="${normalizedCode}"]`)) {
            return;
        }
        const newPreferredSectionDiv = document.createElement('div');
        newPreferredSectionDiv.className = 'course-input preferred-section-input';
        newPreferredSectionDiv.dataset.courseCode = normalizedCode;

        newPreferredSectionDiv.innerHTML = `
            <span class="course-code-display" style="font-weight: 600; min-width: 100px;">${courseCode}</span>
            <input type="text" class="section-selection" placeholder="Şubeleri virgülle ayır (örn: 1,3)" />
        `;
        targetContainer.appendChild(newPreferredSectionDiv);
    }

    // Yardımcı fonksiyon: Ortak program şube seçimi inputu güncelle
    function updatePreferredSectionInputJoint(originalCode, newCode, targetContainer) {
        const normalizedOriginalCode = originalCode.toUpperCase().replace(/\s/g, '');
        const normalizedNewCode = newCode.toUpperCase().replace(/\s/g, '');
        const existingDiv = targetContainer.querySelector(`.preferred-section-input[data-course-code="${normalizedOriginalCode}"]`);

        if (existingDiv) {
            if (newCode.trim() === '') {
                existingDiv.remove();
            } else {
                existingDiv.dataset.courseCode = normalizedNewCode;
                existingDiv.querySelector('.course-code-display').textContent = newCode.toUpperCase();
            }
        } else if (newCode.trim() !== '') {
            addPreferredSectionInputJoint(newCode, targetContainer);
        }
    }

    // Dinleyici ekleme fonksiyonu (tekrar eden koddan kaçınmak için)
    function setupCourseListeners(container, preferredSectionsContainer) {
        container.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.value.trim() !== '') {
                addPreferredSectionInputJoint(input.value.trim(), preferredSectionsContainer);
                input.dataset.originalCourseCode = input.value.trim();
            }
        });

        container.addEventListener('input', function(event) {
            if (event.target.tagName === 'INPUT' && event.target.type === 'text') {
                const originalCode = event.target.dataset.originalCourseCode || '';
                const newCode = event.target.value.trim();
                updatePreferredSectionInputJoint(originalCode, newCode, preferredSectionsContainer);
                event.target.dataset.originalCourseCode = newCode;
            }
        });

        container.addEventListener('click', function(event) {
            if (event.target.classList.contains('btn-danger') && event.target.classList.contains('btn-small')) {
                const courseInputDiv = event.target.closest('.course-input');
                const courseCodeInput = courseInputDiv.querySelector('input[type="text"]');
                if (courseCodeInput && courseCodeInput.value.trim()) {
                    const courseCode = courseCodeInput.value.trim().toUpperCase();
                    const preferredSectionDiv = preferredSectionsContainer.querySelector(`.preferred-section-input[data-course-code="${courseCode.replace(/\s/g, '')}"]`);
                    if (preferredSectionDiv) {
                        preferredSectionDiv.remove();
                    }
                }
            }
        });
    }

    setupCourseListeners(person1CoursesContainer, person1PreferredSectionsContainer);
    setupCourseListeners(person2CoursesContainer, person2PreferredSectionsContainer);

    window.addCoursePerson1 = function() {
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'course-input';
        newInputDiv.innerHTML = `
            <input type="text" placeholder="Ders kodu (örn: SE 1108)" />
            <button class="btn btn-danger btn-small" onclick="removeCourse(this)">Sil</button>
        `;
        person1CoursesContainer.appendChild(newInputDiv);
        const newCourseInput = newInputDiv.querySelector('input[type="text"]');
        newCourseInput.focus();
    };

    window.addCoursePerson2 = function() {
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'course-input';
        newInputDiv.innerHTML = `
            <input type="text" placeholder="Ders kodu (örn: MATH 1132)" />
            <button class="btn btn-danger btn-small" onclick="removeCourse(this)">Sil</button>
        `;
        person2CoursesContainer.appendChild(newInputDiv);
        const newCourseInput = newInputDiv.querySelector('input[type="text"]');
        newCourseInput.focus();
    };
});

window.generateJointSchedule = generateJointSchedule;