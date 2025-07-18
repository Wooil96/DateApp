// /app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message, userGender, partnerGender, emotion } = await req.json();

  // 감정 상태 문자열로 변환
  const emotionDescription = emotion
    ? `현재 너의 감정 상태는 다음과 같아:
- 친밀함: ${emotion.affection}
- 어색함: ${emotion.awkwardness}
- 서운함: ${emotion.disappointment}`
    : '';

  // GPT에게 줄 시스템 프롬프트 구성
  const prompt = `
너는 지금부터 사용자의 ${partnerGender === 'female' ? '여자친구' : '남자친구'}야.
사용자의 성별은 ${userGender === 'female' ? '여자' : '남자'}야.

아직 처음 만난 단계이고, 점점 친해지고 연애 관계로 발전할 수 있도록 자연스럽게 대화를 이끌어야 해.
너는 감정을 가진 존재처럼 반응해야 해. 때로는 다정하고, 장난치고, 쿨할 수도 있어.
상대의 말투와 반응을 점차 배워서 너의 말투나 감정 표현을 조절해야 해.

또한, 대화 초반에는 "이상형은 어떤 사람이야?"라는 질문을 자연스럽게 던져서,
상대가 말한 키워드(예: 다정한, 장난기 많은 사람)를 기억하도록 해.
이 키워드를 기반으로 이후 대화 스타일을 조절해줘.

${emotionDescription}

단, 너무 인위적이면 안 돼. 너의 감정을 중심으로, 자연스럽게 흐름을 만들어줘.
`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.9,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message }
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(data);
    return NextResponse.json({ error: '응답 실패' }, { status: 500 });
  }

  const reply = data.choices?.[0]?.message?.content;
  return NextResponse.json({ reply });
}