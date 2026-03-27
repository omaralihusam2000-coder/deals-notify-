/**
 * voice-search.js — Voice Search using Web Speech API
 * Adds a microphone button next to the search input.
 * Transcribes speech and fills the search input.
 */

const VoiceSearchModule = (() => {
  let recognition = null;
  let isListening = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function isSupported() {
    return !!SpeechRecognition;
  }

  function createMicButton() {
    const btn = document.createElement('button');
    btn.id = 'voice-search-btn';
    btn.className = 'voice-search-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', isSupported() ? 'Search by voice' : 'Voice search not supported');
    btn.setAttribute('title', isSupported() ? 'Click to search by voice' : 'Voice search is not supported in this browser');
    btn.innerHTML = '<span class="voice-mic-icon" aria-hidden="true">🎙️</span>';
    if (!isSupported()) {
      btn.disabled = true;
      btn.style.opacity = '0.4';
    }
    return btn;
  }

  function startListening() {
    if (!isSupported() || isListening) return;

    recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang || 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const btn = document.getElementById('voice-search-btn');
    if (btn) {
      btn.classList.add('voice-search-btn--listening');
      btn.setAttribute('aria-label', 'Listening… click to stop');
    }

    showToast('🎙️ Listening… Speak now!', 'info');
    isListening = true;

    recognition.onresult = (e) => {
      const transcript = [...e.results]
        .map(r => r[0].transcript)
        .join('');
      const input = document.getElementById('search-input');
      if (input) input.value = transcript;
    };

    recognition.onend = () => {
      isListening = false;
      const btn = document.getElementById('voice-search-btn');
      if (btn) {
        btn.classList.remove('voice-search-btn--listening');
        btn.setAttribute('aria-label', 'Search by voice');
      }
      // Trigger search with final transcript
      const input = document.getElementById('search-input');
      if (input && input.value.trim()) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        showToast(`🎙️ Searching: "${input.value}"`, 'success');
      }
    };

    recognition.onerror = (e) => {
      isListening = false;
      const btn = document.getElementById('voice-search-btn');
      if (btn) {
        btn.classList.remove('voice-search-btn--listening');
        btn.setAttribute('aria-label', 'Search by voice');
      }
      if (e.error === 'not-allowed') {
        showToast('🎙️ Microphone access denied. Please allow microphone access.', 'error');
      } else if (e.error === 'no-speech') {
        showToast('🎙️ No speech detected. Try again.', 'warning');
      } else {
        showToast('🎙️ Voice search error. Try again.', 'error');
      }
    };

    recognition.start();
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
    }
  }

  function toggleListening() {
    if (isListening) stopListening();
    else startListening();
  }

  function init() {
    const wrapper = document.querySelector('.search-input-wrapper');
    if (!wrapper) return;

    // Only add if not already present
    if (document.getElementById('voice-search-btn')) return;

    const btn = createMicButton();
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleListening();
    });

    wrapper.appendChild(btn);

    if (!isSupported()) {
      btn.setAttribute('title', 'Voice search is not supported in this browser');
    }
  }

  return { init, startListening, stopListening, isSupported };
})();

document.addEventListener('DOMContentLoaded', () => VoiceSearchModule.init());
