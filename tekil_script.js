// tekil_script.js - Mobile Optimized - FIXED

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

// Programları geri izleme (backtracking) ile oluşturma - Mobile optimized
function generateSchedules(courses) {
    const results = [];
    const maxResults = 1000; // Limit for mobile performance

    function backtrack(index, current) {
        // Performance optimization for mobile
        if (results.length >= maxResults) {
            return;
        }

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

// Tekil program oluşturma ana fonksiyonu - Mobile optimized
async function generateSchedule() {
    const resultsDiv = document.getElementById('results');
    
    // Show mobile loading overlay
    if (window.mobileUtils) {
        window.mobileUtils.showLoadingOverlay('Program oluşturuluyor...');
    } else {
        resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Program oluşturuluyor...</div>';
    }

    try {
        const courseInputs = document.querySelectorAll('#course-inputs input[type="text"]');
        const courseCodes = Array.from(courseInputs)
            .map(input => input.value.trim())
            .filter(code => code);

        const preferredSections = {};
        document.querySelectorAll('#preferred-sections-inputs .preferred-section-input').forEach(div => {
            const courseCodeDisplay = div.querySelector('.course-code-display').textContent;
            const sectionInput = div.querySelector('.section-selection');
            if (courseCodeDisplay && sectionInput && sectionInput.value.trim()) {
                const sections = sectionInput.value.split(',').map(s => s.trim()).filter(s => s);
                if (sections.length > 0) {
                    preferredSections[courseCodeDisplay] = sections;
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

        // Show progress for mobile
        if (window.mobileUtils) {
            window.mobileUtils.showLoadingOverlay('Dersler analiz ediliyor...');
        }

        const courses = buildCourses(courseCodes, pdfData, preferredSections);

        if (courses.length === 0) {
            if (window.mobileUtils) window.mobileUtils.hideLoadingOverlay();
            resultsDiv.innerHTML = `
                <div class="error">
                    ❌ Girilen ders kodlarında ve/veya seçilen şubelerde uygun program bulunamadı. Lütfen ders kodlarını, şube seçimlerini ve PDF dosyasının formatını kontrol edin.
                </div>
            `;
            return;
        }

        // Show progress for mobile
        if (window.mobileUtils) {
            window.mobileUtils.showLoadingOverlay('Programlar oluşturuluyor...');
        }

        // Use requestIdleCallback for better mobile performance
        const generateSchedulesAsync = () => {
            return new Promise((resolve) => {
                const schedules = generateSchedules(courses);
                resolve(schedules);
            });
        };

        const allSchedules = await generateSchedulesAsync();
        const filteredSchedules = allSchedules.filter(schedule =>
            isScheduleWithinTimeRange(schedule, startTime, endTime)
        );

        window.currentDisplayedSchedules = filteredSchedules;
        window.currentSchedulePageIndex = 0;
        const programsPerPage = window.innerWidth < 768 ? 10 : 20; // Less per page on mobile

        if (window.mobileUtils) window.mobileUtils.hideLoadingOverlay();
        displayPaginatedResults(window.currentDisplayedSchedules, programsPerPage, startTime, endTime);

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
        
        // Haptic feedback for error
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }
}

// Sonuçları sayfalayarak gösteren yardımcı fonksiyon - Mobile optimized
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
        
        // Performance warning for mobile
        if (schedules.length > 500 && window.innerWidth < 768) {
            resultsDiv.insertAdjacentHTML('beforeend', `
                <div class="error" style="background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;">
                    📱 Mobil cihazda daha iyi performans için ilk 500 program gösteriliyor.
                </div>
            `);
        }
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
                <button class="btn btn-secondary btn-small download-pdf-btn" data-program-index="${actualIndex}" style="margin-top: 10px;">
                    📄 PDF İndir
                </button>
            </div>
        `;
    });

    // Remove existing load more button
    let loadMoreButton = document.getElementById('load-more-schedules');
    if (loadMoreButton) {
        loadMoreButton.remove();
    }

    resultsDiv.insertAdjacentHTML('beforeend', html);

    // Add load more button if needed
    if (endIndex < schedules.length) {
        loadMoreButton = document.createElement('button');
        loadMoreButton.id = 'load-more-schedules';
        loadMoreButton.className = 'btn btn-secondary';
        loadMoreButton.textContent = `Daha Fazla Göster (${schedules.length - endIndex} kaldı)`;
        loadMoreButton.style.marginTop = '20px';
        loadMoreButton.onclick = loadMoreSchedules;
        resultsDiv.appendChild(loadMoreButton);
    }

    // Add PDF download event listeners
    document.querySelectorAll('.download-pdf-btn').forEach(button => {
        button.onclick = function() {
            const programIndex = this.dataset.programIndex;
            downloadProgramAsPdf(programIndex, this);
        };
    });
}

// "Daha Fazla Göster" butonuna tıklanınca çalışacak fonksiyon - Mobile optimized
function loadMoreSchedules() {
    // Show loading state
    const loadButton = document.getElementById('load-more-schedules');
    if (loadButton) {
        loadButton.textContent = 'Yükleniyor...';
        loadButton.disabled = true;
    }
    
    window.currentSchedulePageIndex++;
    const programsPerPage = window.innerWidth < 768 ? 10 : 20;
    
    setTimeout(() => {
        displayPaginatedResults(window.currentDisplayedSchedules, programsPerPage, 
                                document.getElementById('start-time').value, 
                                document.getElementById('end-time').value);
    }, 100);
}

// Programı PDF olarak indirme fonksiyonu - Mobile optimized
async function downloadProgramAsPdf(programIndex, downloadButton) {
    const programCard = document.getElementById(`program-card-${programIndex}`);
    if (!programCard) {
        alert("İndirilecek program bulunamadı!");
        return;
    }

    // Mobile-optimized button state
    const originalButtonText = downloadButton.textContent;
    downloadButton.innerHTML = '⏳ İndiriliyor...';
    downloadButton.disabled = true;
    downloadButton.style.opacity = '0.7';
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }

    // Show loading overlay on mobile
    if (window.mobileUtils && window.innerWidth < 768) {
        window.mobileUtils.showLoadingOverlay('PDF hazırlanıyor...');
    }

    // Dynamic library loading with error handling
    try {
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

        // Create temporary card without button
        const tempCard = programCard.cloneNode(true);
        const tempButton = tempCard.querySelector('.download-pdf-btn');
        if (tempButton) {
            tempButton.remove();
        }

        // Create temporary container
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = window.innerWidth < 768 ? '350px' : '600px'; // Mobile-optimized width
        tempContainer.appendChild(tempCard);
        document.body.appendChild(tempContainer);

        // Generate canvas with mobile-optimized settings
        const canvas = await html2canvas(tempCard, { 
            scale: window.innerWidth < 768 ? 1.5 : 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png', 0.8); // Reduced quality for mobile
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
        
        // Mobile-friendly filename
        const filename = `program_${parseInt(programIndex) + 1}_${new Date().getTime()}.pdf`;
        pdf.save(filename);

        // Cleanup
        document.body.removeChild(tempContainer);
        
        // Success feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
        
    } catch (error) {
        console.error("PDF indirme hatası:", error);
        
        // Mobile-friendly error message
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
            alert("PDF indirilirken bir hata oluştu. Lütfen tekrar deneyin.");
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
        
        // Hide loading overlay
        if (window.mobileUtils) {
            window.mobileUtils.hideLoadingOverlay();
        }
    }
}

// Export for global access
window.generateSchedule = generateSchedule;