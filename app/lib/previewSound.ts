// app/lib/previewSound.ts
// Plays a bundled sound once so the user can hear a choice. Implement with whichever audio library the app
// already uses (expo-audio, expo-av, or react-native-sound). Sound files are in assets/sounds/*.wav.
const FILES: Record<string, any> = {
  chime: require("../../assets/sounds/chime.wav"),
  ping: require("../../assets/sounds/ping.wav"),
  bell: require("../../assets/sounds/bell.wav"),
  siren: require("../../assets/sounds/siren.wav"),
  alarm: require("../../assets/sounds/alarm.wav"),
};
export async function previewSound(id: string) {
  const src = FILES[id];
  if (!src) return;
  // Example with expo-audio:
  //   import { createAudioPlayer } from "expo-audio";
  //   const player = createAudioPlayer(src); player.play();
  // Example with expo-av:
  //   const { sound } = await Audio.Sound.createAsync(src); await sound.playAsync();
}
