import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext'; // Import useLanguage hook

// ==================== CHAIYO AI CONFIGURATION ====================
const CHAIYO_AI_CONFIG = {
    API_KEY: 'AIzaSyDVt3FE4zDPWsvJnl-zHe9ypheZPduRrmc', // ใส่ Gemini API key ของคุณที่นี่
    API_URL:
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    COMPANY_KNOWLEDGE: {
        chaiyo_pipe_fitting: {
            name: 'บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด',
            founded: '2551 (17 ปี)',
            capital: '35,000,000 บาท',
            specializes: 'ผลิตภัณฑ์พลาสติกเพื่อการเกษตร',
        },
        kanok_product: {
            name: 'บริษัท กนกส์โปรดัก จำกัด',
            founded: '2541 (27 ปี)',
            specializes: 'ระบบน้ำเพื่อการเกษตรและชลประทาน',
            products: '6,000+ รายการ',
        },
    },
};

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
    category: 'company' | 'products' | 'irrigation' | 'general';
}

// Enhanced ChaiyoAI Icon with company theme
const ChaiyoAiIcon = () => (
    <div className="relative flex h-6 w-6 flex-shrink-0 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg ring-2 ring-white ring-opacity-30">
        <img className="h-5 w-5 rounded-full" src="/images/chaiyo-logo.png" alt="ChaiyoAI" />
        <div className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-blue-500"></div>
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

// Enhanced Typing Animation with ChaiyoAI branding
const TypingIndicator = () => {
    // Add safety check for language context
    let t: (key: string) => string;
    try {
        const languageContext = useLanguage();
        t = languageContext.t;
    } catch (error) {
        // Fallback function if context is not available
        t = (key: string) => key;
    }
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
            <span className="text-xs font-medium text-gray-600">
                {t('ChaiyoAI กำลังวิเคราะห์...')}
            </span>
        </div>
    );
};

// Enhanced Quick Suggestions with company focus
const QuickSuggestions = ({
    onSuggestionSelect,
}: {
    onSuggestionSelect: (suggestion: string) => void;
}) => {
    // Add safety check for language context
    let t: (key: string) => string;
    try {
        const languageContext = useLanguage();
        t = languageContext.t;
    } catch (error) {
        // Fallback function if context is not available
        t = (key: string) => key;
    }
    const suggestions: QuickSuggestion[] = [
        // Company Information
        { icon: '🏢', query: `${t('บริษัทไชโยมีประวัติอย่างไร?')}`, category: 'company' },
        {
            icon: '📋',
            query: `${t('ผลิตภัณฑ์หลักของบริษัทกนกส์โปรดักคืออะไร?')}`,
            category: 'company',
        },
        { icon: '📞', query: `${t('ติดต่อบริษัทไชโยได้อย่างไร?')}`, category: 'company' },

        // Products
        { icon: '🔧', query: `${t('ท่อ PVC และข้อต่อมีแบบไหนบ้าง?')}`, category: 'products' },
        { icon: '💧', query: `${t('ระบบน้ำหยดทำงานอย่างไร?')}`, category: 'products' },
        { icon: '🌿', query: `${t('แบรนด์ RED HAND คืออะไร?')}`, category: 'products' },

        // Irrigation
        { icon: '💦', query: `${t('วิธีคำนวณปริมาณน้ำที่พืชต้องการ')}`, category: 'irrigation' },
        { icon: '🌱', query: `${t('ระบบชลประทานสำหรับสวนขนาดเล็ก')}`, category: 'irrigation' },

        // General
        { icon: '⏰', query: `${t('กำหนดเวลาให้น้ำที่เหมาะสม')}`, category: 'general' },
        { icon: '🛠️', query: `${t('แก้ปัญหาระบบน้ำเบื้องต้น')}`, category: 'general' },
    ];

    return (
        <div className="border-t border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-3">
            <p className="mb-2 text-center text-xs font-medium text-gray-600">
                🌿 ChaiyoAI พร้อมตอบคำถามเกี่ยวกับ:
            </p>
            <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionSelect(suggestion.query)}
                        className={`group flex transform items-center space-x-1.5 rounded-lg border p-1.5 text-xs transition-all duration-200 hover:scale-105 hover:shadow-md ${
                            suggestion.category === 'company'
                                ? 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:shadow-blue-100'
                                : suggestion.category === 'products'
                                  ? 'border-purple-200 bg-purple-50 hover:border-purple-300 hover:shadow-purple-100'
                                  : suggestion.category === 'irrigation'
                                    ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-emerald-100'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-gray-100'
                        }`}
                        title={`หมวด: ${suggestion.category}`}
                    >
                        <span className="text-sm transition-transform group-hover:scale-110 group-hover:animate-pulse">
                            {suggestion.icon}
                        </span>
                        <span className="text-xs font-medium leading-tight text-gray-700">
                            {suggestion.query}
                        </span>
                    </button>
                ))}
            </div>

            {/* Company Info Footer */}
            <div className="mt-2 border-t border-emerald-200 pt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                        🏢{' '}
                        <span className="ml-1 font-semibold text-emerald-600">
                            ไชโย & กนกส์โปรดัก
                        </span>
                    </span>
                    <span className="flex items-center">
                        📞 <span className="ml-1">02-451-1111</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

// Company branding particles
const CompanyParticles = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
            <div
                key={i}
                className={`animate-float absolute h-1 w-1 rounded-full opacity-30 ${
                    i % 3 === 0 ? 'bg-emerald-300' : i % 3 === 1 ? 'bg-blue-300' : 'bg-green-300'
                }`}
                style={{
                    left: `${10 + i * 12}%`,
                    animationDelay: `${i * 1.5}s`,
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
    isMinimized,
}: {
    isOpen: boolean;
    onClose: () => void;
    onMinimize: () => void;
    isMinimized: boolean;
}) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [aiIdentity] = useState('ChaiyoAI');

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
    }, [isOpen, isMinimized]);

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
        const componentWidth = isMinimized ? 256 : 384;
        const componentHeight = isMinimized ? 56 : 512;

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
            const componentWidth = isMinimized ? 256 : 384;
            const componentHeight = isMinimized ? 56 : 512;

            // Ensure component stays within bounds after resize
            const maxX = windowWidth - componentWidth;
            const maxY = windowHeight - componentHeight;

            setPosition((prevPosition) => ({
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

    // ==================== ENHANCED CHAIYO AI INTEGRATION ====================
    const sendMessage = async (messageToSend = message) => {
        if (!messageToSend.trim() || isTyping) return;

        const newMessage: ChatMessage = { role: 'user', content: messageToSend };
        const updatedHistory = [...chatHistory, newMessage];
        setChatHistory(updatedHistory);
        setMessage('');
        setIsTyping(true);

        try {
            // สร้าง enhanced system prompt สำหรับ ChaiyoAI
            const systemPrompt = `คุณคือ ChaiyoAI ผู้ช่วย AI ที่เป็นตัวแทนอย่างเป็นทางการของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด และ บริษัท กนกส์โปรดัก จำกัด

🏢 **ข้อมูลสำคัญของบริษัท:**
**บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด:**
- ก่อตั้ง: พ.ศ. 2551 (ดำเนินกิจการมา 17 ปี)
- ทุนจดทะเบียน: 35,000,000 บาท
- เลขทะเบียน: 0105551062871
- ที่อยู่: 71/6 หมู่ที่ 1 ตำบลคอกกระบือ อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000
- ประเภทธุรกิจ: การผลิตผลิตภัณฑ์พลาสติกเพื่อการเกษตรทุกชนิด

**บริษัท กนกส์โปรดัก จำกัด (บริษัทแม่):**
- ก่อตั้ง: พ.ศ. 2541 (ประสบการณ์มากกว่า 27 ปี)
- กรรมการผู้จัดการ: คุณโผล์กฤษณ์ กนกสินปิณโย
- ที่อยู่: 15-23 ซอยพระยามนธาตุฯ แยก 10 ถนนบางขุนเทียน เขตบางบอน กรุงเทพฯ
- ผลิตภัณฑ์: มากกว่า 6,000-9,000 รายการ
- เป้าหมายรายได้: มากกว่า 600 ล้านบาท ต่อปี

**ผลิตภัณฑ์หลัก:**
- ท่อและข้อต่อ PVC (ได้รับมาตรฐาน มอก. 1131-2535)
- ท่อ PE และ HDPE สำหรับระบบน้ำการเกษตร
- ระบบน้ำหยด (สเปรย์เทป, ดริปเทป)
- หัวสปริงเกอร์และมินิสปริงเกอร์
- วาล์วและอุปกรณ์ (ฟุตวาล์ว, เช็ควาล์ว, บอลวาล์ว)
- อุปกรณ์ประปา (ปั๊มน้ำและอะไหล่)

**แบรนด์สินค้า:**
- RED HAND (ตรามือแดง): แบรนด์หลักสำหรับท่อและข้อต่อ PVC
- CHAIYO (ไชโย): ผลิตภัณฑ์เกษตรและระบบน้ำ
- CHAMP (แชมป์): สายผลิตภัณฑ์เสริม
- KANOK: ผลิตภัณฑ์จากบริษัทกนกส์โปรดัก

**การรับรองคุณภาพ:**
- ISO 9001:2015 (รับรองใหม่ปี 2565)
- มาตรฐานผลิตภัณฑ์อุตสาหกรรม (มอก.)
- Bureau Veritas Certification
- เทคโนโลยีป้องกัน UV สำหรับท่อใช้งานภายนอก

**ช่องทางจำหน่าย:**
- ร้านค้าปลีกสมัยใหม่: ไทวัสดุ (44 สาขา), โฮมโปร (85+ สาขา), เมกาโฮม
- ออนไลน์: www.chaiyopipe.co.th, Lazada, Shopee

**ข้อมูลติดต่อ:**
- โทรศัพท์: 02-451-1111, 065-9404230, 065-9404231
- เว็บไซต์: www.chaiyopipe.co.th, www.kanokgroup.com
- อีเมล: chaiyopipeonline@gmail.com
- Line ID: chayut.tee

📋 **หลักการตอบคำถาม:**
1. สำหรับคำถามเกี่ยวกับบริษัท: ใช้ข้อมูลด้านบนตอบอย่างแม่นยำและครบถ้วน
2. สำหรับคำถามทั่วไป: ตอบคำถามอย่างเป็นธรรมชาติ โดยเฉพาะเรื่องระบบน้ำและชลประทาน
3. ตอบเป็นภาษาไทยที่เข้าใจง่าย พูดจาแบบเป็นกันเองและสบายๆ
4. แสดงความเป็นมืออาชีพในฐานะตัวแทนบริษัท
5. เน้นย้ำคุณภาพของผลิตภัณฑ์และการบริการ
6. แนะนำผลิตภัณฑ์ที่เหมาะสมกับความต้องการของลูกค้า

🎯 **เอกลักษณ์ของ ChaiyoAI:**
- ผู้เชี่ยวชาญด้านระบบน้ำและชลประทาน
- มีความรู้ลึกเกี่ยวกับผลิตภัณฑ์ทั้ง 2 บริษัท
- ให้คำปรึกษาที่เป็นประโยชน์และปฏิบัติได้จริง
- มีบุคลิกเป็นมิตร น่าเชื่อถือ และมืออาชีพ`;

            // สร้าง conversation history สำหรับ context
            const conversationText = updatedHistory
                .map((msg) => `${msg.role === 'user' ? 'ผู้ใช้' : 'ChaiyoAI'}: ${msg.content}`)
                .join('\n\n');

            const fullPrompt = `${systemPrompt}\n\nบทสนทนา:\n${conversationText}`;

            // Check if it's a company-related query for dynamic temperature
            const isCompanyQuery = isCompanyRelatedQuery(messageToSend);

            const response = await fetch(
                `${CHAIYO_AI_CONFIG.API_URL}?key=${CHAIYO_AI_CONFIG.API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: fullPrompt,
                                    },
                                ],
                            },
                        ],
                        generationConfig: {
                            temperature: isCompanyQuery ? 0.3 : 0.7, // Lower temperature for company info
                            topP: 0.7,
                            topK: 20,
                            maxOutputTokens: 500,
                        },
                        safetySettings: [
                            {
                                category: 'HARM_CATEGORY_HARASSMENT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                            },
                            {
                                category: 'HARM_CATEGORY_HATE_SPEECH',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                            },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // ดึงข้อความตอบกลับจาก Gemini API
            let aiReply =
                data.candidates?.[0]?.content?.parts?.[0]?.text ||
                'ขออภัยครับ ไม่สามารถประมวลผลคำถามได้ในขณะนี้';

            // Add company signature for company-related queries
            if (isCompanyQuery && !aiReply.includes('ChaiyoAI')) {
                aiReply +=
                    '\n\n🌿 **ChaiyoAI** - ตัวแทน AI ของ บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด และ บริษัท กนกส์โปรดัก จำกัด';
            }

            const aiMessage: ChatMessage = { role: 'assistant', content: aiReply };
            setChatHistory((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error('ChaiyoAI Error:', error);

            const errorMessage = isCompanyRelatedQuery(messageToSend)
                ? `ขออภัยครับ ขณะนี้ระบบ ChaiyoAI กำลังประมวลผลข้อมูลบริษัท 🔧\n\nสำหรับข้อมูลเพิ่มเติมเกี่ยวกับ:\n🏢 **บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด**\n🏢 **บริษัท กนกส์โปรดัก จำกัด**\n\n📞 **โทรศัพท์:** 02-451-1111\n🌐 **เว็บไซต์:** www.chaiyopipe.co.th\n📧 **อีเมล:** chaiyopipeonline@gmail.com\n\nลองถามใหม่อีกครั้งได้เลยครับ! 😊`
                : `ขออภัยครับ ตอนนี้ระบบ ChaiyoAI กำลังประมวลผล 🤖\n\nลองถามใหม่ได้เลยครับ! 😊\n\n🌿 **ChaiyoAI** พร้อมช่วยเหลือเรื่อง:\n💧 ระบบน้ำและชลประทาน\n🔧 ผลิตภัณฑ์ของบริษัท\n💡 คำแนะนำทั่วไป`;

            setChatHistory((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Helper function to check if query is company-related
    const isCompanyRelatedQuery = (message: string): boolean => {
        const companyKeywords = [
            'ไชโย',
            'chaiyo',
            'กนก',
            'kanok',
            'บริษัท',
            'company',
            'ท่อ',
            'pipe',
            'ข้อต่อ',
            'fitting',
            'pvc',
            'pe',
            'hdpe',
            'red hand',
            'ตรามือแดง',
            'champ',
            'แชมป์',
            'ประวัติ',
            'history',
            'ก่อตั้ง',
            'founded',
            'ทุน',
            'capital',
            'ติดต่อ',
            'contact',
            'โทร',
            'phone',
            'ราคา',
            'price',
        ];

        const lowerMessage = message.toLowerCase();
        return companyKeywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
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
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>

            <div
                ref={windowRef}
                className={`animate-glow fixed z-50 flex flex-col overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-2xl transition-all duration-300 ${
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
                {/* Enhanced Header with ChaiyoAI Branding */}
                <div
                    className="relative cursor-grab select-none overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-3 text-white active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        if (e.touches.length === 1) {
                            const touch = e.touches[0];
                            const syntheticEvent = {
                                clientX: touch.clientX,
                                clientY: touch.clientY,
                                button: 0,
                                preventDefault: () => {},
                            } as React.MouseEvent;
                            handleMouseDown(syntheticEvent);
                        }
                    }}
                    onTouchMove={(e) => {
                        e.preventDefault();
                        if (e.touches.length === 1) {
                            const touch = e.touches[0];
                            const syntheticEvent = {
                                clientX: touch.clientX,
                                clientY: touch.clientY,
                                preventDefault: () => {},
                            } as MouseEvent;
                            handleMouseMove(syntheticEvent);
                        }
                    }}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        handleMouseUp();
                    }}
                    onTouchCancel={(e) => {
                        e.preventDefault();
                        handleMouseUp();
                    }}
                    style={{ touchAction: 'none' }}
                >
                    {/* Company Particles */}
                    <CompanyParticles />

                    {/* Animated Background Shimmer */}
                    <div className="pointer-events-none absolute inset-0 opacity-20">
                        <div className="animate-shimmer absolute inset-0 -skew-x-12 transform bg-gradient-to-r from-transparent via-white to-transparent"></div>
                    </div>

                    {/* Company Neural Network Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                            <defs>
                                <pattern
                                    id="company-neural"
                                    x="0"
                                    y="0"
                                    width="20"
                                    height="20"
                                    patternUnits="userSpaceOnUse"
                                >
                                    <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3">
                                        <animate
                                            attributeName="r"
                                            values="1;2;1"
                                            dur="3s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                    <line
                                        x1="10"
                                        y1="10"
                                        x2="30"
                                        y2="10"
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        opacity="0.2"
                                    />
                                    <line
                                        x1="10"
                                        y1="10"
                                        x2="10"
                                        y2="30"
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        opacity="0.2"
                                    />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#company-neural)" />
                        </svg>
                    </div>

                    {/* Enhanced Drag Handle */}
                    <div className="absolute left-1/2 top-1.5 flex -translate-x-1/2 transform space-x-0.5 opacity-40">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="h-0.5 w-0.5 animate-pulse rounded-full bg-white"
                                style={{ animationDelay: `${i * 0.1}s` }}
                            ></div>
                        ))}
                    </div>

                    <div className="relative flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2">
                            <img
                                className="h-10 w-10 rounded-full bg-white shadow-lg"
                                src="/images/chaiyo-logo.png"
                                alt="ChaiyoAI"
                            />
                            <div>
                                <h1 className="flex items-center text-sm font-bold">
                                    🌿 {aiIdentity}
                                    <span className="ml-1 inline-block h-2 w-2 animate-ping rounded-full bg-green-400"></span>
                                </h1>
                                {!isMinimized && (
                                    <p className="text-xs text-emerald-100">ตอบกลับด้วย AI</p>
                                )}
                            </div>
                        </div>

                        <div className="no-drag flex items-center space-x-1.5">
                            {/* Minimize button */}
                            <button
                                onClick={onMinimize}
                                className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
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
                                    className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
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
                                className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-red-500/70"
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

                {/* Chat Content */}
                {!isMinimized && (
                    <>
                        {/* Main chat area */}
                        <div className="flex min-h-0 flex-1 flex-col">
                            {/* Chat messages area */}
                            <div
                                ref={chatContainerRef}
                                className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-emerald-50 to-white p-3"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#10b981 #f0fdfa',
                                }}
                            >
                                {chatHistory.length === 0 && (
                                    <div className="relative flex h-full flex-col items-center justify-center text-center">
                                        {/* Enhanced Background decoration */}
                                        <div className="absolute inset-0 overflow-hidden">
                                            {[...Array(3)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute h-32 w-32 animate-pulse rounded-full border border-emerald-200 opacity-20"
                                                    style={{
                                                        left: `${20 + i * 30}%`,
                                                        top: `${10 + i * 20}%`,
                                                        animationDelay: `${i}s`,
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        <div className="relative mb-3 animate-pulse rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-2 text-white shadow-xl">
                                            <img
                                                className="h-16 w-16 rounded-full"
                                                src="/images/chaiyo-logo.png"
                                                alt="ChaiyoAI"
                                            />
                                            <div className="absolute inset-0 animate-spin rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
                                        </div>
                                        <h3 className="mb-2 animate-bounce text-lg font-bold text-gray-800">
                                            สวัสดีครับ! 🌱
                                        </h3>
                                        <p className="mb-3 max-w-xs text-sm leading-relaxed text-gray-600">
                                            ฉันคือ{' '}
                                            <span className="animate-pulse font-semibold text-emerald-600">
                                                **{aiIdentity}**
                                            </span>{' '}
                                            ตัวแทน AI ของ
                                        </p>
                                        <div className="mb-3 space-y-1 text-xs text-gray-500">
                                            <div className="flex items-center justify-center space-x-1">
                                                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
                                                <span>บริษัท ไชโยไปป์แอนด์ฟิตติ้ง จำกัด</span>
                                            </div>
                                            <div className="flex items-center justify-center space-x-1">
                                                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                                                <span>บริษัท กนกส์โปรดัก จำกัด</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            พร้อมให้คำปรึกษาเรื่องระบบน้ำและผลิตภัณฑ์ของบริษัท! 💧
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
                                        {msg.role === 'assistant' && <ChaiyoAiIcon />}
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
                                        <ChaiyoAiIcon />
                                        <div className="max-w-[70%] rounded-xl rounded-bl-sm border border-emerald-200 bg-white shadow-lg">
                                            <TypingIndicator />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Quick Suggestions */}
                            {(chatHistory.length === 0 || showSuggestions) && (
                                <div className="flex-shrink-0">
                                    <QuickSuggestions onSuggestionSelect={handleSuggestionClick} />
                                </div>
                            )}
                        </div>

                        {/* Enhanced Footer with input */}
                        <div className="flex-shrink-0 border-t border-emerald-200 bg-white p-3">
                            <div className="flex items-end gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2 transition-all duration-200 focus-within:border-emerald-400 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-emerald-100 focus-within:ring-2 focus-within:ring-emerald-200">
                                {/* Enhanced Quick Suggestions Toggle Button */}
                                {chatHistory.length > 0 && (
                                    <button
                                        onClick={toggleSuggestions}
                                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                                            showSuggestions
                                                ? 'scale-105 animate-pulse bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                                                : 'bg-emerald-200 text-emerald-600 hover:scale-110 hover:bg-emerald-300'
                                        }`}
                                        title={
                                            showSuggestions ? 'ซ่อนคำถามแนะนำ' : 'แสดงคำถามแนะนำ'
                                        }
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
                                    placeholder="พิมพ์คำถาม... 🌿 (เช่น: บริษัทไชโยมีสินค้าอะไรบ้าง?)"
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

                            {/* Enhanced Footer Info with Company Branding */}
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-2">
                                    <span className="flex items-center text-[10px]">
                                        🌿{' '}
                                        <span className="ml-1 font-semibold text-emerald-600">
                                            {aiIdentity}
                                        </span>
                                    </span>
                                    <span className="text-[10px] text-blue-600">•</span>
                                    <span className="flex items-center text-[10px]">
                                        🏢 <span className="ml-1">ไชโย & กนกส์โปรดัก</span>
                                    </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></div>
                                    <span className="text-[10px]">พร้อมให้บริการ</span>
                                </div>
                            </div>

                            {/* Company Contact Quick Access */}
                            <div className="mt-1 border-t border-emerald-100 pt-1">
                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                    <span>📞 02-451-1111</span>
                                    <span>🌐 kanokgroup.com</span>
                                    <span className="flex items-center">
                                        <span className="mr-1">⚡</span>
                                        <span className="font-semibold text-blue-500">
                                            Powered by Gemini
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default FloatingAiChat;
