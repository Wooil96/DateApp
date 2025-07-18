// src/app/chat/page.tsx
import { Suspense } from "react"; // Suspense 임포트
import ChatContainer from "../../components/chat/ChatContainer"; // 새로 생성한 컴포넌트 임포트

export default function ChatPage() {
  // 컴포넌트 이름 변경 (선택 사항)
  return (
    // Suspense로 ChatContainer를 감싸서 클라이언트 사이드 렌더링을 기다립니다.
    <Suspense fallback={<div>로딩 중...</div>}>
      <ChatContainer />
    </Suspense>
  );
}
