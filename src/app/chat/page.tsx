// /app/chat/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

import styles from './chat.module.css';

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
};

type EmotionScore = {
  affection: number;
  awkwardness: number;
  disappointment: number;
};

const LOCAL_STORAGE_KEY = 'dateapp_chat_history';
const INITIAL_EMOTION_KEY = 'dateapp_emotion_scores';

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState<EmotionScore>(() => {
    if (typeof window !== 'undefined') {
      const savedEmotion = localStorage.getItem(INITIAL_EMOTION_KEY);
      return savedEmotion ? JSON.parse(savedEmotion) : { affection: 50, awkwardness: 50, disappointment: 50 };
    }
    return { affection: 50, awkwardness: 50, disappointment: 50 };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const userGender = searchParams.get('user');
  const partnerGender = searchParams.get('partner');

  const partnerAvatarSrc =
    partnerGender === 'female' ? '/avatars/female-avatar.png' : '/avatars/male-avatar.png';
  const partnerAvatarAlt =
    partnerGender === 'female' ? '여자친구 아바타' : '남자친구 아바타';

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
      localStorage.setItem(INITIAL_EMOTION_KEY, JSON.stringify(emotion));
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, emotion]);

  const updateUserBasedEmotion = (userInput: string) => {
    setEmotion(prev => {
      let affectionDelta = 0; // 변경될 델타 값을 let으로 선언
      let awkwardnessDelta = 0;
      let disappointmentDelta = 0;

      // 긍정적 표현
      if (userInput.includes('좋아') || userInput.includes('귀여워') || userInput.includes('고마워') || userInput.includes('최고')) {
        affectionDelta = 5;
        awkwardnessDelta = -2;
        disappointmentDelta = -1;
      }
      // 짧은/무의미한 답변
      else if (userInput.length > 0 && userInput.length <= 3) {
        awkwardnessDelta = 5;
      }
      // 부정적 표현
      else if (userInput.includes('됐어') || userInput.includes('몰라') || userInput.includes('됐거든') || userInput.includes('싫어')) {
        disappointmentDelta = 7;
        affectionDelta = -3;
        awkwardnessDelta = 2;
      }

      // 최종 계산된 값을 const로 할당하거나 직접 반환
      const finalAffection = Math.max(0, Math.min(100, prev.affection + affectionDelta));
      const finalAwkwardness = Math.max(0, Math.min(100, prev.awkwardness + awkwardnessDelta));
      const finalDisappointment = Math.max(0, Math.min(100, prev.disappointment + disappointmentDelta));

      return {
        affection: finalAffection,
        awkwardness: finalAwkwardness,
        disappointment: finalDisappointment
      };
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage: ChatMessage = { sender: 'user', text: input };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    setLoading(true);
    updateUserBasedEmotion(input);

    try {
      const messagesForApi = updatedMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messagesForApi,
          userGender,
          partnerGender,
          emotion
        })
      });

      const data = await res.json();
      const reply = data.reply ?? 'AI 응답 오류';
      const receivedEmotionUpdate = data.emotionUpdate || { affection: 0, awkwardness: 0, disappointment: 0 };

      // AI의 응답에 따른 감정 점수 업데이트 (여기서도 const 사용)
      setEmotion(prev => {
        const finalAffection = Math.max(0, Math.min(100, prev.affection + receivedEmotionUpdate.affection));
        const finalAwkwardness = Math.max(0, Math.min(100, prev.awkwardness + receivedEmotionUpdate.awkwardness));
        const finalDisappointment = Math.max(0, Math.min(100, prev.disappointment + receivedEmotionUpdate.disappointment));

        return {
          affection: finalAffection,
          awkwardness: finalAwkwardness,
          disappointment: finalDisappointment
        };
      });

      setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: reply }]);
    } catch (err) {
      console.error("Chat API error:", err);
      setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: '에러가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setInput('');
      setLoading(false);
    }
  };

  const getEmotionBarClassAndWidth = (score: number, emotionType: 'affection' | 'awkwardness' | 'disappointment') => {
    const width = Math.max(5, score);

    let className = '';
    switch (emotionType) {
      case 'affection':
        className = styles.affection;
        break;
      case 'awkwardness':
        className = styles.awkwardness;
        break;
      case 'disappointment':
        className = styles.disappointment;
        break;
    }
    return { className, width: `${width}%` };
  };

  return (
    <div className={styles.container}>
      <div className={styles.chatBox}>
        <div className={styles.header}>
          <Image
            src={partnerAvatarSrc}
            alt={partnerAvatarAlt}
            width={50}
            height={50}
            className={styles.partnerAvatar}
          />
          <h1 className={styles.partnerTitle}>나의 데이트 파트너</h1>
        </div>

        <div className={styles.emotionDisplay}>
          {/* 친밀함 바 */}
          <div className={styles.emotionBarContainer}>
            <span className={styles.emotionIcon}>❤️‍🔥</span>
            <span className={styles.emotionLabel}>친밀함</span>
            <div className={styles.emotionBarBackground}>
              {/* 함수 호출 결과를 변수에 저장 후 사용 */}
              {(() => {
                const barProps = getEmotionBarClassAndWidth(emotion.affection, "affection");
                return (
                  <div
                    className={`${styles.emotionBarFill} ${barProps.className}`}
                    style={{ width: barProps.width }}
                  />
                );
              })()}
            </div>
            <span className={styles.emotionScore}>
              {emotion.affection}
            </span>
          </div>

          {/* 어색함 바 */}
          <div className={styles.emotionBarContainer}>
            <span className={styles.emotionIcon}>😬</span>
            <span className={styles.emotionLabel}>어색함</span>
            <div className={styles.emotionBarBackground}>
              {/* 함수 호출 결과를 변수에 저장 후 사용 */}
              {(() => {
                const barProps = getEmotionBarClassAndWidth(emotion.awkwardness, "awkwardness");
                return (
                  <div
                    className={`${styles.emotionBarFill} ${barProps.className}`}
                    style={{ width: barProps.width }}
                  />
                );
              })()}
            </div>
            <span className={styles.emotionScore}>
              {emotion.awkwardness}
            </span>
          </div>

          {/* 서운함 바 */}
          <div className={styles.emotionBarContainer}>
            <span className={styles.emotionIcon}>💔</span>
            <span className={styles.emotionLabel}>서운함</span>
            <div className={styles.emotionBarBackground}>
              {/* 함수 호출 결과를 변수에 저장 후 사용 */}
              {(() => {
                const barProps = getEmotionBarClassAndWidth(emotion.disappointment, "disappointment");
                return (
                  <div
                    className={`${styles.emotionBarFill} ${barProps.className}`}
                    style={{ width: barProps.width }}
                  />
                );
              })()}
            </div>
            <span className={styles.emotionScore}>
              {emotion.disappointment}
            </span>
          </div>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.messageWrapper} ${msg.sender === "user"
                ? styles.userMessageWrapper
                : styles.botMessageWrapper}`}
            >
              <span
                className={`${styles.messageBubble} ${msg.sender === "user"
                  ? styles.userMessage
                  : styles.botMessage}`}
              >
                {msg.text}
              </span>
            </div>
          ))}
          {loading && (
            <div className={styles.messageWrapper}>
              <p className={styles.loadingMessage}>...입력 중</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputArea}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="메시지를 입력하세요..."
            className={styles.textInput}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className={styles.sendButton}
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}