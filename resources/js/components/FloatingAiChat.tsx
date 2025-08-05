import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext'; // Import useLanguage hook

// Define proper types for the component
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface Position {
    x: number;
    y: number;
}

interface DragOffset {
    x: number;
    y: number;
}

interface QuickSuggestion {
    icon: string;
    query: string;
}

// AI Assistant Icon with green theme
const AiIcon = () => (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg ring-2 ring-white ring-opacity-30 animate-pulse">
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

// Enhanced Typing Animation with green theme
const TypingIndicator = () => {
    const { t } = useLanguage();
    return (
        <div className="flex items-center space-x-1.5 p-2">
            <div className="flex space-x-0.5">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-emerald-400 to-green-400"></div>
                <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-green-400 to-teal-400"
                    style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                    style={{ animationDelay: '0.2s' }}
                ></div>
            </div>
            <span className="text-xs font-medium text-gray-600">{t('AI กำลังวิเคราะห์...')}</span>
        </div>
    );
};

// Quick Suggestions for Irrigation System
const QuickSuggestions = ({ onSuggestionSelect }: { onSuggestionSelect: (suggestion: string) => void }) => {
    const { t } = useLanguage();
    const suggestions: QuickSuggestion[] = [
        { icon: '💧', query: t('วิธีคำนวณปริมาณน้ำที่พืชต้องการ') },
        { icon: '🌱', query: t('ระบบน้ำหยดที่เหมาะกับพืชสวนขนาดเล็ก') },
        { icon: '⏰', query: t('กำหนดเวลาให้น้ำที่เหมาะสมแต่ละฤดูกาล') },
        { icon: '🔧', query: t('แก้ปัญหาระบบน้ำชลประทานเบื้องต้น') },
    ];

    return (
        <div className="border-t border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-3">
            <p className="mb-2 text-center text-xs font-medium text-gray-600">🌿 {t('คำถามเกี่ยวกับระบบน้ำชลประทาน:')}</p>
            <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionSelect(suggestion.query)}
                        className="group flex items-center space-x-1.5 rounded-lg border border-emerald-200 bg-white p-1.5 text-xs transition-all duration-200 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100 transform hover:scale-105"
                    >
                        <span className="text-sm transition-transform group-hover:scale-110 group-hover:animate-pulse">
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

// Floating particles animation
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute w-1 h-1 bg-emerald-300 rounded-full animate-float opacity-30"
                style={{
                    left: `${10 + i * 15}%`,
                    animationDelay: `${i * 2}s`,
                    animationDuration: `${4 + i}s`,
                }}
            ></div>
        ))}
    </div>
);

// Main Component
const FloatingAiChat = ({ 
    isOpen, 
    onClose, 
    onMinimize, 
    isMinimized 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onMinimize: () => void; 
    isMinimized: boolean; 
}) => {
    const { t } = useLanguage(); // Use language context
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Position centered when opened
    useEffect(() => {
        if (isOpen) {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const chatWidth = isMinimized ? 256 : 384; // w-64 = 256px, w-96 = 384px
            const chatHeight = isMinimized ? 56 : 512; // h-14 = 56px, h-[32rem] = 512px
            
            // Calculate center position
            const centerX = Math.max(0, (windowWidth - chatWidth) / 2);
            const centerY = Math.max(0, (windowHeight - chatHeight) / 2);
            
            setPosition({
                x: centerX,
                y: centerY,
            });
        }
    }, [isOpen, isMinimized]); // Add isMinimized dependency

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);

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
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof Element && e.target.closest('.no-drag')) return;

        setIsDragging(true);
        if (windowRef.current) {
            const rect = windowRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
        
        // Prevent text selection during drag
        e.preventDefault();
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Get current window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Component dimensions - use actual values
        const componentWidth = isMinimized ? 256 : 384; // w-64 = 256px, w-96 = 384px
        const componentHeight = isMinimized ? 56 : 512; // h-14 = 56px, h-[32rem] = 512px
        
        // Calculate boundaries - ensure component stays fully visible
        const minX = 0;
        const minY = 0;
        const maxX = windowWidth - componentWidth;
        const maxY = windowHeight - componentHeight;

        // Apply constraints
        const constrainedX = Math.max(minX, Math.min(newX, maxX));
        const constrainedY = Math.max(minY, Math.min(newY, maxY));

        setPosition({
            x: constrainedX,
            y: constrainedY,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Restore text selection
        document.body.style.userSelect = '';
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

    // Handle window resize to keep component in bounds
    useEffect(() => {
        const handleResize = () => {
            if (!isOpen) return;
            
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const componentWidth = isMinimized ? 256 : 384; // w-64 = 256px, w-96 = 384px
            const componentHeight = isMinimized ? 56 : 512; // h-14 = 56px, h-[32rem] = 512px
            
            // Ensure component stays within bounds after resize
            const maxX = windowWidth - componentWidth;
            const maxY = windowHeight - componentHeight;
            
            setPosition(prevPosition => ({
                x: Math.max(0, Math.min(prevPosition.x, maxX)),
                y: Math.max(0, Math.min(prevPosition.y, maxY)),
            }));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, isMinimized]);

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
        setShowSuggestions(false);
    };

    const toggleSuggestions = () => {
        setShowSuggestions(!showSuggestions);
    };

    const API_BASE_URL = '';

    const sendMessage = async (messageToSend = message) => {
        if (!messageToSend.trim() || isTyping) return;

        const newMessage: ChatMessage = { role: 'user', content: messageToSend };
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
            const aiReply: ChatMessage = { role: 'assistant', content: data.reply };
            setChatHistory((prev) => [...prev, aiReply]);
        } catch (error) {
            console.error('AI Error:', error);

            const errorMessage = t('ขออภัยนะ ระบบ AI ขัดข้องชั่วคราว 🔧\n\nลองใหม่อีกครั้งได้เลย!');

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
        <>
            {/* Custom CSS for animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-10px) rotate(5deg); }
                    66% { transform: translateY(5px) rotate(-3deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s ease-in-out infinite;
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.6), 0 0 40px rgba(16, 185, 129, 0.3); }
                }
                .animate-glow {
                    animation: glow 2s ease-in-out infinite;
                }
            `}</style>
            
            <div
                ref={windowRef}
                className={`fixed z-50 flex flex-col overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-2xl transition-all duration-300 animate-glow ${
                    isMinimized ? 'h-14 w-64' : 'h-[32rem] w-96'
                } ${isDragging ? 'shadow-3xl scale-105 cursor-grabbing transition-none' : 'cursor-auto'}`}
                style={{
                    left: position.x,
                    top: position.y,
                    transform: isDragging ? 'rotate(2deg)' : 'rotate(0deg)',
                    boxShadow: isDragging
                        ? '0 35px 60px -12px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                        : '0 25px 50px -12px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                }}
            >
                {/* Enhanced Header with Green AI Theme */}
                <div
                    className="relative cursor-grab select-none overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-3 text-white active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    style={{ touchAction: 'none' }}
                >
                    {/* Floating Particles */}
                    <FloatingParticles />
                    
                    {/* Animated Background Shimmer */}
                    <div className="pointer-events-none absolute inset-0 opacity-20">
                        <div className="absolute inset-0 -skew-x-12 transform animate-shimmer bg-gradient-to-r from-transparent via-white to-transparent"></div>
                    </div>

                    {/* Neural Network Pattern Background */}
                    <div className="absolute inset-0 opacity-10">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <defs>
                                <pattern id="neural" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3">
                                        <animate attributeName="r" values="1;2;1" dur="3s" repeatCount="indefinite" />
                                    </circle>
                                    <line x1="10" y1="10" x2="30" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                                    <line x1="10" y1="10" x2="10" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#neural)" />
                        </svg>
                    </div>

                    {/* Drag Handle Visual Indicator */}
                    <div className="absolute left-1/2 top-1.5 flex -translate-x-1/2 transform space-x-0.5 opacity-40">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-0.5 w-0.5 rounded-full bg-white animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
                        ))}
                    </div>

                    <div className="relative flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2">
                            <img
                                className="h-10 w-10"
                                src="/images/chaiyo-logo.png"
                            />
                            <div>
                                <h1 className="text-sm font-bold flex items-center">
                                    🌿 {t('AI Chaiyo')}
                                    <span className="ml-1 inline-block w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                                </h1>
                                {!isMinimized && (
                                    <p className="text-xs text-emerald-100">
                                        {t('ผู้เชี่ยวชาญระบบน้ำ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="no-drag flex items-center space-x-1.5">
                            {/* AI Status Indicator */}
                            {!isMinimized && (
                                <div className="flex items-center space-x-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"></div>
                                    <span className="text-xs font-medium">{t('Smart Mode')}</span>
                                </div>
                            )}

                            {/* Minimize button */}
                            <button
                                onClick={onMinimize}
                                className="rounded-full bg-white/20 p-1.5 transition-all duration-200 hover:scale-110 hover:bg-white/30 backdrop-blur-sm"
                                title={isMinimized ? t('ขยาย') : t('ย่อ')}
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
                                    className="rounded-full bg-white/20 p-1.5 transition-all duration-200 hover:scale-110 hover:bg-white/30 backdrop-blur-sm"
                                    title={t('เคลียร์แชท')}
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
                                className="rounded-full bg-white/20 p-1.5 transition-all duration-200 hover:scale-110 hover:bg-red-500/70 backdrop-blur-sm"
                                title={t('ปิด')}
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

                {/* Chat Content */}
                {!isMinimized && (
                    <>
                        {/* Main chat area */}
                        <div className="flex min-h-0 flex-1 flex-col">
                            {/* Chat messages area */}
                            <div
                                ref={chatContainerRef}
                                className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-emerald-50 to-white p-3"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 #f0fdfa' }}
                            >
                                {chatHistory.length === 0 && (
                                    <div className="flex h-full flex-col items-center justify-center text-center relative">
                                        {/* Background decoration */}
                                        <div className="absolute inset-0 overflow-hidden">
                                            {[...Array(3)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute w-32 h-32 border border-emerald-200 rounded-full opacity-20 animate-pulse"
                                                    style={{
                                                        left: `${20 + i * 30}%`,
                                                        top: `${10 + i * 20}%`,
                                                        animationDelay: `${i}s`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        
                                        <div className="relative mb-3 animate-pulse rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow-xl">
                                            <img
                                                className="h-16 w-16"
                                                src="/images/chaiyo-logo.png"
                                            />
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-spin"></div>
                                        </div>
                                        <h3 className="mb-2 text-lg font-bold text-gray-800 animate-bounce">
                                            {t('สวัสดี!')} 🌱
                                        </h3>
                                        <p className="mb-3 max-w-xs text-sm leading-relaxed text-gray-600">
                                            {t('ฉันคือ')} {' '}
                                            <span className="font-semibold text-emerald-600 animate-pulse">
                                                {t('AI Chaiyo')}
                                            </span>{' '}
                                            {t('ผู้เชี่ยวชาญด้านระบบน้ำสำหรับพืชสวน พร้อมให้คำปรึกษาทุกเรื่อง! 💧')}
                                        </p>
                                    </div>
                                )}

                                {chatHistory.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-end gap-2 ${
                                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                                        } animate-fade-in`}
                                    >
                                        {msg.role === 'assistant' && <AiIcon />}
                                        <div
                                            className={`max-w-[85%] rounded-xl px-3 py-2 shadow-lg transition-all duration-300 ${
                                                msg.role === 'user'
                                                    ? 'rounded-br-sm bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                                                    : 'rounded-bl-sm border border-emerald-200 bg-white text-gray-800 hover:shadow-emerald-100'
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
                                                            <strong className="font-semibold text-emerald-600">
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
                                                            <code className="rounded bg-emerald-100 px-1 py-0.5 font-mono text-xs">
                                                                {children}
                                                            </code>
                                                        ),
                                                        hr: () => (
                                                            <hr className="my-2 border-emerald-300" />
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
                                        <div className="max-w-[70%] rounded-xl rounded-bl-sm border border-emerald-200 bg-white shadow-lg">
                                            <TypingIndicator />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Suggestions */}
                            {(chatHistory.length === 0 || showSuggestions) && (
                                <div className="flex-shrink-0">
                                    <QuickSuggestions onSuggestionSelect={handleSuggestionClick} />
                                </div>
                            )}
                        </div>

                        {/* Footer with input */}
                        <div className="flex-shrink-0 border-t border-emerald-200 bg-white p-3">
                            <div className="flex items-end gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2 transition-all duration-200 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-200 focus-within:shadow-lg focus-within:shadow-emerald-100">
                                {/* Quick Suggestions Toggle Button */}
                                {chatHistory.length > 0 && (
                                    <button
                                        onClick={toggleSuggestions}
                                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                                            showSuggestions
                                                ? 'scale-105 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg animate-pulse'
                                                : 'bg-emerald-200 text-emerald-600 hover:bg-emerald-300 hover:scale-110'
                                        }`}
                                        title={showSuggestions ? t('ซ่อนคำถามแนะนำ') : t('แสดงคำถามแนะนำ')}
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
                                    placeholder={t('พิมพ์คำถาม... 🌿')}
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
                                    className="flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 font-semibold text-white shadow-lg transition-all duration-200 hover:from-emerald-600 hover:to-green-700 hover:shadow-xl hover:shadow-emerald-200 active:scale-95 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
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
                                <span className="text-[10px] flex items-center">
                                    🌿 {t('AI Chaiyo')} • 
                                    <span className="ml-1 text-emerald-600 font-semibold">{t('Smart Irrigation')}</span>
                                </span>
                                <span className="flex items-center space-x-0.5 text-[10px]">
                                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></div>
                                    <span>{t('พร้อมให้คำปรึกษา')}</span>
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default FloatingAiChat;
