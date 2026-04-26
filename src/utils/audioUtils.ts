export async function playPCM(base64Data: string, onVolume?: (v: number) => void): Promise<void> {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("AudioContext not supported in this browser.");
    }
    const audioCtx = new AudioContextClass({ sampleRate: 24000 });
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = new Int16Array(bytes.buffer);
    const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = buffer[i] / 32768.0;
    }

    if (onVolume) {
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!audioCtx) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const volume = Math.min(1, (sum / dataArray.length) / 128);
        onVolume(volume);
        if (audioCtx.state !== 'closed') {
          requestAnimationFrame(checkVolume);
        }
      };
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      source.start();
      checkVolume();
      
      return new Promise<void>(resolve => {
        source.onended = () => {
          onVolume(0);
          audioCtx.close();
          resolve();
        };
      });
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    
    return new Promise<void>(resolve => {
      source.onended = () => {
        audioCtx.close();
        resolve();
      };
    });
  } catch (error) {
    console.error("Error playing audio:", error);
  }
}
