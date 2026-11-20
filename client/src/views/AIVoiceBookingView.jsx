import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Building,
  Check,
  Send,
  HelpCircle,
  Edit3,
  Globe,
  Printer,
  Radio,
  Play,
  RotateCcw,
  XCircle,
  FileText,
  Users,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import BookingReceiptModal from '../components/BookingReceiptModal';

// 8 Explicit Application States
const STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  DETAILS_DETECTED: 'DETAILS_DETECTED',
  CHECKING_AVAILABILITY: 'CHECKING_AVAILABILITY',
  WAITING_FOR_CONFIRMATION: 'WAITING_FOR_CONFIRMATION',
  BOOKING_SUCCESS: 'BOOKING_SUCCESS',
  ERROR: 'ERROR'
};

export default function AIVoiceBookingView({ user, onBookingSuccess, onBackToDashboard }) {
  const [currentState, setCurrentState] = useState(STATES.IDLE);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [bookedSlot, setBookedSlot] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [profile, setProfile] = useState(null);
  const [allVenues, setAllVenues] = useState([]);
  const [selectedLang, setSelectedLang] = useState('en-IN'); // 'en-IN' or 'ta-IN'

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    venue_id: '',
    date: '',
    start_time: '',
    end_time: '',
    programme_name: ''
  });

  // Multi-turn conversational entity state
  const [accumulatedEntities, setAccumulatedEntities] = useState({});

  // Refs for rock-solid speech recognition lifecycle without closure staleness
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);
  const silenceTimeoutRef = useRef(null);
  const stateRef = useRef(STATES.IDLE);
  const resultRef = useRef(null);

  // Sync state ref
  useEffect(() => {
    stateRef.current = currentState;
  }, [currentState]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const cleanupRecognition = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
  };

  useEffect(() => {
    let isMounted = true;

    api.getCollegeProfile()
      .then(p => { if (isMounted && p) setProfile(p); })
      .catch(() => {});

    api.getVenues()
      .then(v => {
        if (isMounted) {
          setAllVenues(Array.isArray(v) ? v : []);
        }
      })
      .catch(() => {
        if (isMounted) setAllVenues([]);
      });

    const handleVoices = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
    };
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = handleVoices;
      handleVoices();
    }

    return () => {
      isMounted = false;
      cleanupRecognition();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text to Speech synthesis in the detected language
  const speakText = (text, lang = 'en') => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';

      const voices = window.speechSynthesis.getVoices();
      if (lang === 'ta') {
        const tamilVoice = voices.find(v => v.lang.includes('ta') || v.name.toLowerCase().includes('tamil'));
        if (tamilVoice) utterance.voice = tamilVoice;
      } else {
        const indianVoice = voices.find(v => v.lang.includes('en-IN') || v.name.toLowerCase().includes('india'));
        if (indianVoice) utterance.voice = indianVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS playback error:', e);
    }
  };

  const startListening = () => {
    setErrorMessage('');
    setInterimText('');
    transcriptRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCurrentState(STATES.ERROR);
      setErrorMessage('Speech recognition is not natively supported in this browser. Please use Google Chrome or Microsoft Edge, or type your request below.');
      return;
    }

    // Stop any existing recognition instance cleanly
    cleanupRecognition();

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setCurrentState(STATES.LISTENING);
      };

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += ' ' + t;
          } else {
            interimChunk += t;
          }
        }

        const currentCombined = (transcriptRef.current + ' ' + finalChunk + ' ' + interimChunk).replace(/\s+/g, ' ').trim();
        if (finalChunk.trim()) {
          transcriptRef.current = (transcriptRef.current + ' ' + finalChunk).replace(/\s+/g, ' ').trim();
        }

        setInterimText(currentCombined);
        setSpeechTranscript(currentCombined);
        setInputText(currentCombined);

        // Reset 3.0-second silence timer to auto-process speech naturally without cutting user off
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && currentCombined) {
            stopListening(true);
          }
        }, 3000);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'no-speech') {
          // If some speech was already recognized, proceed with it
          if (transcriptRef.current || interimText) {
            stopListening(true);
            return;
          }
          setErrorMessage('No voice detected. Please speak closer to your microphone or click one of the sample test prompts.');
          isListeningRef.current = false;
          setCurrentState(STATES.IDLE);
        } else if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please click the lock 🔒 icon in your browser address bar to allow Microphone.');
          isListeningRef.current = false;
          setCurrentState(STATES.ERROR);
        } else if (event.error === 'network') {
          setErrorMessage('Speech service network timeout. You can use the instant prompt buttons or type your request.');
          isListeningRef.current = false;
          setCurrentState(STATES.IDLE);
        } else {
          setErrorMessage(`Microphone notice: ${event.error}. You can also type or use the test prompt chips below.`);
          isListeningRef.current = false;
          setCurrentState(STATES.IDLE);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        const textToProcess = (transcriptRef.current || interimText || inputText).trim();
        if (textToProcess && stateRef.current === STATES.LISTENING) {
          handleProcessVoice(textToProcess);
        } else if (stateRef.current === STATES.LISTENING) {
          setCurrentState(STATES.IDLE);
        }
      };

      recognition.start();
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already started')) {
        isListeningRef.current = true;
        setCurrentState(STATES.LISTENING);
        return;
      }
      isListeningRef.current = false;
      setCurrentState(STATES.ERROR);
      setErrorMessage('Could not initialize speech recognition: ' + err.message);
    }
  };

  const stopListening = (shouldProcess = true) => {
    const textToRun = (transcriptRef.current || interimText || inputText || speechTranscript).trim();
    cleanupRecognition();

    if (shouldProcess && textToRun) {
      handleProcessVoice(textToRun);
    } else {
      setCurrentState(STATES.IDLE);
    }
  };

  const toggleListening = () => {
    if (currentState === STATES.LISTENING || isListeningRef.current) {
      stopListening(true);
    } else {
      startListening();
    }
  };

  // Main Voice NLP Processor
  const handleProcessVoice = async (textToProcess) => {
    const query = (textToProcess || inputText || transcriptRef.current).trim();
    if (!query) return;

    // Flexible affirmative & confirmation matcher
    const lowerQuery = query.toLowerCase().trim();
    const isAffirmative = (
      /\b(yes|confirm|proceed|sure|ok|okay|book|agree|correct|fine|go ahead|accept|approved|done|yep|yeah)\b/i.test(lowerQuery) ||
      /\b(aama|aamaa|ama|amaa|pannunga|pannidunga|pannalam|seri|sari|podhum|kandippa|kandippaga)\b/i.test(lowerQuery) ||
      /(ஆம்|உறுதி|செய்|சரி|சரிங்க|முன்பதிவு\s*செய்|உறுதிப்படுத்து|உறுதிப்படுத்துங்கள்|உறுதிப்படுத்துகிறேன்|பண்ணுங்க)/.test(query)
    ) && !/\b(auditorium|hall|ramanujan|cunnan|rjb)\b/i.test(lowerQuery);

    const isNegative = /\b(no|cancel|stop|don't|dont|change|edit|illa|illai|vendam|veandam|வேண்டாம்|ரத்து)\b/i.test(lowerQuery);

    const activeResult = resultRef.current || result;
    if (activeResult && activeResult.isComplete && !activeResult.extracted?.hasConflict && isAffirmative && (stateRef.current === STATES.WAITING_FOR_CONFIRMATION || currentState === STATES.WAITING_FOR_CONFIRMATION)) {
      handleConfirmBooking();
      return;
    }

    if (activeResult && isNegative && (stateRef.current === STATES.WAITING_FOR_CONFIRMATION || currentState === STATES.WAITING_FOR_CONFIRMATION)) {
      handleReset();
      const cancelMsg = selectedLang === 'ta-IN' ? 'முன்பதிவு ரத்து செய்யப்பட்டது. புதிய அரங்க கோரிக்கையை தெரிவிக்கலாம்.' : 'Booking cancelled. What venue would you like to book?';
      speakText(cancelMsg, selectedLang === 'ta-IN' ? 'ta' : 'en');
      return;
    }

    setCurrentState(STATES.PROCESSING);
    setErrorMessage('');
    setIsEditing(false);
    setBookedSlot(null);

    try {
      const data = await api.processVoice(query, user?.department_id, accumulatedEntities);
      setResult(data);
      resultRef.current = data;

      if (data.extracted) {
        // Multi-turn context accumulation
        const updatedEntities = {
          date: data.extracted.date || accumulatedEntities.date,
          startTime: data.extracted.startTime || accumulatedEntities.startTime,
          endTime: data.extracted.endTime || accumulatedEntities.endTime,
          requestedVenue: data.extracted.requestedVenue || accumulatedEntities.requestedVenue,
          department: data.extracted.department || accumulatedEntities.department,
          programmeName: data.extracted.programmeName || accumulatedEntities.programmeName,
          programmeType: data.extracted.programmeType || accumulatedEntities.programmeType,
          expectedParticipants: data.extracted.expectedParticipants || accumulatedEntities.expectedParticipants || 60
        };
        setAccumulatedEntities(updatedEntities);

        setEditForm({
          venue_id: data.extracted.requestedVenue?.id || updatedEntities.requestedVenue?.id || '',
          date: data.extracted.date || updatedEntities.date || '',
          start_time: data.extracted.startTime || updatedEntities.startTime || '',
          end_time: data.extracted.endTime || updatedEntities.endTime || '',
          programme_name: data.extracted.programmeName || updatedEntities.programmeName || 'Department Academic Event'
        });
      }

      // Spoken response in detected language
      if (data.voiceResponse) {
        speakText(data.voiceResponse, data.detectedLanguage);
      }

      // Transition to next state based on analysis result
      if (data.missingFields && data.missingFields.length > 0) {
        setCurrentState(STATES.DETAILS_DETECTED);
      } else {
        setCurrentState(STATES.WAITING_FOR_CONFIRMATION);
      }
    } catch (err) {
      setCurrentState(STATES.ERROR);
      setErrorMessage(err.message || 'Voice processing failed. Please check network or try again.');
    }
  };

  // Confirm booking in SQLite database
  const handleConfirmBooking = async (overrideVenue = null) => {
    const activeResult = resultRef.current || result;
    if (!activeResult || !activeResult.extracted) return;
    const { date, startTime, endTime, department, requestedVenue, alternativeVenue, hasConflict, programmeName, programmeType, expectedParticipants } = activeResult.extracted;

    const targetVenue = overrideVenue || (hasConflict ? alternativeVenue : requestedVenue);
    if (!targetVenue || !targetVenue.id) {
      setErrorMessage('Please select a valid venue to proceed with booking.');
      return;
    }

    setCurrentState(STATES.CHECKING_AVAILABILITY);
    setErrorMessage('');

    try {
      const payload = {
        department_id: department?.id || user?.department_id,
        venue_id: isEditing ? editForm.venue_id : targetVenue.id,
        date: isEditing ? editForm.date : date,
        start_time: isEditing ? editForm.start_time : startTime,
        end_time: isEditing ? editForm.end_time : endTime,
        programme_name: (isEditing ? editForm.programme_name : programmeName) || 'Department Academic Event',
        programme_type: programmeType || 'Seminar',
        description: `Natural language voice booking: "${activeResult.rawSpeech || speechTranscript || 'Voice Booking'}"`,
        expected_participants: expectedParticipants || 60,
        requirements: ['Projector', 'PA Sound System', 'Podium Mic', 'Wi-Fi'],
        coordinator_name: user?.user_name || 'Department Faculty Coordinator',
        coordinator_phone: user?.contact_number || '044-26850621',
        coordinator_email: user?.email || 'drbccchinducollege@yahoo.co.in'
      };

      const res = await api.createBooking(payload);
      setBookedSlot(res.booking);
      setIsEditing(false);
      setAccumulatedEntities({});
      setCurrentState(STATES.BOOKING_SUCCESS);

      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch (err) {}

      const confirmMsg = activeResult.detectedLanguage === 'ta'
        ? `உங்கள் முன்பதிவு உறுதி செய்யப்பட்டது. முன்பதிவு எண் ${res.booking.booking_id}.`
        : activeResult.detectedLanguage === 'tanglish'
        ? `Booking confirmed! Ungaloda Booking ID: ${res.booking.booking_id}.`
        : `Your booking has been confirmed! Booking ID is ${res.booking.booking_id}.`;

      speakText(confirmMsg, activeResult.detectedLanguage);
    } catch (err) {
      setCurrentState(STATES.ERROR);
      setErrorMessage(err.message || 'Could not complete booking.');
    }
  };

  const handleReset = () => {
    cleanupRecognition();
    setCurrentState(STATES.IDLE);
    setSpeechTranscript('');
    setInterimText('');
    setInputText('');
    setResult(null);
    resultRef.current = null;
    setErrorMessage('');
    setBookedSlot(null);
    setIsEditing(false);
    setAccumulatedEntities({});
  };

  const venuesList = Array.isArray(allVenues) ? allVenues : [];
  const missingFieldsList = Array.isArray(result?.missingFields) ? result.missingFields : [];
  const alternativesList = Array.isArray(result?.alternatives) ? result.alternatives : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation & Status Badge Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Dashboard</span>
        </button>

        {/* State Indicator Pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs transition-colors bg-white border-slate-200 text-slate-700">
            <span className={`w-2 h-2 rounded-full ${
              currentState === STATES.LISTENING ? 'bg-rose-500 animate-ping' :
              currentState === STATES.PROCESSING || currentState === STATES.CHECKING_AVAILABILITY ? 'bg-amber-500 animate-pulse' :
              currentState === STATES.BOOKING_SUCCESS ? 'bg-emerald-500' :
              currentState === STATES.ERROR ? 'bg-rose-500' :
              'bg-blue-500'
            }`} />
            <span>State: <strong>{currentState}</strong></span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>English &bull; தமிழ் &bull; Tanglish</span>
          </div>
        </div>
      </div>

      {/* Hero Header & Voice Interaction Panel */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-blue-200 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Intelligent Natural Language Processing (NLP) Hall Booking</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Book Any College Hall with Voice
        </h2>
        <p className="text-xs sm:text-sm text-blue-200 max-w-xl mx-auto">
          Speak naturally in English, தமிழ், or Tanglish. Our AI detects your target venue, resolves dates, checks live collisions, and confirms bookings instantly.
        </p>

        {/* Language Selection Mode Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-xs text-blue-300 font-semibold">Speech Recognition Mode:</span>
          <button
            type="button"
            onClick={() => {
              const wasListening = isListeningRef.current || currentState === STATES.LISTENING;
              setSelectedLang('en-IN');
              cleanupRecognition();
              if (wasListening) {
                setTimeout(() => startListening(), 100);
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedLang === 'en-IN' ? 'bg-white text-blue-900 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🇮🇳 English / Tanglish
          </button>
          <button
            type="button"
            onClick={() => {
              const wasListening = isListeningRef.current || currentState === STATES.LISTENING;
              setSelectedLang('ta-IN');
              cleanupRecognition();
              if (wasListening) {
                setTimeout(() => startListening(), 100);
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedLang === 'ta-IN' ? 'bg-white text-blue-900 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🇮🇳 தமிழ் (Tamil)
          </button>
        </div>

        {/* Central Microphone Button & Live Wave Animation */}
        <div className="pt-4 pb-2 space-y-3">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-300 shadow-2xl ${
              currentState === STATES.LISTENING
                ? 'bg-rose-500 text-white voice-pulse scale-110 shadow-rose-500/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 shadow-blue-600/50'
            }`}
            title={currentState === STATES.LISTENING ? 'Listening... Click to finish speaking' : 'Click to Speak'}
          >
            {currentState === STATES.LISTENING ? (
              <MicOff className="w-10 h-10 animate-pulse" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>

          {/* Equalizer Visualizer during LISTENING */}
          {currentState === STATES.LISTENING && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-center gap-1.5 h-8">
                {[12, 24, 32, 20, 28, 16, 24].map((height, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${height}px`,
                      animationDuration: `${0.4 + (idx % 3) * 0.2}s`
                    }}
                  />
                ))}
              </div>
              <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Microphone Active &bull; Speak naturally now...</span>
              </div>
            </div>
          )}

          {/* Live Interim Transcript Display */}
          {currentState === STATES.LISTENING && interimText && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center max-w-lg mx-auto animate-in fade-in duration-200">
              <div className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                Recognizing Speech:
              </div>
              <p className="text-sm font-black text-white mt-1">
                "{interimText}"
              </p>
            </div>
          )}

          {/* Start / Stop Control Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {currentState === STATES.LISTENING ? (
              <button
                type="button"
                onClick={() => stopListening(true)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish Speaking & Process</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startListening}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Mic className="w-4 h-4" />
                <span>Start Listening</span>
              </button>
            )}

            {(result || currentState !== STATES.IDLE) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Processing Spinner Indicator */}
      {(currentState === STATES.PROCESSING || currentState === STATES.CHECKING_AVAILABILITY) && (
        <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-md text-center space-y-3 animate-in fade-in">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-800">
            {currentState === STATES.PROCESSING
              ? 'Analyzing Natural Language & College Hall Entities...'
              : 'Checking live college hall collision schedules in SQLite...'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {speechTranscript || inputText || 'Processing voice request...'}
          </div>
        </div>
      )}

      {/* Error Banner with Retry Button */}
      {currentState === STATES.ERROR && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage || 'An error occurred during voice booking.'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startListening}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
            >
              Retry Microphone
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 font-bold text-xs rounded-lg hover:bg-rose-50 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Natural Language Voice NLP Input & Test Chips */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessVoice(inputText);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. Book Ramanujan Conference Hall tomorrow 10 AM to 1 PM for Department Technical Symposium"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={currentState === STATES.PROCESSING || currentState === STATES.CHECKING_AVAILABILITY}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Process</span>
          </button>
        </form>

        {/* Multilingual Sample Chips */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Sample Voice Prompts (Click any chip to test Instant NLP processing):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                lang: 'Tanglish',
                text: 'Computer Science with AI department-ku September 18, 10 AM to 1 PM Auditorium book pannunum.'
              },
              {
                lang: 'English',
                text: 'Book Ramanujan Conference Hall for AI Workshop on 18 September 10 AM to 1 PM.'
              },
              {
                lang: 'English',
                text: 'Reserve Cunnan Conference Hall on September 22 from 10 AM to 1 PM.'
              },
              {
                lang: 'தமிழ்',
                text: 'செப்டம்பர் 25 அன்று இயற்பியல் துறைக்கு RJB Hall காலை 10 மணி முதல் 1 மணி வரை புக் செய்யவும்.'
              },
              {
                lang: 'English',
                text: 'Book RJB Hall tomorrow 10 AM to 1 PM for Department Meeting.'
              },
              {
                lang: 'தமிழ்',
                text: 'குன்னன் ஆடிட்டோரியம் அக்டோபர் 12 காலை 10 மணி முதல் 1 மணி வரை முன்பதிவு செய்யவும்.'
              }
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setInputText(p.text);
                  setSpeechTranscript(p.text);
                  handleProcessVoice(p.text);
                }}
                className="text-left text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-800 p-2.5 rounded-xl transition font-medium flex items-start gap-2 group shadow-xs"
              >
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold flex-shrink-0 mt-0.5">
                  {p.lang}
                </span>
                <span className="flex-1 group-hover:text-blue-900 leading-snug">"{p.text}"</span>
                <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Interpretation Result Card */}
      {result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  AI Voice Interpretation
                </span>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Language: {result.detectedLanguage === 'ta' ? 'தமிழ் (Tamil)' : result.detectedLanguage === 'tanglish' ? 'Tanglish' : 'English'}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Spoken Request Analysis
              </h3>
            </div>

            <button
              onClick={() => speakText(result.voiceResponse, result.detectedLanguage)}
              className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
              title="Re-play Audio Response"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen</span>
            </button>
          </div>

          {/* Spoken Audio Response Box */}
          <div className="p-4 bg-blue-950 text-white rounded-2xl space-y-1 shadow-inner border border-blue-900">
            <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-blue-300" />
              Spoken Response (Same Language Family)
            </div>
            <p className="text-sm font-semibold leading-relaxed">
              "{result.voiceResponse}"
            </p>
          </div>

          {/* Follow-up question if details are missing */}
          {missingFieldsList.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Missing Details Required: {missingFieldsList.join(', ')}</span>
              </div>
              <p className="text-xs text-amber-800">
                <strong>Follow-up:</strong> {result.followUpQuestion}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={startListening}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Speak Missing Detail</span>
                </button>
              </div>
            </div>
          )}

          {/* Conflict Detected Alert & Alternative Hall Recommendation */}
          {result.extracted?.hasConflict && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Hall Conflict: {result.extracted.requestedVenue?.name || 'Requested hall'} is already occupied for the requested slot.</span>
              </div>
              {result.extracted.conflictingBooking && (
                <div className="text-xs text-rose-800 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                  Occupied by: <strong>{result.extracted.conflictingBooking.department_name}</strong> for "{result.extracted.conflictingBooking.programme_name}" ({result.extracted.conflictingBooking.start_time} - {result.extracted.conflictingBooking.end_time})
                </div>
              )}

              {alternativesList.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-slate-800">Available Alternative Venues for the Same Slot:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {alternativesList.map(alt => (
                      <button
                        key={alt.id}
                        onClick={() => handleConfirmBooking(alt)}
                        className="p-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl text-left transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-extrabold text-xs text-slate-900">{alt.venue_name}</div>
                          <div className="text-[11px] text-slate-500">Capacity: {alt.capacity} seats</div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          Book This Hall
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Structured Interpretation & Confirmation Summary */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                Structured Booking Details & Confirmation Summary
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : '[EDIT DETAILS]'}</span>
              </button>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Venue</label>
                  <select
                    value={editForm.venue_id}
                    onChange={(e) => setEditForm({ ...editForm, venue_id: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="">Select Venue</option>
                    {venuesList.map(v => (
                      <option key={v.id} value={v.id}>{v.venue_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">End Time</label>
                  <input
                    type="text"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Programme Title</label>
                  <input
                    type="text"
                    value={editForm.programme_name}
                    onChange={(e) => setEditForm({ ...editForm, programme_name: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Venue</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">
                    {result.extracted?.requestedVenue?.name || 'Not specified'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Target Date</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">
                    {result.extracted?.date || 'Not specified'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Time Slot</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">
                    {result.extracted?.startTime && result.extracted?.endTime
                      ? `${result.extracted.startTime} - ${result.extracted.endTime}`
                      : 'Not specified'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Department</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">
                    {result.extracted?.department?.code || user?.department_code || 'CSA'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Confirm Booking, Edit Details, Cancel, Retry */}
          {!bookedSlot ? (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleConfirmBooking()}
                disabled={currentState === STATES.CHECKING_AVAILABILITY || (!isEditing && result.extracted?.hasConflict)}
                className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {currentState === STATES.CHECKING_AVAILABILITY ? 'Checking & Booking...' : 'Confirm Booking'}
                </span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>{isEditing ? 'Save Edits' : 'Edit Details'}</span>
              </button>

              <button
                onClick={handleReset}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                title="Cancel voice booking"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              <button
                onClick={startListening}
                className="py-3.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                title="Retry voice input"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            /* Booking Success Card */
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-3 animate-in fade-in">
              <div className="font-black text-sm flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                Booking Confirmed Immediately in Database!
              </div>
              <div className="text-xs">
                Permanent Booking Code: <strong className="font-mono text-emerald-800 text-sm">{bookedSlot.booking_id}</strong> &bull; Venue: {bookedSlot.venue_name} &bull; Date: {bookedSlot.date} ({bookedSlot.start_time} - {bookedSlot.end_time})
              </div>
              <div className="text-xs text-emerald-700">
                Official booking confirmation email has been dispatched to {user?.email || 'registered department email'}.
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => setShowReceipt(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>View & Print Official Receipt</span>
                </button>
                <button
                  onClick={onBookingSuccess}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                >
                  View in Programme History
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-xl transition"
                >
                  Book Another Hall
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Booking Receipt Modal */}
      {showReceipt && bookedSlot && (
        <BookingReceiptModal
          booking={bookedSlot}
          profile={profile}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}