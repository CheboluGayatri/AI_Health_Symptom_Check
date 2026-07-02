# -*- coding: utf-8 -*-
"""
voice_input.py

Purpose:
    Provides Python-side speech-to-text integration mappings.
    Since standard desktop libraries like SpeechRecognition and PyAudio require
    physical audio hardware/microphones and fail inside headless Cloud Run servers,
    this module acts as a robust service interface.
    The actual real-time voice recognition is executed in the browser using the
    Web Speech API (see static/js/voice.js), which is standard for web apps.
"""

import sys

def convert_speech_to_symptom():
    """
    Subprocess hook to test/simulate microphone parsing.
    Returns simulated speech text to test offline flows safely.
    """
    print("Voice Recognition Subsystem: Standing by for hardware inputs...")
    # Return a simulated symptom phrase to verify processing pipelines
    return "itching skin rash headache"

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--simulate":
        print(convert_speech_to_symptom())
    else:
        print("Speech recognition module active.")
