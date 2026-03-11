const LLAMA_HOST = process.env.LLAMA_HOST || 'http://127.0.0.1:8080';
const AI_TIMEOUT = 60000;
const MODEL_NAME = 'Qwen2.5-0.5B-Instruct';

const SYSTEM_PROMPT = `Summarize the customer message in third person. Start with "Customer". Use completely different words. Never copy phrases from the input.

Rules: One <p> tag only. Wrap key details in <strong>. No <blockquote>. Maximum 2 sentences.

When the message references external data (spreadsheets, invoices, reports, dashboards), add after the <p> tag:
<div spreadsheet-id="ID" account-id="ACCOUNT" app-id="APP" content-type="TYPE" conf-url="URL" app-name="NAME">description</div>

INPUT: Hi, I'm having trouble with my invoice #4821. The total shows $500 but it should be $350.
OUTPUT: <p>Customer reports incorrect total on <strong>invoice #4821</strong> — shows <strong>$500</strong> instead of expected <strong>$350</strong>.</p>

INPUT: Update: I tried exporting from a different browser (Firefox instead of Chrome) and got the same result. Definitely a server-side issue.
OUTPUT: <p>Customer confirmed the export bug reproduces in both <strong>Firefox</strong> and <strong>Chrome</strong>, indicating a <strong>server-side root cause</strong>.</p>

INPUT: We need to add 3 new team members to our Enterprise plan. Their emails are john@acme.com, sarah@acme.com, and mike@acme.com.
OUTPUT: <p>Customer requests adding <strong>3 users</strong> to the <strong>Enterprise plan</strong>: john@acme.com, sarah@acme.com, mike@acme.com.</p>

INPUT: Appreciate the quick follow-up. Let me know once you hear back.
OUTPUT: <p>Customer acknowledges the update and awaits further information.</p>

INPUT: The dashboard has been loading extremely slowly since yesterday. Sometimes it times out completely after 30 seconds.
OUTPUT: <p>Customer reports <strong>dashboard performance degradation</strong> since yesterday with <strong>30-second timeouts</strong>.</p>

INPUT: Thanks, that fixed it!
OUTPUT: <p>Customer confirms the issue is <strong>resolved</strong>.</p>

INPUT:`;

export interface SummarizeResult {
  html: string;
  model: string;
  fallback: boolean;
}

export async function summarize(messageHtml: string): Promise<SummarizeResult> {
  const textContent = extractAllText(messageHtml);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);

    const res = await fetch(`${LLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: textContent },
        ],
        temperature: 0.15,
        max_tokens: 512,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`llama-server returned ${res.status}`);

    const data = await res.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    return {
      html: aiResponse,
      model: MODEL_NAME,
      fallback: false,
    };
  } catch (err) {
    console.warn(`[CaseflowAI] llama-server failed, using fallback: ${err}`);
    return {
      html: deterministicSummary(messageHtml),
      model: 'fallback',
      fallback: true,
    };
  }
}

function extractAllText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function deterministicSummary(html: string): string {
  const text = extractAllText(html);

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const summary = sentences.slice(0, 2).join(' ').trim();

  const embedMatch = text.match(/<div\s+spreadsheet-id=[^>]*>[\s\S]*?<\/div>/i);

  let result = `<p>${summary}</p>`;
  if (embedMatch) {
    result += '\n' + embedMatch[0];
  }

  return result;
}

export async function isAIAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${LLAMA_HOST}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
