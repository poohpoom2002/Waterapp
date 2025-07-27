import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // ⬅️ 1. Import library

const ChatBox = () => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    const sendMessage = async () => {
        if (!message.trim()) return;

        const newMessage = { role: 'user', content: message };
        const updatedHistory = [...chatHistory, newMessage];

        setChatHistory(updatedHistory);
        setMessage('');
        setIsTyping(true);

        try {
            const response = await axios.post('/api/chat', {
                messages: updatedHistory,
            });
            const aiReply = { role: 'assistant', content: response.data.reply };
            setChatHistory((prev) => [...prev, aiReply]);
        } catch (error) {
            setChatHistory((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'เกิดข้อผิดพลาดในการเชื่อมต่อ API',
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="mx-auto h-[200px] w-[500px] p-6">
            <h2 className="mb-4 text-xl font-bold">สอบถามข้อมูลเพิ่มเติม (เป็นการตอบกลับจาก AI)</h2>

            <div className="h-[300px] space-y-4 overflow-y-auto rounded border border-gray-300 bg-white p-4">
                {chatHistory.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`prose max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                                // ⬅️ 2. เพิ่มคลาส 'prose' (แนะนำ)
                                msg.role === 'user'
                                    ? 'rounded-br-none bg-blue-500 text-white'
                                    : 'rounded-bl-none bg-gray-200 text-black'
                            }`}
                        >
                            {/* ⬅️ 3. ใช้ ReactMarkdown กับข้อความของ AI */}
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="max-w-[70%] animate-pulse rounded-2xl bg-gray-100 px-4 py-2 text-sm italic text-gray-500">
                            กำลังพิมพ์...
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 flex gap-2">
                <textarea
                    className="w-full resize-none rounded border p-2 text-black"
                    rows={2}
                    placeholder="พิมพ์ข้อความของคุณ..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />
                <button
                    className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    onClick={sendMessage}
                    disabled={isTyping}
                >
                    {isTyping ? 'กำลังตอบ...' : 'ส่ง'}
                </button>
            </div>
        </div>
    );
};

export default ChatBox;
