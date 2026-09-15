import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SOUNDBOARD_CONFIG } from './soundboardConfig';
import { audioEngine } from './audioEngine';
import { SoundItem } from './types';
import { SoundCard } from './components/SoundCard';
import { HeaderControls } from './components/HeaderControls';
import { CategoryBanner } from './components/CategoryBanner';
import { LinkCodeGeneratorModal } from './components/LinkCodeGeneratorModal';

interface CategoryGroup {
  name: string;
  sounds: SoundItem[];
}

const CATEGORY_ORDER = ['House Stims', 'X-Men', 'Invincible', 'Unc'];

export default function App() {
  const [activeSoundIds, setActiveSoundIds] = useState<string[]>([]);
  const [volume, setVolume] = useState<number>(() => audioEngine.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(() => audioEngine.getIsMuted());
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  // Group sounds by their category with preferred ordering
  const groupedCategories: CategoryGroup[] = useMemo(() => {
    const groups: Record<string, SoundItem[]> = {};
    for (const sound of SOUNDBOARD_CONFIG.sounds) {
      const cat = (sound.category && sound.category.trim()) || 'House Stims';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(sound);
    }

    const existingCategories = Object.keys(groups);
    const orderedKeys = [
      ...CATEGORY_ORDER.filter((c) => existingCategories.includes(c)),
      ...existingCategories.filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    return orderedKeys.map((key) => ({
      name: key,
      sounds: groups[key],
    }));
  }, []);

  // Filter groups according to active category tab
  const displayedCategories = useMemo(() => {
    if (selectedCategory === 'all') {
      return groupedCategories;
    }
    return groupedCategories.filter((g) => g.name === selectedCategory);
  }, [groupedCategories, selectedCategory]);

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
        onOpenCodeGenerator={() => setIsCodeModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6">
        {/* Category Navigation Tabs */}
        {groupedCategories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-white border border-stone-800'
              }`}
            >
              All ({SOUNDBOARD_CONFIG.sounds.length})
            </button>
            {groupedCategories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                    : 'bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-white border border-stone-800'
                }`}
              >
                {cat.name} ({cat.sounds.length})
              </button>
            ))}
          </div>
        )}

        {/* Categorized Sound Sections */}
        <div className="space-y-8">
          {displayedCategories.map((group) => {
            const isAnyPlaying = group.sounds.some((s) => activeSoundIds.includes(s.id));
            return (
              <section
                key={group.name}
                id={`category-section-${group.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="scroll-mt-20"
              >
                {/* Category Banner */}
                <CategoryBanner
                  category={group.name}
                  count={group.sounds.length}
                  isPlaying={isAnyPlaying}
                />

                {/* Grid for this category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                  {group.sounds.map((sound) => {
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
              </section>
            );
          })}
        </div>
      </main>

      {/* Simple Streamlined Link to Backend Code Generator Modal */}
      <LinkCodeGeneratorModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
