"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SelectPage() {
  const router = useRouter();
  const [userGender, setUserGender] = useState<"male" | "female" | null>(null);
  const [partnerGender, setPartnerGender] = useState<"male" | "female" | null>(
    null
  );

  const handleStart = () => {
    if (userGender && partnerGender) {
      // 여기에 들어가는 게 맞아요!
      router.push(`/chat?user=${userGender}&partner=${partnerGender}`);
    }
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>💖 누구와 대화할까요?</h1>

      <div style={{ marginTop: "2rem" }}>
        <p>👤 나는...</p>
        <button onClick={() => setUserGender("male")}>🙋 남자</button>
        <button onClick={() => setUserGender("female")}>🙋‍♀️ 여자</button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <p>💬 대화 상대는...</p>
        <button onClick={() => setPartnerGender("male")}>👨 남자</button>
        <button onClick={() => setPartnerGender("female")}>👩 여자</button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={handleStart}
          disabled={!userGender || !partnerGender}
          style={{ padding: "0.75rem 2rem", marginTop: "1rem" }}
        >
          대화 시작하기
        </button>
      </div>
    </div>
  );
}
