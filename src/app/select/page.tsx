// /app/select/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// CSS Modules 파일 import
import styles from "./select.module.css"; // import 방식 변경

export default function SelectPage() {
  const router = useRouter();
  const [userGender, setUserGender] = useState<"male" | "female" | null>(null);
  const [partnerGender, setPartnerGender] = useState<"male" | "female" | null>(
    null
  );

  const handleStart = () => {
    if (userGender && partnerGender) {
      router.push(`/chat?user=${userGender}&partner=${partnerGender}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* 로고 또는 앱 이름 */}
      <h1 className={styles.appTitle}>💖 DateApp 💖</h1>

      {/* 나의 성별 선택 */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>👤 나는...</p>
        <div className={styles.buttonGroup}>
          <button
            onClick={() => setUserGender("male")}
            className={`${styles.genderButton} ${userGender === "male"
              ? styles.maleSelected
              : styles.maleDefault}`}
          >
            {/* 아이콘 경로 확인: public/icons/male-user.png */}
            <Image src="/icons/male-user.png" alt="남자" width={64} height={64} />
            <span>🙋 남자</span>
          </button>
          <button
            onClick={() => setUserGender("female")}
            className={`${styles.genderButton} ${userGender === "female"
              ? styles.femaleSelected
              : styles.femaleDefault}`}
          >
            {/* 아이콘 경로 확인: public/icons/female-user.png */}
            <Image
              src="/icons/female-user.png"
              alt="여자"
              width={64}
              height={64}
            />
            <span>🙋‍♀️ 여자</span>
          </button>
        </div>
      </div>

      {/* 대화 상대 성별 선택 */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>💬 대화 상대는...</p>
        <div className={styles.buttonGroup}>
          <button
            onClick={() => setPartnerGender("male")}
            className={`${styles.genderButton} ${partnerGender === "male"
              ? styles.maleSelected
              : styles.maleDefault}`}
          >
            {/* 아이콘 경로 확인: public/icons/male-user.png */}
            <Image
              src="/icons/male-user.png"
              alt="남자 봇"
              width={64}
              height={64}
            />
            <span>👨 남자</span>
          </button>
          <button
            onClick={() => setPartnerGender("female")}
            className={`${styles.genderButton} ${partnerGender === "female"
              ? styles.femaleSelected
              : styles.femaleDefault}`}
          >
            {/* 아이콘 경로 확인: public/icons/female-user.png */}
            <Image
              src="/icons/female-user.png"
              alt="여자 봇"
              width={64}
              height={64}
            />
            <span>👩 여자</span>
          </button>
        </div>
      </div>

      {/* 대화 시작하기 버튼 */}
      <button
        onClick={handleStart}
        disabled={!userGender || !partnerGender}
        className={styles.startButton}
      >
        대화 시작하기 ✨
      </button>
    </div>
  );
}
