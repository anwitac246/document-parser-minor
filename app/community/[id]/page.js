"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../firebase-config";
import Navbar from "../../../components/navbar";
import { 
  Send, 
  Users, 
  ArrowLeft, 
  Loader2,
  AlertCircle
} from "lucide-react";

const BACKEND_WS = "ws://localhost:8000";
const BACKEND_HTTP = "http://localhost:8000";

const CommunityChat = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = params.id;

  const communityName = searchParams.get("name") || "Community";
  const communityAvatar = searchParams.get("avatar") || "/icons/default-community.png";
  const communityCategory = searchParams.get("category") || "";
  const communityDescription = searchParams.get("description") || "";
  const communityMembers = searchParams.get("members") || "0";

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isReady, setIsReady] = useState(false);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadMessageHistory = async () => {
    try {
      setLoading(true);
      const url = `${BACKEND_HTTP}/api/communities/${communityId}/messages?limit=50`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      console.error("Error loading messages:", err);
      setError(`Failed to load messages`);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!user) return;

    try {
      const wsUrl = `${BACKEND_WS}/api/communities/ws/${communityId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send hello message immediately after connection
        ws.send(JSON.stringify({
          type: "hello",
          userId: user.uid,
          userName: user.displayName || user.email || "Anonymous",
          communityName: communityName,
          communityImage: communityAvatar,
          communityDescription: communityDescription,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data.type);

          if (data.type === "ready") {
            console.log("✅ Ready to chat");
            setIsReady(true);
            setLoading(false);
          } else if (data.type === "message") {
            console.log("New message:", data.message);
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === "user_joined") {
            console.log(`${data.userName} joined`);
          } else if (data.type === "user_left") {
            console.log(`${data.userName} left`);
          } else if (data.type === "typing") {
            if (data.userId !== user.uid) {
              setTypingUsers((prev) => {
                const next = new Set(prev);
                if (data.isTyping) {
                  next.add(data.userName || data.userId);
                } else {
                  next.delete(data.userName || data.userId);
                }
                return next;
              });
            }
          } else if (data.type === "error") {
            console.error("Server error:", data.error);
            setError(data.error);
          }
        } catch (err) {
          console.error("Parse error:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("Connection error");
        setIsReady(false);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed", event.code, event.reason);
        setConnecting(true);
        setIsReady(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectWebSocket();
          }, delay);
        } else {
          setError("Connection failed. Please refresh.");
        }
      };
    } catch (err) {
      console.error("WebSocket creation error:", err);
      setError("Failed to connect");
      setConnecting(false);
      setIsReady(false);
    }
  };

  useEffect(() => {
    if (user && communityId) {
      loadMessageHistory();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, communityId]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isReady) {
      console.log("Cannot send:", { 
        hasMessage: !!newMessage.trim(), 
        wsState: wsRef.current?.readyState, 
        isReady 
      });
      return;
    }

    try {
      console.log("Sending message:", newMessage);
      wsRef.current.send(JSON.stringify({
        type: "message",
        content: newMessage.trim(),
      }));
      
      setNewMessage("");
      
      // Stop typing indicator
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "typing",
          isTyping: false,
        }));
      }
    } catch (err) {
      console.error("Send error:", err);
      setError("Failed to send message");
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isReady) return;

    try {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        isTyping: true,
      }));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "typing",
            isTyping: false,
          }));
        }
      }, 2000);
    } catch (err) {
      console.error("Typing indicator error:", err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      
      <div className="max-w-7xl mx-auto pt-20 px-4 pb-4">
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/communities")}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <img
                src={communityAvatar}
                alt={communityName}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                onError={(e) => e.target.src = "/icons/default-community.png"}
              />
              
              <div>
                <h1 className="text-xl font-bold text-white">{communityName}</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  {communityCategory && (
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      {communityCategory}
                    </span>
                  )}
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {communityMembers} members
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span className="text-sm text-yellow-400">Connecting...</span>
                </>
              ) : isReady ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Online</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span className="text-sm text-orange-400">Initializing...</span>
                </>
              )}
            </div>
          </div>

          {communityDescription && (
            <p className="mt-3 text-sm text-gray-400">{communityDescription}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
            <button 
              onClick={() => {
                setError(null);
                if (!isReady && user) {
                  reconnectAttemptsRef.current = 0;
                  connectWebSocket();
                }
              }} 
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* Chat */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl flex flex-col" style={{ height: "calc(100vh - 300px)" }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950/50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Be the first to say hello!</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.userId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwn ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"}`}>
                      {!isOwn && <div className="text-xs font-semibold mb-1 text-blue-400">{msg.userName}</div>}
                      <div className="break-words">{msg.content}</div>
                      <div className={`text-xs mt-1 ${isOwn ? "text-blue-200" : "text-gray-500"}`}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {typingUsers.size > 0 && (
              <div className="text-sm text-gray-400 italic flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:"150ms"}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:"300ms"}}></div>
                </div>
                <span>{Array.from(typingUsers)[0]} is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-800 p-4 bg-gray-900">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isReady ? "Type a message..." : "Connecting..."}
                disabled={!isReady}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !isReady}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;