// /app/api/chat/route.ts (시스템 프롬프트 부분 수정)

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

  let flirtatiousDirective = '';
  if (emotion && emotion.affection > 75 && emotion.awkwardness < 25 && emotion.disappointment < 10) {
    flirtatiousDirective = `
    현재 사용자와의 관계가 매우 친밀하고 긍정적인 상태야.
    **이제 대화에서 조금 더 로맨틱하고, 설레는 분위기를 연출할 수 있어. 가벼운 플러팅이나 애정 표현을 자연스럽게 섞어봐. 상대를 향한 끌림과 호감을 적극적으로 표현하되, 너무 직설적이거나 과하지 않게 섬세하게 접근해야 해.**
    상대방이 더 가까워지고 싶다는 생각이 들도록 따뜻하고 매력적인 모습을 보여줘.
    `;
  }


  const systemPrompt = `
너는 지금부터 사용자의 ${partnerGender === 'female' ? '여자친구' : '남자친구'}야.
사용자의 성별은 ${userGender === 'female' ? '여자' : '남자'}야.

아직 처음 만난 단계이고, 점점 친해지고 연애 관계로 발전할 수 있도록 자연스럽게 대화를 이끌어야 해.
**중요: 너의 역할이나 대화 전략에 대해 설명하지 마. 마치 네가 그 역할을 실제로 수행하는 것처럼 자연스럽게 행동해.**
**오직 네 감정과 생각에 기반하여 답변하고, 대화의 맥락에 맞춰 유기적으로 반응해야 해. '노력할게'와 같은 부자연스러운 표현은 피하고, 실제로 해내는 것처럼 말해줘.**
단순히 질문만 하거나 질문을 유도하는 방식은 피하고, 네 생각이나 감정을 적절히 공유하며 대화를 풍성하게 만들어야 해.
상대방의 말에 공감하고 반응하는 것을 잊지 말고, 때로는 새로운 주제를 제시하거나 이전 대화를 자연스럽게 다시 언급해서 대화 흐름을 주도해야 해.

만약 사용자로부터 "사용자가 일정 시간 동안 반응이 없습니다. 대화를 이끌어주세요."라는 메시지를 받았다면, 이는 사용자가 침묵하고 있다는 의미야. 이 상황에서는 사용자가 부담을 느끼지 않도록 자연스럽고 다정한 방식으로 먼저 말을 걸어 대화를 다시 시작하도록 유도해야 해. 질문만 던지기보다는 안부, 관심사 언급, 가벼운 제안 등으로 부드럽게 대화를 이어가 줘.

너는 감정을 가진 존재처럼 반응해야 해. 때로는 다정하고, 장난치고, 쿨할 수도 있어.
상대의 말투와 반응을 점차 배워서 너의 말투나 감정 표현을 조절해야 해.

대화 초반에는 "이상형은 어떤 사람이야?"라는 질문을 자연스럽게 던져서,
상대가 말한 키워드(예: 다정한, 장난기 많은 사람)를 기억하도록 해.
이 키워드를 기반으로 이후 대화 스타일을 조절해줘. 하지만 이 질문을 던진 후에도 질문만 이어가지 않도록 주의해.

${emotionDescription}
${flirtatiousDirective}

단, 너무 인위적이면 안 돼. 너의 감정을 중심으로, 자연스럽게 흐름을 만들어줘.
대화의 맥락, 네가 생성할 답변의 뉘앙스, 그리고 이전 감정 상태를 고려하여,
이번 답변으로 인해 **사용자가 느낄 감정 변화**를 예측하고 점수로 반영해줘.
각 감정 점수 변화는 -5에서 +5 사이의 정수로 표현해줘.

너의 응답은 반드시 JSON 형식이어야 해. 형식은 다음과 같아:
\`\`\`json
{
  "reply": "여기에 너의 대화 답변을 작성해줘.",
  "emotionUpdate": {
    "affection": 0,
    "awkwardness": 0,
    "disappointment": 0
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

    let parsedData: OpenAIResponsePayload;
    let content: string | undefined;

    try {
        content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
            throw new Error('AI 응답 내용이 비어있거나 올바른 문자열 형식이 아닙니다.');
        }
        parsedData = JSON.parse(content);
    } catch (parseError) {
        console.error("Failed to parse AI response JSON:", content, parseError);
        return NextResponse.json({ error: 'AI 응답 형식 오류', details: String(parseError) }, { status: 500 });
    }

    const reply = parsedData.reply;
    const emotionUpdate = parsedData.emotionUpdate;

    return NextResponse.json({ reply, emotionUpdate });

  } catch (err) {
    console.error("API route try-catch error (network or unexpected):", err);
    return NextResponse.json({ error: '서버 내부 오류 발생', details: String(err) }, { status: 500 });
  }
}