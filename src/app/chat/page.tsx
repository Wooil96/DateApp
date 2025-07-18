'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
};

type EmotionScore = {
  affection: number;
  awkwardness: number;
  disappointment: number;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState<EmotionScore>({
    affection: 0,
    awkwardness: 0,
    disappointment: 0
  });

  const searchParams = useSearchParams();
  const userGender = searchParams.get('user');
  const partnerGender = searchParams.get('partner');

  const updateEmotion = (userInput: string) => {
    if (userInput.includes('좋아') || userInput.includes('귀여워')) {
      setEmotion(prev => ({ ...prev, affection: prev.affection + 1 }));
    } else if (userInput.length <= 3) {
      setEmotion(prev => ({ ...prev, awkwardness: prev.awkwardness + 1 }));
    } else if (userInput.includes('됐어') || userInput.includes('몰라')) {
      setEmotion(prev => ({ ...prev, disappointment: prev.disappointment + 1 }));
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setLoading(true);

    updateEmotion(input);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: input,
          userGender,
          partnerGender,
          emotion
        })
      });

      const data = await res.json();
      const reply = data.reply ?? 'AI 응답 오류';

      setMessages([...newMessages, { sender: 'bot', text: reply }]);
    } catch (err) {
      setMessages([...newMessages, { sender: 'bot', text: '에러가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setInput('');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>💖 연애 챗봇</h1>
      <div style={{ margin: '1rem 0', minHeight: '300px' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.sender === 'user' ? 'right' : 'left',
              margin: '0.5rem 0'
            }}
          >
            <span
              style={{
                background: msg.sender === 'user' ? '#daf1ff' : '#ffe4ec',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                display: 'inline-block'
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
        {loading && <p>...입력 중</p>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="메시지를 입력하세요..."
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}
        />
        <button onClick={sendMessage} disabled={loading}>
          보내기
        </button>
      </div>
    </div>
  );
}