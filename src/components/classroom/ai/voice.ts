export type SpeechStatus = "idle" | "listening" | "error";

declare global {
  // Minimal Web Speech API typings (not present in some TS lib.dom versions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { webkitSpeechRecognition?: any; SpeechRecognition?: any }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type SpeechRecognition = any;
}

export function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

export function createSpeechRecognizer(opts: {
  onText: (text: string) => void;
  onStatus: (status: SpeechStatus, errorMessage?: string) => void;
  onInterimText?: (text: string) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    throw new Error("SpeechRecognition is not supported in this browser.");
  }

  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;

  let finalText = "";
  let shouldKeepAlive = false;
  let isManuallyStopping = false;

  rec.onstart = () => {
    opts.onStatus("listening");
  };

  rec.onerror = (e: { error: string; message?: string }) => {
    const msg = e.message ?? e.error;
    opts.onStatus("error", msg);

    // Some errors end the session; keepalive restart handles benign ends.
    // If mic is blocked, user must enable permission.
  };

  rec.onend = () => {
    opts.onStatus("idle");

    const cleaned = finalText.trim();
    finalText = "";
    if (cleaned) opts.onText(cleaned);
    if (opts.onInterimText) opts.onInterimText("");

    if (shouldKeepAlive && !isManuallyStopping) {
      // Chrome frequently ends recognition after a short time; restart it.
      setTimeout(() => {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }, 150);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rec.onresult = (event: any) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const txt = res[0]?.transcript ?? "";
      if (res.isFinal) {
        finalText += txt;
      } else {
        interim += txt;
      }
    }

    if (opts.onInterimText) opts.onInterimText(interim.trim());
  };

  return {
    start: () => {
      shouldKeepAlive = true;
      isManuallyStopping = false;
      rec.start();
    },
    stop: () => {
      shouldKeepAlive = false;
      isManuallyStopping = true;
      rec.stop();
    },
    abort: () => {
      shouldKeepAlive = false;
      isManuallyStopping = true;
      rec.abort();
    },
    raw: rec as SpeechRecognition
  };
}
