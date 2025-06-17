import React, { useState } from 'react';
import axios from 'axios';

const ChatBox = () => {
    const [message, setMessage] = useState('');
    const [reply, setReply] = useState('');

    const sendMessage = async () => {
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/chat', { message });
            setReply(response.data.reply);
        } catch (error) {
            setReply('เกิดข้อผิดพลาดในการเชื่อมต่อ API');
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto text-black">
            <h2 className="text-xl font-bold mb-4">AI Chat</h2>
            <textarea
                className="w-full border p-2 text-black"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
            <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded" onClick={sendMessage}>
                ส่งคำถาม
            </button>
            <div className="mt-4 bg-gray-100 p-4 rounded text-black">
                <strong>AI ตอบ:</strong>
                <p>{reply}</p>
            </div>
        </div>
    );
};

export default ChatBox;
