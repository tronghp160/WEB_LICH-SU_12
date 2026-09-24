/**
 * Thuyết minh bằng giọng đọc tiếng Việt có sẵn của trình duyệt/hệ điều hành (Web Speech API): không tải file âm thanh nào.
 * Máy không có giọng tiếng Việt thì `available` = false và phim chỉ hiện phụ đề.
 */
export class Narrator {
  available = false;
  private enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  private readonly supported = typeof window !== "undefined" && "speechSynthesis" in window;
  private onChange: (() => void) | null = null;

  init(onChange?: () => void) {
    this.onChange = onChange ?? null;
    if (!this.supported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const vietnamese = voices.filter((v) => v.lang.toLowerCase().startsWith("vi"));
      this.voice = vietnamese.find((v) => /natural|online|hoaimy|namminh/i.test(v.name)) ?? vietnamese[0] ?? null;
      const before = this.available;
      this.available = this.voice !== null;
      if (before !== this.available) this.onChange?.();
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.cancel();
  }

  isEnabled() {
    return this.enabled;
  }

  speak(text: string) {
    if (!this.supported || !this.enabled || !this.voice) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = 0.98;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  cancel() {
    if (this.supported) window.speechSynthesis.cancel();
  }

  pause() {
    if (this.supported) window.speechSynthesis.pause();
  }

  resume() {
    if (this.supported) window.speechSynthesis.resume();
  }

  dispose() {
    this.cancel();
  }
}
