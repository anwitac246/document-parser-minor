"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  ArrowLeft, 
  Users, 
  Settings,
  Pin,
  MoreVertical,
  Image,
  Paperclip,
  Smile,
  Search,
  Phone,
  Video,
  Info,
  UserPlus,
  Shield,
  Flag
} from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from 'firebase/auth';
// Correct path - adjust based on your actual firebase-config.js location
import { auth, database } from '../../../firebase-config';
import { 
  ref, 
  push, 
  onValue, 
  remove, 
  get, 
  set, 
  update, 
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off
} from 'firebase/database';

export default function CommunityChatPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- Hooks always at top ---
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [community, setCommunity] = useState(null);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showMembersList, setShowMembersList] = useState(false);
  const [showCommunityInfo, setShowCommunityInfo] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesListenerRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load community data
  useEffect(() => {
    if (mounted && id) {
      loadCommunityData();
    }
  }, [mounted, id]);

  // Load messages when user and community are ready
  useEffect(() => {
    if (user && community && mounted) {
      const unsubscribe = loadMessages();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, community, mounted]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update user's online status
  useEffect(() => {
    if (user && community) {
      const userStatusRef = ref(database, `communityOnlineUsers/${id}/${user.uid}`);
      
      // Set user as online
      set(userStatusRef, {
        name: user.displayName || user.email,
        avatar: user.photoURL || '/default-avatar.png',
        lastSeen: serverTimestamp()
      });

      // Set user as offline when they leave
      const handleBeforeUnload = () => {
        set(userStatusRef, null);
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        set(userStatusRef, null);
      };
    }
  }, [user, community, id]);

  // Load community data from Firebase or URL params
  const loadCommunityData = async () => {
    try {
      // First try to get from Firebase
      const communityRef = ref(database, `communities/${id}`);
      const snapshot = await get(communityRef);
      
      if (snapshot.exists()) {
        setCommunity({ id, ...snapshot.val() });
      } else {
        // Fallback to URL params
        const name = searchParams.get("name");
        const avatar = searchParams.get("avatar");
        const members = searchParams.get("members");
        
        if (name) {
          setCommunity({ 
            id, 
            name, 
            avatar: avatar || '/icons/default-community.png', 
            members: parseInt(members) || 0,
            description: searchParams.get("description") || ""
          });
        } else {
          setError('Community not found');
        }
      }

      // Load community members
      loadCommunityMembers();
    } catch (error) {
      console.error('Error loading community:', error);
      setError('Failed to load community');
    }
  };

  // Load community members
  const loadCommunityMembers = () => {
    const membersRef = ref(database, `communityMembers/${id}`);
    const unsubscribe = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const membersList = Object.values(data);
        setCommunityMembers(membersList);
      } else {
        setCommunityMembers([]);
      }
    });

    return unsubscribe;
  };

  // Load messages with real-time listener
  const loadMessages = () => {
    const messagesRef = ref(database, `communityMessages/${id}`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
    
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([messageId, message]) => ({
          id: messageId,
          ...message
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        setMessages(messagesList);
      } else {
        // Initialize with welcome message if no messages exist
        initializeWelcomeMessage();
      }
    }, (error) => {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    });

    messagesListenerRef.current = unsubscribe;
    return unsubscribe;
  };

  // Initialize welcome message for new communities
  const initializeWelcomeMessage = async () => {
    if (!community || !user) return;

    const welcomeMessage = {
      text: `Welcome to ${community.name}! This is the beginning of your community chat. Feel free to introduce yourself and start meaningful discussions.`,
      authorId: 'system',
      authorName: 'System',
      authorAvatar: '/icons/bot-avatar.png',
      timestamp: new Date().toISOString(),
      type: 'system'
    };

    try {
      const messagesRef = ref(database, `communityMessages/${id}`);
      await push(messagesRef, welcomeMessage);
    } catch (error) {
      console.error('Error creating welcome message:', error);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !user || !community) return;

    const newMessage = {
      text: input.trim(),
      authorId: user.uid,
      authorName: user.displayName || user.email.split('@')[0],
      authorAvatar: user.photoURL || '/default-avatar.png',
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    try {
      const messagesRef = ref(database, `communityMessages/${id}`);
      await push(messagesRef, newMessage);
      
      // Update community last activity
      const communityRef = ref(database, `communities/${id}`);
      await update(communityRef, {
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setInput("");
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  // Handle typing indicator
  const handleTyping = (value) => {
    setInput(value);
    
    if (!isTyping && user) {
      setIsTyping(true);
      const typingRef = ref(database, `communityTyping/${id}/${user.uid}`);
      set(typingRef, {
        name: user.displayName || user.email.split('@')[0],
        timestamp: serverTimestamp()
      });
    }

    // Clear typing indicator after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (user) {
        const typingRef = ref(database, `communityTyping/${id}/${user.uid}`);
        set(typingRef, null);
      }
    }, 3000);
  };

  // Listen for typing indicators
  useEffect(() => {
    if (user && community) {
      const typingRef = ref(database, `communityTyping/${id}`);
      const unsubscribe = onValue(typingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const typingUsersList = Object.entries(data)
            .filter(([uid, _]) => uid !== user.uid)
            .map(([_, userData]) => userData.name);
          setTypingUsers(new Set(typingUsersList));
        } else {
          setTypingUsers(new Set());
        }
      });

      return () => unsubscribe();
    }
  }, [user, community, id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Generate consistent colors for users
  const getUserColor = (authorId, authorName) => {
    if (authorId === 'system') {
      return { bg: "bg-gray-100 dark:bg-gray-700", border: "border-gray-300 dark:border-gray-600", text: "text-gray-800 dark:text-gray-200" };
    }
    
    if (user && authorId === user.uid) {
      return { bg: "bg-blue-500", border: "border-blue-600", text: "text-white" };
    }

    const colors = [
      { bg: "bg-red-100 dark:bg-red-900", border: "border-red-300 dark:border-red-700", text: "text-red-800 dark:text-red-200" },
      { bg: "bg-green-100 dark:bg-green-900", border: "border-green-300 dark:border-green-700", text: "text-green-800 dark:text-green-200" },
      { bg: "bg-yellow-100 dark:bg-yellow-900", border: "border-yellow-300 dark:border-yellow-700", text: "text-yellow-800 dark:text-yellow-200" },
      { bg: "bg-purple-100 dark:bg-purple-900", border: "border-purple-300 dark:border-purple-700", text: "text-purple-800 dark:text-purple-200" },
      { bg: "bg-pink-100 dark:bg-pink-900", border: "border-pink-300 dark:border-pink-700", text: "text-pink-800 dark:text-pink-200" },
      { bg: "bg-indigo-100 dark:bg-indigo-900", border: "border-indigo-300 dark:border-indigo-700", text: "text-indigo-800 dark:text-indigo-200" },
    ];

    const hash = authorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    return date.toLocaleDateString() === now.toLocaleDateString() 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Members List Modal
  const MembersListModal = () => {
    if (!showMembersList) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Community Members ({communityMembers.length})
              </h3>
              <button
                onClick={() => setShowMembersList(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {communityMembers.map((member, index) => (
              <div key={index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <img
                  src={member.userAvatar || '/default-avatar.png'}
                  alt={member.userName}
                  className="w-10 h-10 rounded-full"
                />
                <div className="ml-3 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{member.userName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Joined {formatTime(member.joinedAt)}
                  </p>
                </div>
                {member.role === 'admin' && (
                  <Shield className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Error Toast
  const ErrorToast = () => {
    if (!error) return null;

    return (
      <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-white hover:text-gray-200">
            ×
          </button>
        </div>
      </div>
    );
  };

  // Render loading state
  if (!mounted || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error && !community) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!community) return <p className="p-4">Community not found!</p>;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <ErrorToast />
      <MembersListModal />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <img 
            src={community.avatar || '/icons/default-community.png'} 
            alt={community.name} 
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              e.target.src = '/icons/default-community.png';
            }}
          />
          
          <div className="ml-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {community.name}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{communityMembers.length} members</span>
              {onlineUsers.size > 0 && (
                <span>• {onlineUsers.size} online</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMembersList(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to {community.name}!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This is the beginning of your community chat. Start the conversation!
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const style = getUserColor(msg.authorId, msg.authorName);
          const isOwnMessage = user && msg.authorId === user.uid;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-start space-x-2 max-w-xl">
                {!isOwnMessage && (
                  <img
                    src={msg.authorAvatar || '/default-avatar.png'}
                    alt={msg.authorName}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                )}
                
                <div
                  className={`p-3 rounded-2xl border ${style.bg} ${style.border} ${style.text} ${
                    isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {msg.authorName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1 text-right">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-full">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {Array.from(typingUsers).join(', ')} typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Input - Fixed bottom */}
      <div className="border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={`Message ${community.name}...`}
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!user}
            />
          </div>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <Smile className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || !user}
            className={`p-3 rounded-full transition-colors ${
              input.trim() && user
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}