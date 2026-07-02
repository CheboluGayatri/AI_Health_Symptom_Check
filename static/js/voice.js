/**
 * voice.js
 * 
 * Purpose:
 *     Implements real-time vocal command dictation using the Web Speech API.
 *     Allows hands-free symptom checking directly in-browser.
 *     Matches spoken keywords against the list of available checkboxes.
 */

document.addEventListener('DOMContentLoaded', () => {
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceStatusText = document.getElementById('voiceStatusText');
    const micIcon = document.getElementById('micIcon');
    const symptomCheckboxes = document.querySelectorAll('.symptom-checkbox');

    if (!voiceBtn) return;

    // Check if browser supports speech recognition natively
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.classList.add('opacity-50', 'cursor-not-allowed');
        voiceBtn.title = "Web Speech API is not supported in this browser version.";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isListening = false;

    voiceBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        isListening = true;
        voiceStatus.classList.remove('hidden');
        voiceStatusText.textContent = "Listening carefully... Dictate symptoms (e.g. fever, rash, itching).";
        voiceBtn.classList.add('bg-rose-500/10', 'text-rose-500', 'border-rose-500/20');
        micIcon.setAttribute('data-lucide', 'mic-off');
        lucide.createIcons();
    };

    recognition.onend = () => {
        isListening = false;
        voiceStatus.classList.add('hidden');
        voiceBtn.classList.remove('bg-rose-500/10', 'text-rose-500', 'border-rose-500/20');
        micIcon.setAttribute('data-lucide', 'mic');
        lucide.createIcons();
    };

    recognition.onerror = () => {
        isListening = false;
        voiceStatusText.textContent = "Could not register speech. Please try again.";
        setTimeout(() => voiceStatus.classList.add('hidden'), 3000);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Voice Dictation Parsed:", transcript);

        let matchCount = 0;
        symptomCheckboxes.forEach(cb => {
            const symptomVal = cb.value.replace(/_/g, ' ');
            // Look for matching strings or variations
            if (transcript.includes(symptomVal)) {
                if (!cb.checked) {
                    cb.checked = true;
                    matchCount++;
                }
            }
        });

        // Trigger update badges on script.js
        if (matchCount > 0) {
            const eventTrigger = new Event('change');
            symptomCheckboxes.forEach(cb => cb.dispatchEvent(eventTrigger));
            
            // Fire Toast Notification
            const scriptModule = window.scriptModule || {};
            const showToast = window.showToast || console.log;
            showToast(`Auto-selected ${matchCount} symptoms from voice input!`);
        } else {
            // Try fallback fuzzy matches
            showToast("Speech captured, but no correlating symptoms matched. Try clear speaking.", "danger");
        }
    };
});
