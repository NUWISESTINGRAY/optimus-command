import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Optimus Prime cloned voice (ElevenLabs) — default fallback
const OPTIMUS_VOICE_ID = "kAIWans22T8FUotYdyIM";
const MODEL_ID = "eleven_turbo_v2_5";

// Per-agent voice map (fallback if DB lookup misses).
const AGENT_VOICES: Record<string, string> = {
  optimus: "kAIWans22T8FUotYdyIM",
  athena: "cgSgspJ2msm6clMCkdW9",
  cipher: "nPczCjzI2devNBz1zQrb",
  nova: "EXAVITQu4vr4xnSDxMaL",
  atlas: "JBFqnCBsd6RMkjVDRZzb",
  victoria: "Xb7hH8MSUJpSbSDYk0k2",
  sentinel: "onwK4e9ZLuTAKqWW03F9",
  aaron: "cjVigY5qzO86Huf0OWal",
  mark: "bIHbv24MWmeRgasZH58o",
  cody: "TX3LPaxmHKxFdv7VOQHJ",
  patty: "XrExE9yKIg1WjnnlVkGX",
  vicky: "FGY2WhTYpPnrIDTdsKH5",
  jerry: "CwhRBWXzGAHq8TQ4Fs17",
  dolly: "pFZP5JQG7iQjIQuC4Bku",
  maya: "SAz9YHcvj6GT2YYXdXww",
  angelina: "IKne3meq5aSn9XLyUdCD",
  frannie: "pqHfZKP75CvOlQylNhV4",
};

// Strip markdown so TTS reads naturally.
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

    const { text, format, codename, voice_id: explicitVoiceId } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = cleanForSpeech(text);
    if (!cleaned) {
      return new Response(JSON.stringify({ error: "empty after cleanup" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve voice: explicit > codename map > optimus default.
    let voiceId = explicitVoiceId as string | undefined;
    if (!voiceId && codename && typeof codename === "string") {
      voiceId = AGENT_VOICES[codename.toLowerCase()];
    }
    if (!voiceId) voiceId = OPTIMUS_VOICE_ID;

    // format=ogg returns Telegram-friendly opus; default is mp3 for browser playback.
    const outputFormat = format === "ogg" ? "opus_48000_128" : "mp3_44100_128";

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleaned,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!r.ok) {
      const err = await r.text();
      console.error("ElevenLabs TTS failed:", r.status, err);
      return new Response(JSON.stringify({ error: `TTS failed: ${r.status}`, details: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await r.arrayBuffer();
    const audioBase64 = base64Encode(buf);
    const mime = format === "ogg" ? "audio/ogg" : "audio/mpeg";

    return new Response(JSON.stringify({ audioBase64, mime, voice_id: voiceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimus-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});