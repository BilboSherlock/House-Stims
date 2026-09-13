import React, { useState, useEffect, useCallback } from 'react';
import { SOUNDBOARD_CONFIG } from './soundboardConfig';
import { audioEngine } from './audioEngine';
import { SoundItem } from './types';
import { SoundCard } from './components/SoundCard';
import { HeaderControls } from './components/HeaderControls';

export default function App() {
  const [activeSoundIds, setActiveSoundIds] = useState<string[]>([]);
  const [volume, setVolume] = useState<number>(() => audioEngine.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(() => audioEngine.getIsMuted());

  // Subscribe to audio engine active playback states
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((ids) => {
      setActiveSoundIds(ids);
    });
    return unsubscribe;
  }, []);

  // Handle playing a sound
  const handlePlaySound = useCallback((sound: SoundItem, containerId?: string) => {
    audioEngine.play(sound, SOUNDBOARD_CONFIG.allowPolyphony, containerId);
  }, []);

  // Handle stopping a sound
  const handleStopSound = useCallback((soundId: string) => {
    audioEngine.stopSound(soundId);
  }, []);

  // Handle stopping all sounds
  const handleStopAll = useCallback(() => {
    audioEngine.stopAll();
  }, []);

  // Handle Volume
  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setMuted(false);
    audioEngine.setVolume(vol);
  }, []);

  // Handle Mute Toggle
  const handleMuteToggle = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
  }, [isMuted]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-stone-700 selection:text-white">
      {/* Streamlined Header */}
      <HeaderControls
        title={SOUNDBOARD_CONFIG.appTitle}
        subtitle={SOUNDBOARD_CONFIG.appSubtitle}
        activeCount={activeSoundIds.length}
        onStopAll={handleStopAll}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
      />

      {/* Main Responsive Grid */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {SOUNDBOARD_CONFIG.sounds.map((sound) => {
            const isPlaying = activeSoundIds.includes(sound.id);
            return (
              <SoundCard
                key={sound.id}
                sound={sound}
                isPlaying={isPlaying}
                onPlay={handlePlaySound}
                onStop={handleStopSound}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
