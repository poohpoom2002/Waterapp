import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

// AI Assistant Icon
const AiIcon = () => (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 text-white shadow-lg ring-2 ring-white ring-opacity-30">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L9 7V9L7 11V17H9L11 15L13 17H15V11L21 9ZM12 8L14 10H10L12 8Z" />
        </svg>
    </div>
);

const UserIcon = () => (
    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
            />
        </svg>
    </div>
);

// Enhanced Typing Animation
const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5 p-2">
        <div className="flex space-x-0.5">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
            <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-pink-400 to-indigo-400"
                style={{ animationDelay: '0.1s' }}
            ></div>
            <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
                style={{ animationDelay: '0.2s' }}
            ></div>
        </div>
        <span className="text-xs font-medium text-gray-600">AI กำลังคิด...</span>
    </div>
);

// Quick Suggestions
const QuickSuggestions = ({ onSuggestionSelect }) => {
    const suggestions = [
        { icon: '🎭', query: 'เล่าเรื่องตลกให้ฟังหน่อย' },
        { icon: '🍳', query: 'แนะนำวิธีทำอาหารง่ายๆ' },
        { icon: '💡', query: 'ให้คำแนะนำในการใช้ชีวิต' },
        { icon: '📚', query: 'อธิบายเรื่องน่ารู้ให้ฟังหน่อย' },
    ];

    return (
        <div className="border-t border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 p-3">
            <p className="mb-2 text-center text-xs font-medium text-gray-600">✨ คำถามที่พบบ่อย:</p>
            <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionSelect(suggestion.query)}
                        className="group flex items-center space-x-1.5 rounded-lg border border-purple-200 bg-white p-1.5 text-xs transition-all duration-200 hover:border-purple-300 hover:shadow-sm"
                    >
                        <span className="text-sm transition-transform group-hover:scale-110">
                            {suggestion.icon}
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                            {suggestion.query}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Main Component
const FloatingAiChat = ({ isOpen, onClose, onMinimize, isMinimized }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Position and dragging states
    useEffect(() => {
        if (isOpen) {
            setPosition({
                x: Math.max(100, (window.innerWidth || 1200) - 380),
                y: 100,
            });
        }
    }, [isOpen]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const windowRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isTyping]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height =
                Math.min(textareaRef.current.scrollHeight, 80) + 'px';
        }
    }, [message]);

    // Dragging functionality
    const handleMouseDown = (e) => {
        if (e.target.closest('.no-drag')) return;

        setIsDragging(true);
        const rect = windowRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        const maxX = window.innerWidth - 380;
        const maxY = window.innerHeight - 520;

        setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    const handleSuggestionClick = (suggestion) => {
        sendMessage(suggestion);
        setShowSuggestions(false); // ซ่อน suggestions หลังจากเลือก
    };

    const toggleSuggestions = () => {
        setShowSuggestions(!showSuggestions);
    };

    const API_BASE_URL = '';

    const sendMessage = async (messageToSend = message) => {
        if (!messageToSend.trim() || isTyping) return;

        const newMessage = { role: 'user', content: messageToSend };
        const updatedHistory = [...chatHistory, newMessage];
        setChatHistory(updatedHistory);
        setMessage('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    message: messageToSend,
                }),
            });

            const data = await response.json();
            const aiReply = { role: 'assistant', content: data.reply };
            setChatHistory((prev) => [...prev, aiReply]);
        } catch (error) {
            console.error('AI Error:', error);

            let errorMessage = 'ขออภัยนะ ระบบ AI ขัดข้องชั่วคราว 🔧\n\nลองใหม่อีกครั้งได้เลย!';

            setChatHistory((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setIsTyping(false);
        }
    };

    const clearChat = () => {
        setChatHistory([]);
    };

    if (!isOpen) return null;

    return (
        <div
            ref={windowRef}
            className={`fixed z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ${
                isMinimized ? 'h-14 w-64' : 'h-[32rem] w-96'
            } ${isDragging ? 'shadow-3xl scale-105 cursor-grabbing' : 'cursor-auto'}`}
            style={{
                left: position.x,
                top: position.y,
                boxShadow: isDragging
                    ? '0 35px 60px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
        >
            {/* Enhanced Header with AI Theme - ขยาย drag area */}
            <div
                className="relative cursor-grab select-none overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 p-3 text-white active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                style={{ touchAction: 'none' }} // ป้องกัน touch scrolling
            >
                {/* Animated Background */}
                <div className="pointer-events-none absolute inset-0 opacity-20">
                    <div className="absolute inset-0 -skew-x-12 transform animate-pulse bg-gradient-to-r from-transparent via-white to-transparent"></div>
                </div>

                {/* Drag Handle Visual Indicator */}
                <div className="absolute left-1/2 top-1.5 flex -translate-x-1/2 transform space-x-0.5 opacity-40">
                    <div className="h-0.5 w-0.5 rounded-full bg-white"></div>
                    <div className="h-0.5 w-0.5 rounded-full bg-white"></div>
                    <div className="h-0.5 w-0.5 rounded-full bg-white"></div>
                    <div className="h-0.5 w-0.5 rounded-full bg-white"></div>
                </div>

                <div className="relative flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                        <AiIcon />
                        <div>
                            <h1 className="text-sm font-bold">🤖 AI Assistant</h1>
                            {!isMinimized && (
                                <p className="text-xs text-purple-100">
                                    ผู้ช่วยอัจฉริยะ • พร้อมคุย
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="no-drag flex items-center space-x-1.5">
                        {/* AI Status Indicator */}
                        {!isMinimized && (
                            <div className="flex items-center space-x-1 rounded-full bg-white/20 px-2 py-0.5">
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"></div>
                                <span className="text-xs font-medium">Online</span>
                            </div>
                        )}

                        {/* Minimize button */}
                        <button
                            onClick={onMinimize}
                            className="rounded-full bg-white/20 p-1.5 transition-colors duration-200 hover:scale-110 hover:bg-white/30"
                            title={isMinimized ? 'ขยาย' : 'ย่อ'}
                        >
                            <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {isMinimized ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 12H4"
                                    />
                                )}
                            </svg>
                        </button>

                        {/* Clear chat button */}
                        {chatHistory.length > 0 && !isMinimized && (
                            <button
                                onClick={clearChat}
                                className="rounded-full bg-white/20 p-1.5 transition-colors duration-200 hover:scale-110 hover:bg-white/30"
                                title="เคลียร์แชท"
                            >
                                <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </button>
                        )}

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="rounded-full bg-white/20 p-1.5 transition-colors duration-200 hover:scale-110 hover:bg-red-500/70"
                            title="ปิด"
                        >
                            <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Content - ใช้ flex-1 เพื่อขยายเต็มพื้นที่ */}
            {!isMinimized && (
                <>
                    {/* Main chat area - ใช้ flex-1 แทน h-80 */}
                    <div className="flex min-h-0 flex-1 flex-col">
                        {/* Chat messages area */}
                        <div
                            ref={chatContainerRef}
                            className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-3"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc' }}
                        >
                            {chatHistory.length === 0 && (
                                <div className="flex h-full flex-col items-center justify-center text-center">
                                    <div className="mb-3 animate-pulse rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-3 text-white shadow-xl">
                                        <svg
                                            className="h-6 w-6"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L9 7V9L7 11V17H9L11 15L13 17H15V11L21 9ZM12 8L14 10H10L12 8Z" />
                                        </svg>
                                    </div>
                                    <h3 className="mb-2 text-lg font-bold text-gray-800">
                                        สวัสดี! 👋
                                    </h3>
                                    <p className="mb-3 max-w-xs text-sm leading-relaxed text-gray-600">
                                        ฉันคือ{' '}
                                        <span className="font-semibold text-purple-600">
                                            AI Assistant
                                        </span>{' '}
                                        ผู้ช่วยอัจฉริยะ พร้อมคุยและช่วยเหลือคุณได้ทุกเรื่อง!
                                    </p>
                                </div>
                            )}

                            {chatHistory.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex items-end gap-2 ${
                                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                                >
                                    {msg.role === 'assistant' && <AiIcon />}
                                    <div
                                        className={`max-w-[85%] rounded-xl px-3 py-2 shadow-lg transition-all duration-300 ${
                                            msg.role === 'user'
                                                ? 'rounded-br-sm bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                                                : 'rounded-bl-sm border border-purple-200 bg-white text-gray-800'
                                        }`}
                                    >
                                        <div className="text-xs leading-relaxed">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => (
                                                        <p className="mb-1.5 last:mb-0">
                                                            {children}
                                                        </p>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className="mb-1.5 list-inside list-disc space-y-0.5">
                                                            {children}
                                                        </ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className="mb-1.5 list-inside list-decimal space-y-0.5">
                                                            {children}
                                                        </ol>
                                                    ),
                                                    li: ({ children }) => (
                                                        <li className="mb-0.5">{children}</li>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className="font-semibold text-purple-600">
                                                            {children}
                                                        </strong>
                                                    ),
                                                    em: ({ children }) => (
                                                        <em className="italic text-gray-600">
                                                            {children}
                                                        </em>
                                                    ),
                                                    h3: ({ children }) => (
                                                        <h3 className="mb-1.5 text-sm font-bold text-gray-800">
                                                            {children}
                                                        </h3>
                                                    ),
                                                    h4: ({ children }) => (
                                                        <h4 className="mb-1 text-xs font-semibold text-gray-700">
                                                            {children}
                                                        </h4>
                                                    ),
                                                    code: ({ children }) => (
                                                        <code className="rounded bg-purple-100 px-1 py-0.5 font-mono text-xs">
                                                            {children}
                                                        </code>
                                                    ),
                                                    hr: () => (
                                                        <hr className="my-2 border-purple-300" />
                                                    ),
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                    {msg.role === 'user' && <UserIcon />}
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex items-end gap-2">
                                    <AiIcon />
                                    <div className="max-w-[70%] rounded-xl rounded-bl-sm border border-purple-200 bg-white shadow-lg">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Suggestions - แสดงเมื่อไม่มี chat history หรือเมื่อ showSuggestions เป็น true */}
                        {(chatHistory.length === 0 || showSuggestions) && (
                            <div className="flex-shrink-0">
                                <QuickSuggestions onSuggestionSelect={handleSuggestionClick} />
                            </div>
                        )}
                    </div>

                    {/* Footer with input - ใช้ flex-shrink-0 เพื่อไม่ให้หด และอยู่ด้านล่างตลอด */}
                    <div className="flex-shrink-0 border-t border-purple-200 bg-white p-3">
                        <div className="flex items-end gap-2 rounded-lg border border-purple-300 bg-purple-50 p-2 transition-all duration-200 focus-within:border-purple-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-200">
                            {/* Quick Suggestions Toggle Button - แสดงเมื่อมี chat history */}
                            {chatHistory.length > 0 && (
                                <button
                                    onClick={toggleSuggestions}
                                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                                        showSuggestions
                                            ? 'scale-105 bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                                            : 'bg-purple-200 text-purple-600 hover:bg-purple-300'
                                    }`}
                                    title={showSuggestions ? 'ซ่อนคำถามแนะนำ' : 'แสดงคำถามแนะนำ'}
                                >
                                    <svg
                                        className="h-3 w-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </button>
                            )}

                            <textarea
                                ref={textareaRef}
                                className="max-h-[80px] min-h-[20px] flex-1 resize-none border-none bg-transparent text-xs text-gray-800 placeholder-gray-500 focus:outline-none"
                                rows={1}
                                placeholder="พิมพ์ข้อความ... 💬"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                disabled={isTyping}
                            />
                            <button
                                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-1.5 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-600 hover:to-pink-700 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                                onClick={() => sendMessage()}
                                disabled={isTyping || !message.trim()}
                            >
                                {isTyping ? (
                                    <svg
                                        className="h-3 w-3 animate-spin"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="h-3 w-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Footer Info */}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span className="text-[10px]">🤖 AI Assistant • Gemini 2.0</span>
                            <span className="flex items-center space-x-0.5 text-[10px]">
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"></div>
                                <span>พร้อมช่วยเหลือ</span>
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FloatingAiChat;
