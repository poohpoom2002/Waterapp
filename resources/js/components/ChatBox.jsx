import React, { useState } from 'react';
import axios from 'axios';

const ChatBox = () => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false); // 🟡 สถานะกำลังพิมพ์

    const sendMessage = async () => {
        if (!message.trim()) return;
      
        const newMessage = { role: 'user', content: message };
        const updatedHistory = [...chatHistory, newMessage];
      
        setChatHistory(updatedHistory);
        setMessage('');
        setIsTyping(true);
      
        try {
          const response = await axios.post('http://127.0.0.1:8000/api/chat', {
            messages: updatedHistory,
          });
          const aiReply = { role: 'assistant', content: response.data.reply };
          setChatHistory(prev => [...prev, aiReply]);
        } catch (error) {
          setChatHistory(prev => [...prev, {
            role: 'assistant', content: 'เกิดข้อผิดพลาดในการเชื่อมต่อ API'
          }]);
        } finally {
          setIsTyping(false);
        }
      };
      

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-4">สอบถามข้อมูลเพิ่มเติม (เป็นการตอบกลับจาก AI)</h2>

            <div className="h-[400px] overflow-y-auto border border-gray-300 rounded p-4 bg-white space-y-4">
                {chatHistory.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`px-4 py-2 rounded-2xl max-w-[70%] text-sm ${
                                msg.role === 'user'
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-gray-200 text-black rounded-bl-none'
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* 🟡 กำลังพิมพ์ */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-2xl max-w-[70%] bg-gray-100 text-gray-500 text-sm italic animate-pulse">
                            กำลังพิมพ์...
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 flex gap-2">
                <textarea
                    className="w-full border p-2 rounded resize-none text-black"
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
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
