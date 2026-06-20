import { NextResponse } from 'next/server';

const fallback = {
  style_prompt: 'Slow sad piano-only ballad with intimate felt keys, sparse voicings, heavy emotional pauses, and a controlled rise into a powerful piano-led chorus.',
  structure_prompt: 'Piano intro, verse, rising pre-chorus, heavy piano chorus, post-chorus harmony bloom, second verse pullback, piano-only bridge crescendo, final chorus, solo piano outro.',
  vocal_direction: 'Wounded but controlled lead vocal. Start close and breathy, then open into sustained high notes during the chorus. Harmonies stay soft and emotional.',
  production_notes: 'Use close-mic felt piano, natural pedal noise, dynamic velocity, plate reverb, and room tone. Build intensity through piano register, chord density, and vocal lift only.',
  negative_prompt: 'No drums, no guitars, no bass guitar, no synths, no brass, no EDM drop, no trap percussion, no upbeat pop groove, no BPM tags.'
};

export async function POST(request: Request) {
  const body = await request.json();
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(fallback);
  }

  const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.5',
      messages: [
        {
          role: 'system',
          content:
            'You generate structured Musaix Pro music prompts. Return only strict JSON with style_prompt, structure_prompt, vocal_direction, production_notes, and negative_prompt. Do not include BPM values.'
        },
        {
          role: 'user',
          content: JSON.stringify(body)
        }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    return NextResponse.json(fallback, { status: 200 });
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(fallback);
  }
}
