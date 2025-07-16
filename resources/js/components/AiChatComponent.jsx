import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// ไอคอนสำหรับใช้ใน UI
const BotIcon = () => (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-white flex-shrink-0 shadow-md">
        AI
    </div>
);

const AiChatComponent = () => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isTyping]);

    const suggestedQuestions = [
        "โรงเรือนอัจฉริยะแบบ D ราคาเท่าไหร่?",
        "มินิสปริงเกลอร์ รุ่น 311-D ให้น้ำกี่ลิตรต่อนาที?",
        "What is Kanok Product?",
        "ช่วยออกแบบระบบน้ำสำหรับสวนทุเรียน 1 ไร่หน่อยครับ",
        "ปั๊มน้ำรุ่นไหนเหมาะกับโซนที่ใช้น้ำ 300 ลิตร/นาที ที่แรงดัน 3 บาร์?",
    ];

    const handleSuggestedQuestionClick = (question) => {
        sendMessage(question);
    };

    const sendMessage = async (messageToSend = message) => {
        if (!messageToSend.trim() || isTyping) return;

        const newMessage = { role: 'user', content: messageToSend };
        const updatedHistory = [...chatHistory, newMessage];
        setChatHistory(updatedHistory);
        setMessage('');
        setIsTyping(true);

        try {
            // **สำคัญ:** เรียกไปที่ endpoint ใหม่ที่เราสร้างขึ้น
            const response = await axios.post('/api/ai-chat', {
                messages: updatedHistory,
            });
            const aiReply = { role: 'assistant', content: response.data.reply };
            setChatHistory((prev) => [...prev, aiReply]);
        } catch (error) {
            console.error("Error sending message:", error);
            setChatHistory((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์',
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="mx-auto flex h-50 w-full max-w-4xl flex-col bg-white p-4 font-sans">
            <header className="mb-4 border-b pb-4">
                <h1 className="text-center text-3xl font-bold text-gray-800">
                    เกษตรอัจฉริยะ AI
                </h1>
                <p className="text-center text-md text-gray-500">ผู้เชี่ยวชาญระบบน้ำโดย กนกโปรดักส์ และ ไชโยไปป์</p>
            </header>

            <main 
                ref={chatContainerRef} 
                className="flex-1 space-y-6 overflow-y-auto rounded-lg bg-gray-50 p-6 shadow-inner"
            >
                {chatHistory.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && <BotIcon />}
                        <div
                            className={`prose prose-sm max-w-[85%] rounded-2xl px-4 py-2 shadow-md ${
                                msg.role === 'user'
                                    ? 'rounded-br-none bg-blue-500 text-white'
                                    : 'rounded-bl-none bg-white text-gray-800 border'
                            }`}
                        >
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex items-end gap-3">
                        <BotIcon />
                        <div className="max-w-[70%] animate-pulse rounded-2xl bg-gray-200 px-4 py-3">
                            <div className="h-2 w-16 rounded bg-gray-300"></div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="mt-4 pt-2">
                {chatHistory.length === 0 && !isTyping && (
                     <div className="mb-4 text-center">
                        <p className="text-sm text-gray-500 mb-3">ลองถามคำถามยอดฮิต:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestedQuestionClick(q)}
                                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <textarea
                        className="flex-1 resize-none border-none bg-transparent p-2 text-gray-800 placeholder-gray-400 focus:outline-none"
                        rows={1}
                        placeholder="พิมพ์คำถามของคุณที่นี่..."
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
                        className="rounded-md bg-blue-600 px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                        onClick={() => sendMessage()}
                        disabled={isTyping || !message.trim()}
                    >
                        ส่ง
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default AiChatComponent;
