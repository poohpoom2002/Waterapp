// import React, { useState } from 'react';
// import axios from 'axios';

// const ChatBox = () => {
//     const [message, setMessage] = useState('');
//     const [reply, setReply] = useState('');

//     const sendMessage = async () => {
//         try {
//             const response = await axios.post('http://127.0.0.1:8000/api/chat', { message });
//             setReply(response.data.reply);
//         } catch (error) {
//             setReply('เกิดข้อผิดพลาดในการเชื่อมต่อ API');
//         }
//     };

//     return (
//         <div className="p-6 max-w-xl mx-auto text-black">
//             <h2 className="text-xl font-bold mb-4">AI Chat</h2>
//             <textarea
//                 className="w-full border p-2 text-black"
//                 rows={3}
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//             />
//             <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded" onClick={sendMessage}>
//                 ส่งคำถาม
//             </button>
//             <div className="mt-4 bg-gray-100 p-4 rounded text-black">
//                 <strong>AI ตอบ:</strong>
//                 <p>{reply}</p>
//             </div>
//         </div>
//     );
// };

// export default ChatBox;
// resources/js/Components/ChatBox.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'model';
    content: string;
}

const ChatBox = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: 'สวัสดีครับ! มีอะไรให้ช่วยมั้ยครับ?' }, // Initial welcome message
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Define popular questions
    const popularQuestions = [
        'สภาพอากาศวันนี้เป็นอย่างไร?',
        'แนะนำร้านอาหารอร่อยๆ แถวนี้หน่อย',
        'ช่วยสรุปข่าวเด่นวันนี้ให้หน่อย',
        'อธิบายเรื่อง Blockchain แบบง่ายๆ',
        'วิธีการปลูกต้นไม้เบื้องต้น',
    ];

    useEffect(() => {
        // This effect scrolls to the bottom whenever messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!message.trim()) return; // Prevent sending empty messages

        const userMessage: Message = { role: 'user', content: message };
        // Add user message to state immediately for display
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setMessage(''); // Clear input field

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/chat', {
                // Send all current messages for context, adjusting role for the backend
                // 'model' from frontend (for AI) should be 'assistant' for backend processing to convert to 'model' for Gemini
                messages: [...messages, userMessage].map((msg) => ({
                    role: msg.role === 'model' ? 'assistant' : msg.role,
                    content: msg.content,
                })),
            });

            const aiReplyContent = response.data.reply;
            const aiReply: Message = { role: 'model', content: aiReplyContent };
            // Add AI reply to state
            setMessages((prevMessages) => [...prevMessages, aiReply]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                role: 'model',
                content: 'เกิดข้อผิดพลาดในการเชื่อมต่อ API',
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Send on Enter, allow Shift + Enter for new line
            e.preventDefault();
            sendMessage();
        }
    };

    const handlePopularQuestionClick = (question: string) => {
        setMessage(question); // Set the question to the input field
        // Optionally, you can also automatically send the message here if desired
        // sendMessage();
    };

    return (
        <div className="mx-auto flex h-screen max-w-2xl flex-col p-6 text-black">
            {' '}
            {/* Increased max-w for questions */}
            <h2 className="mb-4 text-xl font-bold">AI Chat</h2>
            {/* Chat display area - allows scrolling */}
            <div className="mb-4 flex-1 overflow-y-auto rounded border bg-gray-100 p-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500">เริ่มต้นการสนทนา...</div>
                )}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                    >
                        <div
                            className={`inline-block rounded p-2 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}
                        >
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} /> {/* Invisible div to scroll to */}
            </div>
            {/* Input and Popular Questions area */}
            <div className="flex flex-shrink-0 items-end">
                {/* Popular Questions */}
                <div className="w-1/3 pr-4">
                    <h3 className="mb-2 font-semibold">คำถามยอดนิยม:</h3>
                    <div className="flex flex-col space-y-2">
                        {popularQuestions.map((q, index) => (
                            <button
                                key={index}
                                className="cursor-pointer rounded bg-gray-200 p-2 text-left text-sm hover:bg-gray-300"
                                onClick={() => handlePopularQuestionClick(q)}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message Input and Send Button */}
                <div className="flex-1">
                    <textarea
                        className="w-full border p-2 text-black"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="พิมพ์ข้อความของคุณที่นี่..."
                    />
                    <button
                        className="mt-2 w-full rounded bg-blue-500 px-4 py-2 text-white"
                        onClick={sendMessage}
                        disabled={!message.trim()}
                    >
                        ส่งคำถาม
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatBox;
