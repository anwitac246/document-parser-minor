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
  AlertCircle,
  CheckCircle
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
      console.log("📥 Loading message history from:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Loaded messages:", data.count);
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      console.error("❌ Error loading messages:", err);
      setError(`Failed to load messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!user) {
      console.log("⏸️ No user, skipping WebSocket connection");
      return;
    }

    console.log("🔌 Attempting WebSocket connection...");
    console.log("User:", user.uid, user.displayName || user.email);
    console.log("Community:", communityId);

    try {
      const wsUrl = `${BACKEND_WS}/api/communities/ws/${communityId}`;
      console.log("Connecting to:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket OPENED");
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        const helloMessage = {
          type: "hello",
          userId: user.uid,
          userName: user.displayName || user.email || "Anonymous",
          communityName: communityName,
          communityImage: communityAvatar,
          communityDescription: communityDescription,
        };
        
        console.log("📤 Sending hello:", helloMessage);
        ws.send(JSON.stringify(helloMessage));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Received:", data.type, data);

          if (data.type === "connected") {
            console.log("✅ Connection established");
          } else if (data.type === "ready") {
            console.log("✅ WebSocket READY - Can send messages now");
            setIsReady(true);
            setLoading(false);
          } else if (data.type === "message") {
            console.log("💬 New message:", data.message);
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === "user_joined") {
            console.log(`👋 ${data.userName} joined`);
          } else if (data.type === "user_left") {
            console.log(`👋 ${data.userName} left`);
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
            console.error("❌ Server error:", data.error);
            setError(data.error);
          }
        } catch (err) {
          console.error("❌ Error parsing message:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("❌ WebSocket ERROR:", err);
        setError("Connection error - Is the server running?");
        setIsReady(false);
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket CLOSED", event.code, event.reason);
        setConnecting(true);
        setIsReady(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectWebSocket();
          }, delay);
        } else {
          setError("Unable to connect. Please refresh the page.");
        }
      };
    } catch (err) {
      console.error("❌ Error creating WebSocket:", err);
      setError(`Connection failed: ${err.message}`);
      setConnecting(false);
      setIsReady(false);
    }
  };

  useEffect(() => {
    if (user && communityId) {
      console.log("🚀 Initializing chat for community:", communityId);
      loadMessageHistory();
      connectWebSocket();
    }

    return () => {
      console.log("🧹 Cleaning up...");
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
    console.log("🔘 Send button clicked");
    console.log("Message:", newMessage);
    console.log("WebSocket:", wsRef.current);
    console.log("WebSocket ready state:", wsRef.current?.readyState);
    console.log("Is ready:", isReady);

    if (!newMessage.trim()) {
      console.log("❌ Message is empty");
      return;
    }

    if (!wsRef.current) {
      console.log("❌ WebSocket is null");
      setError("Not connected. Please wait...");
      return;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("❌ WebSocket is not open. State:", wsRef.current.readyState);
      setError("Connection not ready. Please wait...");
      return;
    }

    if (!isReady) {
      console.log("❌ WebSocket not ready yet");
      setError("Connection initializing. Please wait...");
      return;
    }

    try {
      const messageData = {
        type: "message",
        content: newMessage.trim(),
      };
      
      console.log("📤 Sending message:", messageData);
      wsRef.current.send(JSON.stringify(messageData));
      console.log("✅ Message sent successfully");
      
      setNewMessage("");
      
      // Stop typing indicator
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "typing",
          isTyping: false,
        }));
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      setError(`Failed to send message: ${err.message}`);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isReady) return;

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
                onError={(e) => {
                  e.target.src = "/icons/default-community.png";
                }}
              />
              
              <div>
                <h1 className="text-xl font-bold text-white">
                  {communityName}
                </h1>
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

            <div className="flex items-center space-x-3">
              {connecting && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Connecting...</span>
                </div>
              )}
              {!connecting && isReady && (
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">Connected & Ready</span>
                </div>
              )}
              {!connecting && !isReady && (
                <div className="flex items-center space-x-2 text-orange-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Initializing...</span>
                </div>
              )}
            </div>
          </div>

          {communityDescription && (
            <p className="mt-3 text-sm text-gray-400">
              {communityDescription}
            </p>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl flex flex-col" style={{ height: "calc(100vh - 300px)" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950/50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-500">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2 text-gray-600">
                    {isReady ? "✅ Ready to send messages" : "⏳ Initializing..."}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.userId === user?.uid;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-100"
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="text-xs font-semibold mb-1 text-blue-400">
                          {msg.userName || "Anonymous"}
                        </div>
                      )}
                      <div className="break-words">{msg.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          isOwnMessage ? "text-blue-200" : "text-gray-500"
                        }`}
                      >
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
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                <span>{Array.from(typingUsers)[0]} is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
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
                placeholder={isReady ? "Type a message..." : "Waiting for connection..."}
                disabled={!isReady}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="mt-2 text-xs text-gray-500 text-center">
              {isReady ? (
                <span className="text-green-400">Ready to send</span>
              ) : (
                <span className="text-yellow-400">Initializing connection...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;