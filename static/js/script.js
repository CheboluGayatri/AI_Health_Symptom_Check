/**
 * script.js
 * 
 * Purpose:
 *     Handles interactive client-side dashboard behaviors:
 *         - Symptoms search filtering.
 *         - Dynamic badge rendering for checked symptoms.
 *         - AJAX form submission to /api/predict.
 *         - Differential diagnosis card rendering.
 *         - Precaution/medication panels injection.
 *         - Dynamic charts reloading.
 *         - Toast system management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- QUERY SELECTORS ---
    const symptomSearch = document.getElementById('symptomSearch');
    const symptomCheckboxes = document.querySelectorAll('.symptom-checkbox');
    const selectedBadges = document.getElementById('selectedBadges');
    const clearBtn = document.getElementById('clearBtn');
    const predictBtn = document.getElementById('predictBtn');
    const loadingModal = document.getElementById('loadingModal');
    const resultsCard = document.getElementById('resultsCard');
    const toastContainer = document.getElementById('toastContainer');

    // Result Nodes
    const topDisease = document.getElementById('topDisease');
    const topConfidence = document.getElementById('topConfidence');
    const differentialList = document.getElementById('differentialList');
    const recsPrecautions = document.getElementById('recsPrecautions');
    const recsMedicines = document.getElementById('recsMedicines');
    const recsAdvice = document.getElementById('recsAdvice');
    const pdfDownloadLink = document.getElementById('pdfDownloadLink');

    // Chart Nodes
    const pieChartImg = document.getElementById('pieChartImg');
    const barChartImg = document.getElementById('barChartImg');

    // --- TOAST NOTIFICATIONS HELPER ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `p-4 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2 transform translate-y-2 opacity-0 transition-all duration-300 ${
            type === 'danger'
                ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
        }`;
        
        toast.innerHTML = `
            <i data-lucide="${type === 'danger' ? 'alert-circle' : 'check-circle'}" class="w-4 h-4 shrink-0"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        lucide.createIcons();

        // Animate entering
        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        }, 50);

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('translate-y-2', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- DYNAMIC SEARCH FILTER ---
    if (symptomSearch) {
        symptomSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            symptomCheckboxes.forEach(cb => {
                const label = cb.closest('label');
                const text = label.querySelector('.symptom-label').textContent.toLowerCase();
                
                if (text.includes(query)) {
                    label.style.display = 'flex';
                } else {
                    label.style.display = 'none';
                }
            });
        });
    }

    // --- RE-RENDER BADGES ---
    function updateBadges() {
        selectedBadges.innerHTML = '';
        let count = 0;

        symptomCheckboxes.forEach(cb => {
            if (cb.checked) {
                count++;
                const labelText = cb.closest('label').querySelector('.symptom-label').textContent;
                
                const badge = document.createElement('div');
                badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-clinical-500/10 text-clinical-600 dark:text-clinical-400 text-xs font-semibold border border-clinical-500/20';
                badge.innerHTML = `
                    <span>${labelText}</span>
                    <button class="hover:text-rose-500 cursor-pointer text-slate-400 transition-colors" data-val="${cb.value}">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                `;

                // Quick delete event
                badge.querySelector('button').addEventListener('click', (e) => {
                    const val = e.currentTarget.getAttribute('data-val');
                    const originalCheckbox = Array.from(symptomCheckboxes).find(i => i.value === val);
                    if (originalCheckbox) {
                        originalCheckbox.checked = false;
                        updateBadges();
                    }
                });

                selectedBadges.appendChild(badge);
            }
        });

        lucide.createIcons();
    }

    symptomCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateBadges);
    });

    // --- CLEAR SELECTIONS ---
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            symptomCheckboxes.forEach(cb => cb.checked = false);
            updateBadges();
            showToast("Symptom selections cleared.", "info");
        });
    }

    // --- SUBMIT COMPREHENSIVE AJAX DIAGNOSIS ---
    if (predictBtn) {
        predictBtn.addEventListener('click', async () => {
            const checkedSymptoms = Array.from(symptomCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            if (checkedSymptoms.length === 0) {
                showToast("Please select at least one symptom trait first.", "danger");
                return;
            }

            // Fire Loader Modal
            loadingModal.classList.remove('hidden');

            try {
                const response = await fetch('/api/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symptoms: checkedSymptoms })
                });

                const data = await response.json();
                loadingModal.classList.add('hidden');

                if (response.status !== 200 || data.error) {
                    showToast(data.error || "An assessment error occurred. Please retry.", "danger");
                    return;
                }

                showToast("Symptom assessment calculated successfully!");

                // Render Results Panel
                renderResults(data);

            } catch (err) {
                loadingModal.classList.add('hidden');
                showToast("Internal server connection failure.", "danger");
            }
        });
    }

    // --- RENDER CLASSIFICATION DATA ON THE PAGE ---
    function renderResults(data) {
        // Highlight card
        resultsCard.classList.remove('hidden');

        const topMatch = data.predictions[0];
        topDisease.textContent = topMatch.disease;
        topConfidence.textContent = `${topMatch.confidence.toFixed(1)}%`;

        // Cache last assessment in LocalStorage to feed context to chatbot
        localStorage.setItem('lastPrediction', JSON.stringify(topMatch));

        // Differential diagnoses cards compiling
        differentialList.innerHTML = '';
        data.predictions.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/10 hover:border-clinical-500/30 transition-all';
            
            const progressColor = index === 0 ? 'bg-clinical-500' : index === 1 ? 'bg-cyan-500' : 'bg-blue-500';
            
            card.innerHTML = `
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-slate-900 dark:text-white">${p.disease}</span>
                        <span class="text-xs font-semibold text-slate-500">${p.confidence.toFixed(1)}%</span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div class="h-full rounded-full ${progressColor}" style="width: ${p.confidence}%"></div>
                    </div>
                </div>
            `;
            differentialList.appendChild(card);
        });

        // Recommendations checklists
        recsPrecautions.innerHTML = data.recommendations.precautions
            .map(p => `<li>${p}</li>`).join('');

        recsMedicines.innerHTML = data.recommendations.medicines
            .map(m => `<li>${m}</li>`).join('');

        recsAdvice.textContent = data.recommendations.advice;

        // Force reload chart images by appending randomized caches parameter
        const bustCache = `?cb=${Date.now()}`;
        pieChartImg.src = `/static/charts/probability_pie.png${bustCache}`;
        barChartImg.src = `/static/charts/confidence_bar.png${bustCache}`;

        // Update PDF Download Anchor links
        pdfDownloadLink.href = `/api/download_report/${data.report_id}`;

        // Scroll gracefully to results card
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
