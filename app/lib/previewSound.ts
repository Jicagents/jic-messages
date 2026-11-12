// Plays a bundled alert sound once so the user can hear a choice. Needs: npx expo install expo-audio
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const FILES: Record<string, number> = {
  chime: require("../../assets/sounds/chime.wav"),
  ping: require("../../assets/sounds/ping.wav"),
  bell: require("../../assets/sounds/bell.wav"),
  siren: require("../../assets/sounds/siren.wav"),
  alarm: require("../../assets/sounds/alarm.wav"),
};

let current: AudioPlayer | null = null;

export async function previewSound(id: string) {
  const src = FILES[id];
  if (!src) return;
  try {
    current?.remove();
    // Let the preview play even when the phone is on silent or vibrate, like the real alert does.
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(src);
    current = player;
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        player.remove();
        if (current === player) current = null;
      }
    });
    player.play();
  } catch {
    /* a failed preview must never break the settings screen */
  }
}
