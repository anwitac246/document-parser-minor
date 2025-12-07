'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, X, FileText, Loader2, StopCircle } from 'lucide-react';

interface VoiceInterfaceProps {
  userId?: string;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ userId = 'user123' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Start recording user's voice
  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // Check if we have audio data
          if (audioChunksRef.current.length === 0) {
            setError('No audio recorded. Please try again.');
            setIsRecording(false);
            return;
          }

          const recordedAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Check blob size
          if (recordedAudioBlob.size === 0) {
            setError('Recording failed. Please try again.');
            setIsRecording(false);
            return;
          }

          console.log('Recorded audio size:', recordedAudioBlob.size);
          
          // Step 1: Transcribe audio
          await transcribeAudio(recordedAudioBlob);
        } catch (err) {
          console.error('Error in onstop:', err);
          setError('Failed to process recording');
          setIsRecording(false);
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscript('');
      setResponse('');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Please allow microphone access to use voice mode');
      alert('Please allow microphone access to use voice mode');
    }
  };

  // Stop recording when user clicks stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Failed to stop recording');
        setIsRecording(false);
      }
    }
  };

  // Step 1: Transcribe the audio to text
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      console.log('Sending audio for transcription...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('http://localhost:8000/voice/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const transcribedText = data.transcription;
      
      if (!transcribedText) {
        throw new Error('No transcription received');
      }

      setTranscript(transcribedText);
      console.log('Transcribed:', transcribedText);
      
      // Step 2: Now send to backend for analysis and get speech response
      await analyzeAndSpeak(transcribedText);
      
    } catch (error: any) {
      console.error('Transcription error:', error);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        setError('Network error. Is the backend running on port 8000?');
      } else {
        setError(`Transcription failed: ${error.message}`);
      }
      
      setIsProcessing(false);
    }
  };

  // Step 2: Send query + document to backend, get audio response
  const analyzeAndSpeak = async (query: string) => {
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('query', query);
      
      if (uploadedDoc) {
        formData.append('document', uploadedDoc);
      }

      console.log('Sending for analysis and TTS...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('http://localhost:8000/voice/analyze-and-speak', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      // Get response text from header
      const responseText = response.headers.get('X-Response-Text') || '';
      setResponse(responseText);

      // Get audio blob and play it
      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio response');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        // Wait for audio to be ready
        audioRef.current.oncanplaythrough = () => {
          audioRef.current?.play()
            .then(() => {
              setIsSpeaking(true);
              console.log('Playing audio response');
            })
            .catch(err => {
              console.error('Play error:', err);
              setError('Failed to play audio response');
            });
        };

        audioRef.current.onerror = (e) => {
          console.error('Audio error:', e);
          setError('Failed to load audio response');
        };
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        setError('Network error. Is the backend running?');
      } else {
        setError(`Analysis failed: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Stop bot from speaking
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadedDoc(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedDoc(files[0]);
    }
  };

  const removeDocument = () => {
    setUploadedDoc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        className="hidden"
      />

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-2xl relative z-10">
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-200 text-sm font-medium">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Document Upload Area */}
        {!uploadedDoc ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-8 p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
              isDragging
                ? 'border-cyan-400 bg-cyan-400/10 scale-105'
                : 'border-gray-600/50 bg-gray-800/20 hover:border-cyan-500/50 hover:bg-cyan-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-cyan-400/70" />
              <p className="text-cyan-100 text-lg font-light">
                Drop document here or click to upload
              </p>
              <p className="text-gray-400 text-sm">
                PDF, DOCX, or Images supported
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-linear-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-cyan-100 font-medium truncate max-w-md">
                    {uploadedDoc.name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {(uploadedDoc.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={removeDocument}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Main Voice Orb */}
        <div className="flex flex-col items-center justify-center mb-8">
          
          {/* Glowing Halo with Waves */}
          <div className="relative w-80 h-80 flex items-center justify-center">
            
            {/* Outer glow rings */}
            {[...Array(3)].map((_, i) => (
              <div
                key={`outer-${i}`}
                className={`absolute rounded-full ${
                  isRecording 
                    ? 'bg-linear-to-r from-red-500/20 to-pink-500/20' 
                    : isSpeaking
                    ? 'bg-linear-to-r from-blue-500/20 to-purple-500/20'
                    : isProcessing
                    ? 'bg-linear-to-r from-purple-500/20 to-cyan-500/20'
                    : 'bg-linear-to-r from-cyan-500/10 to-purple-500/10'
                }`}
                style={{
                  width: `${280 + i * 40}px`,
                  height: `${280 + i * 40}px`,
                  animation: (isRecording || isSpeaking || isProcessing) 
                    ? `pulse-ring ${2 + i * 0.5}s ease-in-out infinite` 
                    : 'none',
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}

            {/* Main glowing orb */}
            <div 
              className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'shadow-[0_0_80px_rgba(239,68,68,0.6)]'
                  : isSpeaking
                  ? 'shadow-[0_0_80px_rgba(59,130,246,0.6)]'
                  : isProcessing
                  ? 'shadow-[0_0_80px_rgba(168,85,247,0.6)]'
                  : 'shadow-[0_0_60px_rgba(34,211,238,0.4)]'
              }`}
              style={{
                background: isRecording
                  ? 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.1) 50%, transparent 100%)'
                  : isSpeaking
                  ? 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.1) 50%, transparent 100%)'
                  : isProcessing
                  ? 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(147,51,234,0.1) 50%, transparent 100%)'
                  : 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, rgba(168,85,247,0.1) 50%, transparent 100%)',
                border: `2px solid ${
                  isRecording ? 'rgba(239,68,68,0.5)' : 
                  isSpeaking ? 'rgba(59,130,246,0.5)' :
                  isProcessing ? 'rgba(168,85,247,0.5)' :
                  'rgba(34,211,238,0.3)'
                }`
              }}
            >
              
              {/* Waveform visualization */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isRecording ? "#ef4444" : isSpeaking ? "#3b82f6" : "#22d3ee"} stopOpacity="0.8" />
                    <stop offset="50%" stopColor={isRecording ? "#ec4899" : isSpeaking ? "#8b5cf6" : "#8b5cf6"} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={isRecording ? "#ef4444" : isSpeaking ? "#3b82f6" : "#22d3ee"} stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                
                {(isRecording || isSpeaking) && (
                  <>
                    <path
                      d="M20,100 Q60,80 100,100 T180,100"
                      fill="none"
                      stroke="url(#wave-gradient)"
                      strokeWidth="2"
                      opacity="0.6"
                      style={{
                        animation: 'wave-flow 2s ease-in-out infinite'
                      }}
                    />
                    <path
                      d="M20,100 Q60,120 100,100 T180,100"
                      fill="none"
                      stroke="url(#wave-gradient)"
                      strokeWidth="2"
                      opacity="0.4"
                      style={{
                        animation: 'wave-flow 2.5s ease-in-out infinite reverse'
                      }}
                    />
                  </>
                )}
              </svg>

              {/* Status text */}
              <div className="relative z-10 text-center px-8">
                {transcript && (
                  <p className="text-cyan-100 text-xs font-light tracking-wider mb-2 line-clamp-2">
                    {transcript}
                  </p>
                )}
                <p className="text-cyan-400 text-2xl font-light">
                  {isRecording
                    ? 'Listening...'
                    : isProcessing
                    ? 'Processing...'
                    : isSpeaking
                    ? 'Speaking...'
                    : 'Tap to speak'}
                </p>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4 mt-8">
            {/* Main Mic/Stop Button */}
            {!isSpeaking ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-linear-to-br from-red-500 to-pink-600 shadow-[0_0_40px_rgba(239,68,68,0.6)]'
                    : isProcessing
                    ? 'bg-linear-to-br from-purple-500 to-purple-600'
                    : 'bg-linear-to-br from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : isRecording ? (
                  <Square className="w-6 h-6 text-white" fill="white" />
                ) : (
                  <Mic className="w-7 h-7 text-white" />
                )}
              </button>
            ) : (
              /* Stop Speaking Button */
              <button
                onClick={stopSpeaking}
                className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 bg-linear-to-br from-red-500 to-red-600 shadow-[0_0_40px_rgba(239,68,68,0.6)]"
              >
                <StopCircle className="w-7 h-7 text-white" fill="white" />
              </button>
            )}
          </div>
        </div>

        {/* Response Text Display */}
        {response && (
          <div className="mt-6 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-cyan-500/20">
            <p className="text-cyan-100 text-sm leading-relaxed">
              {response}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center space-y-2 mt-8">
          <p className="text-gray-400 text-sm">
            {uploadedDoc 
              ? 'Document loaded. Record your question.'
              : 'Upload a document (optional) and start speaking'}
          </p>
          <p className="text-gray-500 text-xs">
            Click stop when you finish speaking
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes wave-flow {
          0%, 100% {
            d: path("M20,100 Q60,80 100,100 T180,100");
          }
          50% {
            d: path("M20,100 Q60,120 100,100 T180,100");
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceInterface;