// src/components/chat/ChatContainer.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'; // useCallback 추가
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

import styles from '../../app/chat/chat.module.css';

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
const INACTIVITY_TIMEOUT_MS = 30 * 1000; // 30초 (30 * 1000 밀리초)

export default function ChatContainer() {
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
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null); // 타이머 ID를 저장할 ref

  const searchParams = useSearchParams();
  const userGender = searchParams.get('user');
  const partnerGender = searchParams.get('partner');

  const partnerAvatarSrc =
    partnerGender === 'female' ? '/avatars/female-avatar.png' : '/avatars/male-avatar.png';
  const partnerAvatarAlt =
    partnerGender === 'female' ? '여자친구 아바타' : '남자친구 아바타';

  // localStorage에서 메시지 로드
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

  // 메시지나 감정 상태 변경 시 localStorage 저장 및 자동 스크롤
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

  // 비활성 타이머를 관리하는 함수
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // 봇이 마지막으로 말하고 로딩이 완료된 상태에서만 타이머 시작
    if (!loading && messages.length > 0 && messages[messages.length - 1].sender === 'bot') {
      inactivityTimerRef.current = setTimeout(() => {
        sendProactiveMessage(); // 일정 시간 후 선제적 메시지 전송
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [loading, messages]); // loading 또는 messages가 변할 때마다 함수 재생성

  // 컴포넌트 마운트/업데이트 시 타이머 관리
  useEffect(() => {
    resetInactivityTimer();

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]); // resetInactivityTimer 함수가 변할 때 실행

  // 사용자 입력에 따른 감정 점수 업데이트 로직
  const updateUserBasedEmotion = (userInput: string) => {
    setEmotion(prev => {
      let affectionDelta = 0;
      let awkwardnessDelta = 0;
      let disappointmentDelta = 0;

      if (userInput.includes('좋아') || userInput.includes('귀여워') || userInput.includes('고마워') || userInput.includes('최고')) {
        affectionDelta = 5;
        awkwardnessDelta = -2;
        disappointmentDelta = -1;
      } else if (userInput.length > 0 && userInput.length <= 3) {
        awkwardnessDelta = 5;
      } else if (userInput.includes('됐어') || userInput.includes('몰라') || userInput.includes('됐거든') || userInput.includes('싫어')) {
        disappointmentDelta = 7;
        affectionDelta = -3;
        awkwardnessDelta = 2;
      }

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

  // 일반 메시지 전송 함수
  const sendMessage = async () => {
    if (!input.trim()) return;

    resetInactivityTimer(); // 사용자 메시지 보낼 때 타이머 초기화

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
      // AI 응답 후 타이머 다시 시작
      // resetInactivityTimer(); // 이 부분은 useEffect에서 messages 변경 감지로 처리됨
    }
  };

  // 선제적 메시지 전송 함수
  const sendProactiveMessage = async () => {
    if (loading) return; // 이미 로딩 중이면 보내지 않음

    console.log("Sending proactive message...");
    setLoading(true);

    try {
      const messagesForApi = messages.map(msg => ({ // 현재까지의 모든 메시지 전달
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      // AI에게 선제적 메시지임을 알리는 특수 메시지 추가 (프롬프트에서 해석)
      const proactiveTriggerMessage: ChatMessage = { sender: 'user', text: "사용자가 일정 시간 동안 반응이 없습니다. 대화를 이끌어주세요." };
      const updatedMessagesForApi = [...messagesForApi, { role: 'user', content: proactiveTriggerMessage.text }];


      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: updatedMessagesForApi, // 선제적 메시지 요청을 포함한 메시지 기록
          userGender,
          partnerGender,
          emotion
        })
      });

      const data = await res.json();
      const reply = data.reply ?? 'AI 응답 오류';
      const receivedEmotionUpdate = data.emotionUpdate || { affection: 0, awkwardness: 0, disappointment: 0 };

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
      console.error("Proactive chat API error:", err);
      setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: '선제적 메시지 전송 중 에러가 발생했습니다.' }]);
    } finally {
      setLoading(false);
      // AI 응답 후 타이머 재설정은 useEffect에서 messages 변경 감지로 처리됨
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
          <div className={styles.emotionBarContainer}>
            <span className={styles.emotionIcon}>❤️‍🔥</span>
            <span className={styles.emotionLabel}>친밀함</span>
            <div className={styles.emotionBarBackground}>
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

          <div className={styles.emotionBarContainer}>
            <span className={styles.emotionIcon}>😬</span>
            <span className={styles.emotionLabel}>어색함</span>
            <div className={styles.emotionBarBackground}>
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

          <div className={styles.emotionBarContainer}>
            <span className={styles.emotionIcon}>💔</span>
            <span className={styles.emotionLabel}>서운함</span>
            <div className={styles.emotionBarBackground}>
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