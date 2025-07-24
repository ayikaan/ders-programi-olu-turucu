// script_witfriend.js - Mobile Optimized

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

// Ortak programları oluşturan ana backtracking fonksiyonu - Mobile optimized
function generateJointSchedulesLogic(person1CoursesDict, person2CoursesDict, commonCourseCodes) {
    const results = [];
    const allUniqueCourseCodes = [...new Set([...Object.keys(person1CoursesDict), ...Object.keys(person2CoursesDict)])];
    
    // Mobile performance limit
    const maxSchedules = window.innerWidth < 768 ? 300 : 500;

    function backtrackJoint(idx, currentSchedule1, currentSchedule2) {
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

// Ortak program oluşturma ana fonksiyonu - Mobile optimized
async function generateJointSchedule() {
    const resultsDiv = document.getElementById('results');
    
    // Mobile loading overlay
    if (window.mobileUtils) {
        window.mobileUtils.showLoadingOverlay('Ortak program oluşturuluyor...');
    } else {
        resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Ortak program oluşturuluyor...</div>';
    }

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

        // Mobile progress updates
        if (window.mobileUtils) {
            window.mobileUtils.showLoadingOverlay('Dersler analiz ediliyor...');
        }

        const person1CoursesDict = buildJointCourses(person1CourseCodes, jointPdfData, person1PreferredSections);
        const person2CoursesDict = buildJointCourses(person2CourseCodes, jointPdfData, person2PreferredSections);
        const commonCourseCodes = [...new Set(person1CourseCodes)].filter(code => person2CourseCodes.includes(code));

        if (window.mobileUtils) {
            window.mobileUtils.showLoadingOverlay('Ortak programlar hesaplanıyor...');
        }

        const allJointSchedules = generateJointSchedulesLogic(person1CoursesDict, person2CoursesDict, commonCourseCodes);
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
        const programsPerPageJoint = window.innerWidth < 768 ? 8 : 20; // Less on mobile

        if (window.mobileUtils) window.mobileUtils.hideLoadingOverlay();
        displayPaginatedJointResults(window.currentDisplayedJointSchedules, programsPerPageJoint, jointStartTime, jointEndTime);

        // Scroll to results on mobile
        if (window.innerWidth < 768) {
            setTimeout(() => {
                document.getElementById('results').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }

    } catch (error) {
        if (window.mobileUtils) window.mobileUtils.hideLoadingOverlay();
        resultsDiv.innerHTML = `<div class="error">❌ Hata: ${error.message}</div>`;
        
        // Mobile haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }
}

// Ortak program sonuçlarını sayfalayarak gösteren yardımcı fonksiyon - Mobile optimized
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
        
        // Mobile performance warning
        const maxSchedules = window.innerWidth < 768 ? 300 : 500;
        if (schedules.length >= maxSchedules) {
            resultsDiv.insertAdjacentHTML('beforeend', `
                <div class="error" style="background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;">
                    ${window.innerWidth < 768 ? '📱' : '⚠️'} ${window.innerWidth < 768 ? 'Mobil performans için' : 'Çok fazla kombinasyon nedeniyle'} arama ${maxSchedules} program ile sınırlandı.
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
                <h4>👥 Kişi 1 Programı:</h4>
        `;
        
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

        html += `
                <button class="btn btn-secondary btn-small download-joint-pdf-btn" data-program-index="${actualIndex}" style="margin-top: 10px;">
                    📄 PDF İndir
                </button>
            </div>
        `;
    });

    // Remove existing load more button
    let loadMoreButtonJoint = document.getElementById('load-more-joint-schedules');
    if (loadMoreButtonJoint) {
        loadMoreButtonJoint.remove();
    }

    resultsDiv.insertAdjacentHTML('beforeend', html);

    // Add load more button if needed
    if (endIndex < schedules.length) {
        loadMoreButtonJoint = document.createElement('button');
        loadMoreButtonJoint.id = 'load-more-joint-schedules';
        loadMoreButtonJoint.className = 'btn btn-secondary';
        loadMoreButtonJoint.textContent = `Daha Fazla Göster (${schedules.length - endIndex} kaldı)`;
        loadMoreButtonJoint.style.marginTop = '20px';
        loadMoreButtonJoint.onclick = loadMoreJointSchedules;
        resultsDiv.appendChild(loadMoreButtonJoint);
    }

    // PDF download event listeners
    document.querySelectorAll('.download-joint-pdf-btn').forEach(button => {
        button.onclick = function() {
            const programIndex = this.dataset.programIndex;
            downloadJointProgramAsPdf(programIndex, this);
        };
    });
}

// Ortak program "Daha Fazla Göster" butonuna tıklanınca çalışacak fonksiyon - Mobile optimized
function loadMoreJointSchedules() {
    const loadButton = document.getElementById('load-more-joint-schedules');
    if (loadButton) {
        loadButton.textContent = 'Yükleniyor...';
        loadButton.disabled = true;
    }
    
    window.currentJointSchedulePageIndex++;
    const programsPerPageJoint = window.innerWidth < 768 ? 8 : 20;
    
    setTimeout(() => {
        displayPaginatedJointResults(window.currentDisplayedJointSchedules, programsPerPageJoint, 
                                     document.getElementById('joint-start-time').value, 
                                     document.getElementById('joint-end-time').value);
    }, 100);
}

// Ortak Programı PDF olarak indirme fonksiyonu - Mobile optimized
async function downloadJointProgramAsPdf(programIndex, downloadButton) {
    const programCard = document.getElementById(`joint-program-card-${programIndex}`);
    if (!programCard) {
        alert("İndirilecek program bulunamadı!");
        return;
    }

    // Mobile button state
    const originalButtonText = downloadButton.innerHTML;
    downloadButton.innerHTML = '⏳ İndiriliyor...';
    downloadButton.disabled = true;
    downloadButton.style.opacity = '0.7';
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }

    // Mobile loading overlay
    if (window.mobileUtils && window.innerWidth < 768) {
        window.mobileUtils.showLoadingOverlay('Ortak PDF hazırlanıyor...');
    }

    try {
        // Load libraries dynamically
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            const loadScript = (src) => {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            };

            await Promise.all([
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
            ]);
        }

        // Create clean card copy
        const tempCard = programCard.cloneNode(true);
        const tempButton = tempCard.querySelector('.download-joint-pdf-btn');
        if (tempButton) {
            tempButton.remove();
        }

        // Mobile-optimized container
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = window.innerWidth < 768 ? '350px' : '600px';
        tempContainer.appendChild(tempCard);
        document.body.appendChild(tempContainer);

        // Generate canvas with mobile settings
        const canvas = await html2canvas(tempCard, { 
            scale: window.innerWidth < 768 ? 1.5 : 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png', 0.8);
        const pdf = new window.jspdf.jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210;
        const pageHeight = 297;
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
        
        const filename = `ortak_program_${parseInt(programIndex) + 1}_${new Date().getTime()}.pdf`;
        pdf.save(filename);

        document.body.removeChild(tempContainer);
        
        // Success haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
        
    } catch (error) {
        console.error("Ortak PDF indirme hatası:", error);
        
        // Mobile error handling
        if (window.innerWidth < 768) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = '❌ PDF indirilirken hata oluştu. Tekrar deneyin.';
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '20px';
            errorDiv.style.left = '20px';
            errorDiv.style.right = '20px';
            errorDiv.style.zIndex = '9999';
            document.body.appendChild(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 4000);
        } else {
            alert("Ortak PDF indirilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
        
        // Error haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
    } finally {
        // Reset button state
        downloadButton.innerHTML = originalButtonText;
        downloadButton.disabled = false;
        downloadButton.style.opacity = '1';
        
        if (window.mobileUtils) {
            window.mobileUtils.hideLoadingOverlay();
        }
    }
}

// Mobile-optimized course management for joint schedules
document.addEventListener('DOMContentLoaded', function() {
    const person1CoursesContainer = document.getElementById('person1-courses');
    const person1PreferredSectionsContainer = document.getElementById('person1-preferred-sections-inputs');
    const person2CoursesContainer = document.getElementById('person2-courses');
    const person2PreferredSectionsContainer = document.getElementById('person2-preferred-sections-inputs');

    // Helper functions for joint schedules
    function addPreferredSectionInputJoint(courseCode, targetContainer) {
        const normalizedCode = courseCode.toUpperCase().replace(/\s/g, '');
        if (targetContainer.querySelector(`.preferred-section-input[data-course-code="${normalizedCode}"]`)) {
            return;
        }
        
        const newPreferredSectionDiv = document.createElement('div');
        newPreferredSectionDiv.className = 'course-input preferred-section-input';
        newPreferredSectionDiv.dataset.courseCode = normalizedCode;

        newPreferredSectionDiv.innerHTML = `
            <span class="course-code-display">${courseCode}</span>
            <input type="text" class="section-selection" placeholder="Şubeleri virgülle ayır (örn: 1,3)" autocomplete="off" />
        `;
        targetContainer.appendChild(newPreferredSectionDiv);
    }

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

    function setupCourseListeners(container, preferredSectionsContainer) {
        // Initialize existing inputs
        container.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.value.trim() !== '') {
                addPreferredSectionInputJoint(input.value.trim(), preferredSectionsContainer);
                input.dataset.originalCourseCode = input.value.trim();
            }
            
            // Mobile-optimized input handling
            input.addEventListener('input', debounce(function() {
                const originalCode = this.dataset.originalCourseCode || '';
                const newCode = this.value.trim();
                updatePreferredSectionInputJoint(originalCode, newCode, preferredSectionsContainer);
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
                
                // Haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(15);
                }
            }
        });
    }

    setupCourseListeners(person1CoursesContainer, person1PreferredSectionsContainer);
    setupCourseListeners(person2CoursesContainer, person2PreferredSectionsContainer);

    // Enhanced mobile functions
    window.addCoursePerson1 = function() {
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'course-input';
        newInputDiv.innerHTML = `
            <input type="text" placeholder="Ders kodu (örn: SE 1108)" autocomplete="off" />
            <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
        `;
        person1CoursesContainer.appendChild(newInputDiv);
        
        const newCourseInput = newInputDiv.querySelector('input[type="text"]');
        
        // Add mobile listeners
        newCourseInput.addEventListener('input', debounce(function() {
            const originalCode = this.dataset.originalCourseCode || '';
            const newCode = this.value.trim();
            updatePreferredSectionInputJoint(originalCode, newCode, person1PreferredSectionsContainer);
            this.dataset.originalCourseCode = newCode;
        }, 300));
        
        newCourseInput.addEventListener('focus', function() {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
        
        newCourseInput.focus();
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    window.addCoursePerson2 = function() {
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'course-input';
        newInputDiv.innerHTML = `
            <input type="text" placeholder="Ders kodu (örn: MATH 1132)" autocomplete="off" />
            <button class="btn btn-danger btn-small" onclick="removeCourse(this)" type="button">Sil</button>
        `;
        person2CoursesContainer.appendChild(newInputDiv);
        
        const newCourseInput = newInputDiv.querySelector('input[type="text"]');
        
        // Add mobile listeners
        newCourseInput.addEventListener('input', debounce(function() {
            const originalCode = this.dataset.originalCourseCode || '';
            const newCode = this.value.trim();
            updatePreferredSectionInputJoint(originalCode, newCode, person2PreferredSectionsContainer);
            this.dataset.originalCourseCode = newCode;
        }, 300));
        
        newCourseInput.addEventListener('focus', function() {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
        
        newCourseInput.focus();
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    };
});

// Debounce utility for mobile performance
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

// Export for global access
window.generateJointSchedule = generateJointSchedule;