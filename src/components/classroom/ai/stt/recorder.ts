export interface AudioRecorder {
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  isRecording: () => boolean;
}

export async function createAudioRecorder(): Promise<AudioRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ].find((t) => MediaRecorder.isTypeSupported(t));

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const start = async () => {
    chunks.length = 0;
    recorder.start();
  };

  const stop = async () => {
    const blob: Blob = await new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const out = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          resolve(out);
        } catch (e) {
          reject(e);
        }
      };
      recorder.stop();
    });

    // Stop mic.
    stream.getTracks().forEach((t) => t.stop());
    return blob;
  };

  return {
    start,
    stop,
    isRecording: () => recorder.state === "recording"
  };
}
