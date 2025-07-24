// tekil_script.js

// Ders nesnelerini PDF verilerinden oluşturma
function buildCourses(courseCodes, pdfDataArray, preferredSections = {}) {
    const grouped = {};
    const normalizedCourseCodes = courseCodes.map(code => code.toUpperCase().replace(/\s/g, ''));

    normalizedCourseCodes.forEach(code => {
        grouped[code] = {};
    });

    for (const row of pdfDataArray) {
        if (row.length < 6) {
            console.warn("buildCourses: Eksik veri satırı atlandı:", row);
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

        if (!normalizedCourseCodes.includes(codeFromPdf) || !section || !day || !startTime || !endTime) {
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

    const courses = [];
    for (const [code, sections] of Object.entries(grouped)) {
        const options = [];
        for (const [section, slots] of Object.entries(sections)) {
            let hasInternalConflict = false;
            for (let i = 0; i < slots.length; i++) {
                for (let j = i + 1; j < slots.length; j++) {
                    if (slots[i].conflictsWith(slots[j])) {
                        hasInternalConflict = true;
                        console.warn(`Uyarı: ${code} Şube ${section} içinde çakışma bulundu: ${slots[i].toString()} ve ${slots[j].toString()}`);
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
            courses.push(new Course(code, options));
        }
    }

    return courses;
}

// Programları geri izleme (backtracking) ile oluşturma
function generateSchedules(courses) {
    const results = [];

    function backtrack(index, current) {
        if (index === courses.length) {
            results.push({...current});
            return;
        }

        const course = courses[index];
        for (const option of course.options) {
            const hasConflict = Object.values(current).some(existing =>
                option.conflictsWith(existing)
            );

            if (!hasConflict) {
                current[course.name] = option;
                backtrack(index + 1, current);
                delete current[course.name];
            }
        }
    }

    backtrack(0, {});
    return results;
}

// Tekil program oluşturma ana fonksiyonu (index.html'den çağrılacak)
async function generateSchedule() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Program oluşturuluyor...</div>';

    try {
        const courseInputs = document.querySelectorAll('#course-inputs input[type="text"]');
        const courseCodes = Array.from(courseInputs)
            .map(input => input.value.trim())
            .filter(code => code);

        const preferredSections = {};
        const allCourseInputDivs = document.querySelectorAll('#course-inputs .course-input');
        
        allCourseInputDivs.forEach(div => {
            const courseCodeInput = div.querySelector('input[type="text"]');
            if (courseCodeInput && courseCodeInput.value.trim()) {
                const courseCode = courseCodeInput.value.trim().toUpperCase();
                const preferredSectionInputDiv = document.querySelector(`.preferred-section-input[data-course-code="${courseCode.replace(/\s/g, '')}"]`);
                
                if (preferredSectionInputDiv) {
                    const sectionInput = preferredSectionInputDiv.querySelector('.section-selection');
                    if (sectionInput && sectionInput.value.trim()) {
                        const sections = sectionInput.value.split(',').map(s => s.trim()).filter(s => s);
                        if (sections.length > 0) {
                            preferredSections[courseCode] = sections;
                        }
                    }
                }
            }
        });
        
        console.log("Kullanıcının tercih ettiği şubeler:", preferredSections);


        if (courseCodes.length === 0) {
            throw new Error('En az bir ders kodu girmelisiniz.');
        }

        if (pdfData.length === 0) {
            const fileInput = document.getElementById('pdf-file');
            if (!fileInput.files[0]) {
                throw new Error('Lütfen bir PDF dosyası seçin.');
            }
            const success = await handlePdfFile('pdf-file', 'pdf-status', 'pdf');
            if (!success) {
                throw new Error('PDF dosyası işlenemedi.');
            }
        }

        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        const courses = buildCourses(courseCodes, pdfData, preferredSections);

        if (courses.length === 0) {
            resultsDiv.innerHTML = `
                <div class="error">
                    ❌ Girilen ders kodlarında ve/veya seçilen şubelerde uygun program bulunamadı. Lütfen ders kodlarını, şube seçimlerini ve PDF dosyasının formatını kontrol edin.
                </div>
            `;
            return;
        }

        const allSchedules = generateSchedules(courses);
        const filteredSchedules = allSchedules.filter(schedule =>
            isScheduleWithinTimeRange(schedule, startTime, endTime)
        );

        window.currentDisplayedSchedules = filteredSchedules;
        window.currentSchedulePageIndex = 0;
        const programsPerPage = 20;

        displayPaginatedResults(window.currentDisplayedSchedules, programsPerPage, startTime, endTime);

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">❌ Hata: ${error.message}</div>`;
    }
}

// Sonuçları sayfalayarak gösteren yardımcı fonksiyon
function displayPaginatedResults(schedules, programsPerPage, startTime, endTime) {
    const resultsDiv = document.getElementById('results');
    let html = '';

    if (schedules.length === 0) {
        resultsDiv.innerHTML = `
            <div class="error">
                ❌ ${startTime} - ${endTime} arasında uygun program bulunamadı.
            </div>
        `;
        return;
    }

    if (window.currentSchedulePageIndex === 0) {
        resultsDiv.innerHTML = `
            <div class="success">
                ✅ Toplam ${schedules.length} adet uygun program bulundu!
            </div>
        `;
    }

    const startIndex = window.currentSchedulePageIndex * programsPerPage;
    const endIndex = Math.min(startIndex + programsPerPage, schedules.length);
    const schedulesToDisplay = schedules.slice(startIndex, endIndex);

    schedulesToDisplay.forEach((schedule, indexOffset) => {
        const actualIndex = startIndex + indexOffset;
        const freeDays = getFreeDays(schedule);

        html += `
            <div class="schedule-card" id="program-card-${actualIndex}">
                <h3>📋 Program ${actualIndex + 1}</h3>
        `;
        
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
        
        html += `
                <button class="btn btn-secondary btn-small download-pdf-btn" data-program-index="${actualIndex}" style="margin-top: 10px;">PDF İndir</button>
            </div>
        `;
    });

    let loadMoreButton = document.getElementById('load-more-schedules');
    if (loadMoreButton) {
        loadMoreButton.remove();
    }

    resultsDiv.insertAdjacentHTML('beforeend', html);

    if (endIndex < schedules.length) {
        loadMoreButton = document.createElement('button');
        loadMoreButton.id = 'load-more-schedules';
        loadMoreButton.className = 'btn btn-secondary';
        loadMoreButton.textContent = 'Daha Fazla Göster';
        loadMoreButton.style.marginTop = '20px';
        loadMoreButton.onclick = loadMoreSchedules;
        resultsDiv.appendChild(loadMoreButton);
    }

    document.querySelectorAll('.download-pdf-btn').forEach(button => {
        button.onclick = function() {
            const programIndex = this.dataset.programIndex;
            downloadProgramAsPdf(programIndex, this); // Butonu da fonksiyona geçir
        };
    });
}

// "Daha Fazla Göster" butonuna tıklanınca çalışacak fonksiyon
function loadMoreSchedules() {
    window.currentSchedulePageIndex++;
    const programsPerPage = 20;
    displayPaginatedResults(window.currentDisplayedSchedules, programsPerPage, 
                            document.getElementById('start-time').value, 
                            document.getElementById('end-time').value);
}

// Programı PDF olarak indirme fonksiyonu
async function downloadProgramAsPdf(programIndex, downloadButton) {
    const programCard = document.getElementById(`program-card-${programIndex}`);
    if (!programCard) {
        alert("İndirilecek program bulunamadı!");
        return;
    }

    // Buton durumunu ayarla
    const originalButtonText = downloadButton.textContent;
    downloadButton.textContent = 'İndiriliyor...';
    downloadButton.disabled = true;
    downloadButton.style.opacity = '0.7'; // Görsel geribildirim için saydamlık

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
        const tempCard = programCard.cloneNode(true);
        const tempButton = tempCard.querySelector('.download-pdf-btn');
        if (tempButton) {
            tempButton.remove();
        }

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(tempCard);
        document.body.appendChild(tempContainer);


        const canvas = await html2canvas(tempCard, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
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
        
        pdf.save(`program_${parseInt(programIndex) + 1}.pdf`);

        document.body.removeChild(tempContainer);
        
    } catch (error) {
        console.error("PDF indirme hatası:", error);
        alert("PDF indirilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
        // İşlem bittiğinde butonu eski haline getir
        downloadButton.textContent = originalButtonText;
        downloadButton.disabled = false;
        downloadButton.style.opacity = '1';
    }
}


// Şube seçimi inputlarını ekleme/kaldırma ve güncelleme fonksiyonları
function addPreferredSectionInput(courseCode) {
    const preferredSectionsContainer = document.getElementById('preferred-sections-inputs');
    const normalizedCode = courseCode.toUpperCase().replace(/\s/g, '');
    if (preferredSectionsContainer.querySelector(`.preferred-section-input[data-course-code="${normalizedCode}"]`)) {
        return;
    }

    const newPreferredSectionDiv = document.createElement('div');
    newPreferredSectionDiv.className = 'course-input preferred-section-input';
    newPreferredSectionDiv.dataset.courseCode = normalizedCode;

    newPreferredSectionDiv.innerHTML = `
        <span class="course-code-display" style="font-weight: 600; min-width: 100px;">${courseCode}</span>
        <input type="text" class="section-selection" placeholder="Şubeleri virgülle ayır (örn: 1,3)" />
    `;
    preferredSectionsContainer.appendChild(newPreferredSectionDiv);
}

function updatePreferredSectionInput(originalCourseCode, newCourseCode) {
    const preferredSectionsContainer = document.getElementById('preferred-sections-inputs');
    const normalizedOriginalCode = originalCourseCode.toUpperCase().replace(/\s/g, '');
    const normalizedNewCode = newCourseCode.toUpperCase().replace(/\s/g, '');
    const existingDiv = preferredSectionsContainer.querySelector(`.preferred-section-input[data-course-code="${normalizedOriginalCode}"]`);

    if (existingDiv) {
        if (newCourseCode.trim() === '') {
            existingDiv.remove();
        } else {
            existingDiv.dataset.courseCode = normalizedNewCode;
            existingDiv.querySelector('.course-code-display').textContent = newCourseCode.toUpperCase();
        }
    } else if (newCourseCode.trim() !== '') {
        addPreferredSectionInput(newCourseCode);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const courseInputsContainer = document.getElementById('course-inputs');
    const preferredSectionsContainer = document.getElementById('preferred-sections-inputs');

    courseInputsContainer.querySelectorAll('input[type="text"]').forEach(input => {
        if (input.value.trim() !== '') {
            addPreferredSectionInput(input.value.trim());
            input.dataset.originalCourseCode = input.value.trim();
        }
        input.addEventListener('input', function() {
            const originalCode = this.dataset.originalCourseCode || '';
            const newCode = this.value.trim();
            updatePreferredSectionInput(originalCode, newCode);
            this.dataset.originalCourseCode = newCode;
        });
    });

    window.addCourse = function() {
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'course-input';
        newInputDiv.innerHTML = `
            <input type="text" placeholder="Ders kodu (örn: SE 1108)" />
            <button class="btn btn-danger btn-small" onclick="removeCourse(this)">Sil</button>
        `;
        courseInputsContainer.appendChild(newInputDiv);

        const newCourseInput = newInputDiv.querySelector('input[type="text"]');
        newCourseInput.addEventListener('input', function() {
            const originalCode = this.dataset.originalCourseCode || '';
            const newCode = this.value.trim();
            updatePreferredSectionInput(originalCode, newCode);
            this.dataset.originalCourseCode = newCode;
        });
        newCourseInput.focus();
    };

    window.removeCourse = function(button) {
        const courseInputDiv = button.closest('.course-input');
        const courseCodeInput = courseInputDiv.querySelector('input[type="text"]');
        if (courseCodeInput && courseCodeInput.value.trim()) {
            const courseCode = courseCodeInput.value.trim().toUpperCase();
            const preferredSectionDiv = preferredSectionsContainer.querySelector(`.preferred-section-input[data-course-code="${courseCode.replace(/\s/g, '')}"]`);
            if (preferredSectionDiv) {
                preferredSectionDiv.remove();
            }
        }
        courseInputDiv.remove();
    };
});

window.generateSchedule = generateSchedule;