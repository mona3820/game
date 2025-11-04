import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, StoryScene } from './types';
import { generateStoryScene, generateHint } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import { MagnifyingGlassIcon, Cog6ToothIcon, SpeakerWaveIcon, LightBulbIcon } from './components/Icons';

// Audio assets
const BG_MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/11/17/audio_87743206a4.mp3';
const CHOICE_SOUND_URL = 'https://cdn.pixabay.com/audio/2022/03/15/audio_2825a60642.mp3';
const TRANSITION_SOUND_URL = 'https://cdn.pixabay.com/audio/2022/10/05/audio_2d31535b44.mp3';
const HINT_SOUND_URL = 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630283e7.mp3';
const POSITIVE_OUTCOME_SOUND_URL = 'https://cdn.pixabay.com/audio/2022/01/18/audio_835824b693.mp3';
const NEGATIVE_OUTCOME_SOUND_URL = 'https://cdn.pixabay.com/audio/2022/02/11/audio_a50b396253.mp3';


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [currentScene, setCurrentScene] = useState<StoryScene | null>(null);
  const [storyHistory, setStoryHistory] = useState<{scene: string, choice: string}[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.1);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [hint, setHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isHintUsed, setIsHintUsed] = useState(false);

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const choiceSoundRef = useRef<HTMLAudioElement | null>(null);
  const transitionSoundRef = useRef<HTMLAudioElement | null>(null);
  const hintSoundRef = useRef<HTMLAudioElement | null>(null);
  const positiveOutcomeSoundRef = useRef<HTMLAudioElement | null>(null);
  const negativeOutcomeSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio elements once on component mount
    bgMusicRef.current = new Audio(BG_MUSIC_URL);
    bgMusicRef.current.loop = true;

    choiceSoundRef.current = new Audio(CHOICE_SOUND_URL);
    
    transitionSoundRef.current = new Audio(TRANSITION_SOUND_URL);
    
    hintSoundRef.current = new Audio(HINT_SOUND_URL);
    
    positiveOutcomeSoundRef.current = new Audio(POSITIVE_OUTCOME_SOUND_URL);
    
    negativeOutcomeSoundRef.current = new Audio(NEGATIVE_OUTCOME_SOUND_URL);
  }, []);
  
  useEffect(() => {
    if (bgMusicRef.current) bgMusicRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    if (choiceSoundRef.current) choiceSoundRef.current.volume = sfxVolume;
    if (transitionSoundRef.current) transitionSoundRef.current.volume = sfxVolume;
    if (hintSoundRef.current) hintSoundRef.current.volume = sfxVolume;
    if (positiveOutcomeSoundRef.current) positiveOutcomeSoundRef.current.volume = sfxVolume;
    if (negativeOutcomeSoundRef.current) negativeOutcomeSoundRef.current.volume = sfxVolume;
  }, [sfxVolume]);

  const fetchScene = useCallback(async (history: {scene: string, choice: string}[]) => {
    setIsLoading(true);
    setCurrentScene(null);
    setHint(null);
    setIsHintUsed(false);
    
    try {
      const newScene = await generateStoryScene(history);
      
      switch (newScene.sceneType) {
        case 'positive':
          positiveOutcomeSoundRef.current?.play().catch(e => console.error("Positive sound failed:", e));
          break;
        case 'negative':
        case 'suspense':
          negativeOutcomeSoundRef.current?.play().catch(e => console.error("Negative sound failed:", e));
          break;
        case 'neutral':
        default:
          transitionSoundRef.current?.play().catch(e => console.error("Transition sound failed:", e));
          break;
      }
      
      setCurrentScene(newScene);

      if (newScene.isEnding) {
        setGameState(GameState.End);
        bgMusicRef.current?.pause();
        if(bgMusicRef.current) bgMusicRef.current.currentTime = 0;
      } else {
        setGameState(GameState.Playing);
      }
    } catch (error) {
      console.error("Failed to fetch new scene", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartGame = () => {
    bgMusicRef.current?.play().catch(e => console.error("Background music failed:", e));
    setStoryHistory([]);
    fetchScene([]);
  };

  const handleResetGame = () => {
    bgMusicRef.current?.pause();
    if(bgMusicRef.current) bgMusicRef.current.currentTime = 0;
    setGameState(GameState.Start);
    setCurrentScene(null);
    setStoryHistory([]);
    setHint(null);
    setIsHintUsed(false);
  };
  
  const handleChoice = (choice: string) => {
    if (!currentScene || isLoading) return;
    choiceSoundRef.current?.play().catch(e => console.error("Choice sound failed:", e));

    const newHistory = [...storyHistory, { scene: currentScene.scene, choice: choice }];
    setStoryHistory(newHistory);
    fetchScene(newHistory);
  };

  const handleGetHint = async () => {
    if (!currentScene || isHintUsed || isHintLoading) return;

    setIsHintLoading(true);
    setIsHintUsed(true);
    hintSoundRef.current?.play().catch(e => console.error("Hint sound failed:", e));
    
    try {
      const newHint = await generateHint(storyHistory, currentScene);
      setHint(newHint);
    } catch (error) {
      console.error("Failed to get hint", error);
      setHint("حدث خطأ أثناء جلب التلميح.");
    } finally {
        setIsHintLoading(false);
    }
  };


  const renderGameState = () => {
    switch (gameState) {
      case GameState.Start:
        return (
          <div className="text-center">
            <div className="flex justify-center items-center mb-6">
              <MagnifyingGlassIcon className="w-16 h-16 text-amber-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">لعبة محقق الألغاز</h1>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">خض تجربة بوليسية تفاعلية تتشكل أحداثها بناءً على اختياراتك. كل قرار تتخذه يفتح مسارًا جديدًا في القضية!</p>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleStartGame}
                className="bg-amber-500 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-600 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-amber-500/30 w-full max-w-xs"
              >
                ابدأ التحقيق
              </button>
            </div>
          </div>
        );
      case GameState.Playing:
      case GameState.End:
        return (
          <div className="w-full max-w-2xl p-4 md:p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-amber-300">فصول القضية...</h2>
            {isLoading && !currentScene ? <LoadingSpinner /> : (
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-slate-700 min-h-[300px] flex flex-col justify-between">
                {currentScene && (
                  <>
                    <div>
                      <p className="text-xl md:text-2xl leading-relaxed text-slate-100 whitespace-pre-wrap">{currentScene.scene}</p>
                    </div>

                    <div className="mt-6">
                      {gameState === GameState.Playing && (
                        <div className="flex flex-col items-center mb-4">
                          <button
                            onClick={handleGetHint}
                            disabled={isHintUsed || isLoading || isHintLoading}
                            className="flex items-center gap-2 bg-cyan-600/50 text-cyan-200 font-semibold py-2 px-4 rounded-lg hover:bg-cyan-600/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/50"
                          >
                            <LightBulbIcon className="w-5 h-5" />
                            <span>{isHintUsed ? "تم استخدام التلميح" : "طلب تلميح"}</span>
                          </button>
                          {isHintLoading && <div className="text-cyan-300 text-sm mt-2">جاري البحث عن دليل...</div>}
                          {hint && !isHintLoading && (
                            <div className="mt-4 p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-center w-full">
                              <p className="text-cyan-300 italic">"{hint}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {isLoading ? <LoadingSpinner /> : (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentScene.choices.map((choice, index) => (
                          <button
                            key={index}
                            onClick={() => handleChoice(choice)}
                            disabled={isLoading}
                            className="bg-slate-700/80 border border-slate-600 text-amber-300 font-semibold py-3 px-5 rounded-lg hover:bg-slate-700 hover:border-amber-400 transition-all duration-300 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {gameState === GameState.End && !isLoading && (
                   <div className="text-center mt-8">
                      <p className="text-2xl font-bold text-green-400 mb-6">انتهت القضية</p>
                      <button
                        onClick={handleResetGame}
                        className="bg-green-500 text-white font-bold py-3 px-8 rounded-full hover:bg-green-600 transition-all duration-300"
                      >
                        قضية جديدة
                      </button>
                   </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-blue-950 bg-grid-slate-800/[0.2] relative">
       <button 
        onClick={() => setShowSettings(!showSettings)} 
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors"
        aria-label="Toggle settings"
      >
        <Cog6ToothIcon className="w-6 h-6 text-slate-300" />
      </button>

      {showSettings && (
        <div className="absolute top-16 right-4 z-10 bg-slate-800/80 backdrop-blur-md p-4 rounded-lg shadow-lg border border-slate-700 w-64 animate-fade-in-down">
          <div className="space-y-4">
            <div>
              <label htmlFor="music-volume" className="block text-sm font-medium text-slate-300 mb-2">موسيقى الخلفية</label>
              <div className="flex items-center gap-2">
                <SpeakerWaveIcon className="w-5 h-5 text-slate-400" />
                <input
                  id="music-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sfx-volume" className="block text-sm font-medium text-slate-300 mb-2">المؤثرات الصوتية</label>
              <div className="flex items-center gap-2">
                <SpeakerWaveIcon className="w-5 h-5 text-slate-400" />
                <input
                  id="sfx-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-2xl flex-grow flex items-center justify-center">
        {renderGameState()}
      </main>
      <footer className="w-full text-center p-4 text-slate-500 text-sm">
        <p>برمجة عيدالرحمن احمد</p>
        <p>01227692203</p>
      </footer>
    </div>
  );
};

export default App;
