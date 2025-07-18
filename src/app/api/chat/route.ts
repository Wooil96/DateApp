// /app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type OpenAIResponsePayload = {
    reply: string;
    emotionUpdate: {
        affection: number;
        awkwardness: number;
        disappointment: number;
    };
};

export async function POST(req: NextRequest) {
  const { messages, userGender, partnerGender, emotion } = await req.json();

  const emotionDescription = emotion
    ? `현재 대화의 감정 상태는 다음과 같아:
- 친밀함: ${emotion.affection}
- 어색함: ${emotion.awkwardness}
- 서운함: ${emotion.disappointment}`
    : '';

  const systemPrompt = `
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
대화의 맥락, 네가 생성할 답변의 뉘앙스, 그리고 이전 감정 상태를 고려하여,
이번 답변으로 인해 **사용자가 느낄 감정 변화**를 예측하고 점수로 반영해줘.
예를 들어, 네 답변이 사용자에게 기쁨이나 설렘을 주면 친밀함이 오르고,
불쾌감을 주거나 대화가 어색해지면 어색함/서운함이 오를 수 있어.
각 감정 점수 변화는 -5에서 +5 사이의 정수로 표현해줘.

너의 응답은 반드시 JSON 형식이어야 해. 형식은 다음과 같아:
\`\`\`json
{
  "reply": "여기에 너의 대화 답변을 작성해줘.",
  "emotionUpdate": {
    "affection": 0, // 친밀함 변화량 (-5 ~ +5)
    "awkwardness": 0, // 어색함 변화량 (-5 ~ +5)
    "disappointment": 0 // 서운함 변화량 (-5 ~ +5)
  }
}
\`\`\`
다른 어떤 텍스트도 JSON 응답 앞이나 뒤에 붙이지 마.
`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

  const messagesToSend: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.9,
        messages: messagesToSend,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return NextResponse.json({ error: data.error?.message || '응답 실패' }, { status: response.status });
    }

    // GPT의 응답이 JSON 문자열이므로 파싱
    let parsedData: OpenAIResponsePayload;
    let content: string | undefined; // 이 부분을 수정: content를 try 블록 밖에서 선언

    try {
        content = data.choices?.[0]?.message?.content; // 여기에서 값 할당

        // content가 유효한 문자열인지 확인하는 조건 추가
        if (typeof content !== 'string' || !content.trim()) {
            throw new Error('AI 응답 내용이 비어있거나 올바른 문자열 형식이 아닙니다.');
        }
        parsedData = JSON.parse(content);
    } catch (parseError) {
        // 이제 content 변수에 접근 가능
        console.error("Failed to parse AI response JSON:", content, parseError);
        // 클라이언트에게 반환하는 에러 메시지에 더 상세한 정보 포함
        return NextResponse.json({ error: 'AI 응답 형식 오류', details: String(parseError) }, { status: 500 });
    }

    const reply = parsedData.reply;
    const emotionUpdate = parsedData.emotionUpdate;

    return NextResponse.json({ reply, emotionUpdate });

  } catch (err) {
    console.error("API route try-catch error (network or unexpected):", err); // 로그 메시지 더 명확하게
    return NextResponse.json({ error: '서버 내부 오류 발생', details: String(err) }, { status: 500 });
  }
}