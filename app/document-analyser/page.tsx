'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send, Mic, MicOff, Upload, File, Volume2, VolumeX,
  Bot, Trash2, Moon, Sun, LogOut, Menu, MessageCirclePlus,
  Copy, Check, Link as LinkIcon
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database } from '../../firebase-config';
import { ref, push, onValue, remove, set } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import gradientLoadingAnimation from '@/public/assets/Gradient Loading.json';

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
  file?: { name: string; type: string };
  terms?: { [key: string]: { definition: string; context?: string } };
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface MarkdownRendererProps {
  content: string;
  darkMode: boolean;
  glossaryTerms?: { [key: string]: { definition: string; context?: string } };
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, darkMode, glossaryTerms = {} }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const highlightLegalTerms = (text: string): string => {
    let highlightedText = text;
    
    Object.keys(glossaryTerms).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, 
        `<span class="legal-term cursor-help border-b-2 border-dotted border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900" data-term="${term}">$&</span>`
      );
    });
    
    return highlightedText;
  };

  const formatTextMarkdown = (text: string, darkMode: boolean): string => {
    return text
      .replace(/^### (.*$)/gm, `<h3 class="text-lg font-semibold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}">$1</h3>`)
      .replace(/^## (.*$)/gm, `<h2 class="text-xl font-semibold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}">$1</h2>`)
      .replace(/^# (.*$)/gm, `<h1 class="text-2xl font-bold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}">$1</h1>`)
      .replace(/\*\*(.*?)\*\*/g, `<strong class="${darkMode ? 'text-white' : 'text-gray-900'}">$1</strong>`)
      .replace(/\*(.*?)\*/g, `<em class="${darkMode ? 'text-gray-200' : 'text-gray-700'}">$1</em>`)
      .replace(/`([^`]+)`/g, `<code class="px-1 py-0.5 rounded text-sm ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} font-mono">$1</code>`)
      .replace(/^\* (.*$)/gm, `<li class="ml-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}">• $1</li>`)
      .replace(/^- (.*$)/gm, `<li class="ml-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}">• $1</li>`)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" class="text-blue-500 hover:text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>`)
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  const formatMarkdown = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: Array<{ type: string; content?: string; language?: string; id?: string }> = [];
    let lastIndex = 0;
    let match;
    let codeBlockId = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      
      parts.push({
        type: 'codeblock',
        language: match[1] || 'text',
        content: match[2].trim(),
        id: `code-${codeBlockId++}`
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.map((part, index) => {
      if (part.type === 'codeblock') {
        return (
          <div key={index} className={`my-4 rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className={`flex justify-between items-center px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {part.language}
              </span>
              <button
                onClick={() => copyToClipboard(part.content || '', part.id || '')}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
              >
                {copiedCode === part.id ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className={`p-4 overflow-x-auto text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <code>{part.content}</code>
            </pre>
          </div>
        );
      } else {
        return (
          <div 
            key={index} 
            dangerouslySetInnerHTML={{ 
              __html: formatTextMarkdown(highlightLegalTerms(part.content || ''), darkMode) 
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLElement;
              if (target.classList.contains('legal-term')) {
                const term = target.getAttribute('data-term');
                if (term && glossaryTerms[term.toLowerCase()]) {
                  setHoveredTerm(term.toLowerCase());
                  const rect = target.getBoundingClientRect();
                  setTooltipPosition({
                    x: rect.left + window.scrollX,
                    y: rect.top + window.scrollY - 80
                  });
                }
              }
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLElement;
              if (target.classList.contains('legal-term')) {
                setHoveredTerm(null);
              }
            }}
          />
        );
      }
    });
  };

  return (
    <div className="prose prose-sm max-w-none relative">
      {formatMarkdown(content)}
      
      {hoveredTerm && glossaryTerms[hoveredTerm] && (
        <div 
          className="fixed p-3 bg-gray-900 text-white text-sm rounded-lg shadow-2xl max-w-xs border border-gray-700"
          style={{
            left: `${Math.min(tooltipPosition.x, window.innerWidth - 300)}px`,
            top: `${Math.max(tooltipPosition.y, 10)}px`,
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <div className="font-semibold capitalize mb-1">{hoveredTerm}</div>
          <div className="text-gray-200">{glossaryTerms[hoveredTerm].definition}</div>
          {glossaryTerms[hoveredTerm].context && (
            <div className="mt-2 text-xs text-gray-400 italic">
              Context: {glossaryTerms[hoveredTerm].context}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ChatBot() {
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [temporaryMode, setTemporaryMode] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [glossaryTerms, setGlossaryTerms] = useState<{ [key: string]: { definition: string; context?: string } }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!database) {
      setError('Firebase not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setError(null);
        if (!temporaryMode) {
          loadChatSessions(u.uid);
        }
        setLoading(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, temporaryMode]);

  useEffect(() => {
    if (!mounted) return;
    scrollToBottom();
  }, [messages, mounted]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const loadChatSessions = async (userId: string) => {
    if (!database) return;

    try {
      const sessionsRef = ref(database, `chats/${userId}`);
      onValue(sessionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const sessions = Object.entries(data).map(([id, session]: [string, any]) => {
            const messages: Message[] = [];
            if (session.messages && typeof session.messages === 'object') {
              Object.values(session.messages).forEach((msg: any) => {
                messages.push({
                  id: msg.id,
                  type: msg.type,
                  content: msg.content,
                  timestamp: msg.timestamp,
                  ...(msg.file && { file: msg.file }),
                  ...(msg.terms && { terms: msg.terms })
                });
              });
            }
            
            return {
              id,
              title: session.title || 'New Chat',
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              messages: messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            };
          }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          
          setChatSessions(sessions);
        } else {
          setChatSessions([]);
        }
      });
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setGlossaryTerms({});
  };

  const loadChat = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);
      
      const lastMessage = session.messages[session.messages.length - 1];
      if (lastMessage?.terms) {
        setGlossaryTerms(lastMessage.terms);
      }
    }
  };

  const deleteChat = async (sessionId: string) => {
    if (!database || !user) return;

    try {
      await remove(ref(database, `chats/${user.uid}/${sessionId}`));
      if (currentSessionId === sessionId) {
        createNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      if (allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024) {
        setUploadedFile(file);
        setError(null);
      } else {
        setError('Invalid file type or size > 10MB');
      }
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const saveMessagesToFirebase = async (messagesToSave: Message[]) => {
    if (!database || !user) return;
    
    try {
      let sessionId = currentSessionId;
      
      if (!sessionId) {
        const sessionsRef = ref(database, `chats/${user.uid}`);
        const newSessionRef = push(sessionsRef);
        sessionId = newSessionRef.key!;
        setCurrentSessionId(sessionId);
      }

      const sessionRef = ref(database, `chats/${user.uid}/${sessionId}`);
      
      const messagesObject: any = {};
      messagesToSave.forEach((msg, index) => {
        messagesObject[index] = {
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          ...(msg.file && { file: msg.file }),
          ...(msg.terms && { terms: msg.terms })
        };
      });

      const sessionData = {
        messages: messagesObject,
        title: messagesToSave[0]?.content?.substring(0, 50) || 'New Chat',
        updatedAt: new Date().toISOString(),
        ...(messagesToSave.length === 2 && { createdAt: new Date().toISOString() })
      };

      await set(sessionRef, sessionData);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current && !isSpeaking) {
      synthRef.current.cancel();
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'code block')
        .replace(/[*#`\[\]]/g, '')
        .replace(/<[^>]*>/g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !uploadedFile && !urlInput.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: inputText || urlInput || `Uploaded: ${uploadedFile?.name}`,
      file: uploadedFile ? {
        name: uploadedFile.name,
        type: uploadedFile.type
      } : undefined,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const currentInputText = inputText;
    setInputText('');
    setUrlInput('');
    setShowUrlInput(false);
    setIsTyping(true);
    setError(null);

    try {
      let response;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      if (uploadedFile || urlInput) {
        const formData = new FormData();
        formData.append('userId', user.uid);
        
        if (uploadedFile) {
          formData.append('file', uploadedFile);
        }
        
        if (urlInput) {
          formData.append('url', urlInput);
        }
        
        if (currentInputText.trim()) {
          formData.append('message', currentInputText);
        }
        
        response = await fetch('http://localhost:8000/document/analyze', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
      } else {
        const formData = new FormData();
        formData.append('message', currentInputText);
        formData.append('temporaryMode', temporaryMode.toString());
        formData.append('userId', user.uid);

        if (!temporaryMode && messages.length > 0) {
          const context = messages.slice(-5).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));
          formData.append('context', JSON.stringify(context));
        }

        response = await fetch('http://localhost:8000/chat/', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
      }
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.terms) {
        setGlossaryTerms(data.terms);
      }

      const botMessage: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.response,
        terms: data.terms || glossaryTerms,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      if (!temporaryMode && database && user) {
        await saveMessagesToFirebase(updatedMessages);
      }

      setUploadedFile(null);

    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Failed to process request');
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2">×</button>
          </div>
        </div>
      )}

      <div className={`fixed top-0 left-0 h-full ${showSidebar ? 'w-64' : 'w-18'} transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col z-40`}>
        <div className="p-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`w-full flex items-center space-x-2 p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Menu className={`h-6 w-6 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            {showSidebar && <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Legal Assistant</span>}
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full flex items-center space-x-2 p-3 rounded-lg bg-[#1E8DD0] hover:bg-[#43B3D8] text-white"
          >
            <MessageCirclePlus className="h-5 w-5" />
            {showSidebar && <span>New Chat</span>}
          </button>
        </div>

        {showSidebar && !temporaryMode && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatSessions.map((session) => (
              <div key={session.id} className="group relative">
                <button
                  onClick={() => loadChat(session.id)}
                  className={`w-full text-left p-3 rounded-lg ${currentSessionId === session.id
                    ? darkMode ? 'bg-[#CBE5F6]' : 'bg-[#D2E5F0]'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <div className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {session.title}
                  </div>
                </button>
                <button
                  onClick={() => deleteChat(session.id)}
                  className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            {darkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5" />}
            {showSidebar && <span className={darkMode ? 'text-white' : 'text-gray-900'}>{darkMode ? 'Light' : 'Dark'} Mode</span>}
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center space-x-2 p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-red-400' : 'bg-gray-100 text-red-500'}`}
          >
            <LogOut className="h-4 w-4" />
            {showSidebar && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-18'} pb-24 pt-16`}>
        <div className={`fixed top-0 right-0 left-0 transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-18'} z-30`}>
          <div className={`p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            style={{
              backgroundImage: "url(/chatbot-bg.png)",
              backgroundSize: '100% 100%',
              backgroundPosition: 'center'
            }}
          >
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#1E8DD0]'}`}>
              Legal Document Assistant
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4"
          style={{
            backgroundImage: "url(/chatbot-bg.png)",
            backgroundSize: '100% 100%',
            backgroundPosition: 'center'
          }}
        >
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="flex justify-center items-center h-32 w-32 mx-auto">
                <Lottie
                  animationData={gradientLoadingAnimation}
                  loop={true}
                />
              </div>
              <h3 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#62D5DE] to-[#1E8DD0]">
                Confused by Legal Jargon?
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Upload a document or paste a URL to analyze legal content
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${message.type === 'user'
                ? 'bg-[#37A6D5] text-white'
                : darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-[#37A6D5]'}`}>
                <div className="flex items-start space-x-2">
                  {message.type === 'bot' && <Bot className="h-5 w-5 mt-0.5 flex-shrink-0 text-[#3088ae]" />}
                  <div className="flex-1">
                    {message.file && (
                      <div className="mb-2 p-2 rounded flex items-center space-x-2 bg-gray-100 text-black">
                        <File className="h-4 w-4" />
                        <span className="text-sm">{message.file.name}</span>
                      </div>
                    )}
                    {message.type === 'bot' ? (
                      <MarkdownRenderer 
                        content={message.content} 
                        darkMode={darkMode}
                        glossaryTerms={message.terms || glossaryTerms}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.type === 'bot' && (
                      <button
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(message.content)}
                        className="mt-2 p-1 rounded hover:bg-gray-600"
                      >
                        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className={`px-4 py-3 rounded-2xl flex items-center space-x-2 ${darkMode ? 'bg-gray-700' : 'bg-white border'}`}>
                <Bot className="h-5 w-5" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce bg-blue-500" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce bg-blue-500" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce bg-blue-500" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={`fixed bottom-0 right-0 left-0 transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-18'} z-30`}>
        <div className={`p-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          style={{
            backgroundImage: "url(/chatbot-bg.png)",
            backgroundSize: '100% 100%',
            backgroundPosition: 'center'
          }}
        >
          {uploadedFile && (
            <div className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2">
                <File className="h-5 w-5" />
                <span className="text-sm">{uploadedFile.name}</span>
              </div>
              <button onClick={() => setUploadedFile(null)} className="p-1 rounded hover:bg-gray-600">×</button>
            </div>
          )}

          {showUrlInput && (
            <div className="mb-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL to analyze..."
                className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'hover:bg-gray-100'}`}
            >
              <Upload className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'hover:bg-gray-100'}`}
            >
              <LinkIcon className="h-5 w-5" />
            </button>

            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-full ${isListening ? 'bg-red-500' : darkMode ? 'bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-3 rounded-2xl border resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              rows={1}
            />

            <button
              onClick={sendMessage}
              disabled={!inputText.trim() && !uploadedFile && !urlInput.trim()}
              className={`p-3 rounded-full ${inputText.trim() || uploadedFile || urlInput.trim() ? 'bg-[#43B3D8] hover:bg-[#37A6D5] text-white' : 'bg-gray-300 text-gray-500'}`}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.docx,image/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}