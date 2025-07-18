// src/components/chat/ChatContainer.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const LOCAL_STORAGE_KEY_CHAT_HISTORY = 'dateapp_chat_history';
const LOCAL_STORAGE_KEY_EMOTION_SCORES = 'dateapp_emotion_scores';
const LOCAL_STORAGE_KEY_REMAINING_CONVERSATIONS = 'dateapp_remaining_conversations';
const LOCAL_STORAGE_KEY_LAST_REPLENISH_TIME = 'dateapp_last_replenish_time';

const INACTIVITY_TIMEOUT_MS = 30 * 1000; // 30초
const REPLENISH_INTERVAL_MS = 5 * 60 * 1000; // 5분
const MAX_CONVERSATIONS = 50; // 최대 대화 횟수

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState<EmotionScore>(() => {
    if (typeof window !== 'undefined') {
      const savedEmotion = localStorage.getItem(LOCAL_STORAGE_KEY_EMOTION_SCORES);
      return savedEmotion ? JSON.parse(savedEmotion) : { affection: 50, awkwardness: 50, disappointment: 0 };
    }
    return { affection: 50, awkwardness: 50, disappointment: 0 };
  });
  const [remainingConversations, setRemainingConversations] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedCount = localStorage.getItem(LOCAL_STORAGE_KEY_REMAINING_CONVERSATIONS);
      return savedCount ? parseInt(savedCount, 10) : MAX_CONVERSATIONS;
    }
    return MAX_CONVERSATIONS;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const replenishIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const searchParams = useSearchParams();
  const userGender = searchParams.get('user');
  const partnerGender = searchParams.get('partner');

  const partnerAvatarSrc =
    partnerGender === 'female' ? '/avatars/female-avatar.png' : '/avatars/male-avatar.png';
  const partnerAvatarAlt =
    partnerGender === 'female' ? '여자친구 아바타' : '남자친구 아바타';

  // localStorage에서 데이터 로드 (초기 마운트 시)
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY_CHAT_HISTORY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }

      const savedCount = localStorage.getItem(LOCAL_STORAGE_KEY_REMAINING_CONVERSATIONS);
      if (savedCount) {
        setRemainingConversations(parseInt(savedCount, 10));
      }

      const savedLastReplenishTime = localStorage.getItem(LOCAL_STORAGE_KEY_LAST_REPLENISH_TIME);
      let lastReplenishTime = savedLastReplenishTime ? parseInt(savedLastReplenishTime, 10) : Date.now();

      const now = Date.now();
      const elapsed = now - lastReplenishTime;
      const replenishmentsToAdd = Math.floor(elapsed / REPLENISH_INTERVAL_MS);

      if (replenishmentsToAdd > 0) {
        setRemainingConversations(prev => Math.min(MAX_CONVERSATIONS, prev + replenishmentsToAdd * 10));
        lastReplenishTime = now;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY_LAST_REPLENISH_TIME, lastReplenishTime.toString());

    } catch (error) {
      console.error("Failed to load initial data from localStorage:", error);
    }
  }, []);

  // 메시지, 감정, 남은 횟수 상태 변경 시 localStorage 저장 및 자동 스크롤
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CHAT_HISTORY, JSON.stringify(messages));
      localStorage.setItem(LOCAL_STORAGE_KEY_EMOTION_SCORES, JSON.stringify(emotion));
      localStorage.setItem(LOCAL_STORAGE_KEY_REMAINING_CONVERSATIONS, remainingConversations.toString());
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, emotion, remainingConversations]);


  // 5분마다 대화 횟수 충전 로직 (기존과 동일)
  useEffect(() => {
    if (replenishIntervalRef.current) {
      clearInterval(replenishIntervalRef.current);
    }

    replenishIntervalRef.current = setInterval(() => {
      setRemainingConversations(prev => {
        const newCount = Math.min(MAX_CONVERSATIONS, prev + 10);
        localStorage.setItem(LOCAL_STORAGE_KEY_LAST_REPLENISH_TIME, Date.now().toString());
        return newCount;
      });
    }, REPLENISH_INTERVAL_MS);

    return () => {
      if (replenishIntervalRef.current) {
        clearInterval(replenishIntervalRef.current);
      }
    };
  }, []);


  const updateUserBasedEmotion = useCallback((userInput: string) => { // useCallback 추가
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
  }, []); // 의존성 없음


  // ** sendProactiveMessage 함수를 먼저 선언하고 useCallback으로 감쌉니다. **
  const sendProactiveMessage = useCallback(async () => {
    if (loading) return;

    if (remainingConversations <= 0) {
      console.log("Not sending proactive message: daily limit reached.");
      return;
    }
    setRemainingConversations(prev => prev - 1);

    console.log("Sending proactive message...");
    setLoading(true);

    try {
      const messagesForApi = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const proactiveTriggerMessage: ChatMessage = { sender: 'user', text: "사용자가 일정 시간 동안 반응이 없습니다. 대화를 이끌어주세요." };
      const updatedMessagesForApi = [...messagesForApi, { role: 'user', content: proactiveTriggerMessage.text }];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: updatedMessagesForApi,
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
    }
  }, [loading, messages, remainingConversations, userGender, partnerGender, emotion]); // 필요한 의존성 추가

  // resetInactivityTimer 함수를 sendProactiveMessage 뒤에 선언하고 useCallback으로 감쌉니다.
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (!loading && messages.length > 0 && messages[messages.length - 1].sender === 'bot') {
      inactivityTimerRef.current = setTimeout(() => {
        sendProactiveMessage(); // 이제 sendProactiveMessage가 정의되어 있습니다.
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [loading, messages, sendProactiveMessage]);


  const sendMessage = async () => {
    if (remainingConversations <= 0) {
      alert("오늘 대화 횟수를 모두 사용했습니다. 5분마다 10회씩 충전됩니다.");
      return;
    }

    if (!input.trim()) return;

    resetInactivityTimer();

    const newUserMessage: ChatMessage = { sender: 'user', text: input };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    setLoading(true);
    updateUserBasedEmotion(input);
    setRemainingConversations(prev => prev - 1);

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

        <div className={styles.conversationCounter}>
          남은 대화 횟수: <span className={styles.countNumber}>{remainingConversations}</span>회
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