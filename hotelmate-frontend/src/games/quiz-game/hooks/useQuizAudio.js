import { useRef, useEffect } from 'react';

// Reuse sound files from whack-a-mole
import correctSoundFile from '@/games/whack-a-mole/assets/sounds/yes.wav';
import wrongSoundFile from '@/games/whack-a-mole/assets/sounds/iihh.wav';

export default function useQuizAudio(quiz) {
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const timeoutSoundRef = useRef(null);
  const finishSoundRef = useRef(null);

  useEffect(() => {
    if (!quiz || !quiz.enable_sound_effects) return;

    // Initialize audio objects
    correctSoundRef.current = new Audio(correctSoundFile);
    wrongSoundRef.current = new Audio(wrongSoundFile);
    timeoutSoundRef.current = new Audio(wrongSoundFile); // Reuse wrong sound for timeout
    finishSoundRef.current = new Audio(correctSoundFile); // Reuse correct sound for finish

    // Set volume
    const volume = 0.5;
    if (correctSoundRef.current) correctSoundRef.current.volume = volume;
    if (wrongSoundRef.current) wrongSoundRef.current.volume = volume;
    if (timeoutSoundRef.current) timeoutSoundRef.current.volume = volume;
    if (finishSoundRef.current) finishSoundRef.current.volume = volume;

    return () => {
      // Cleanup
      [correctSoundRef, wrongSoundRef, timeoutSoundRef, finishSoundRef].forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current = null;
        }
      });
    };
  }, [quiz]);

  const playCorrect = () => {
    if (quiz?.enable_sound_effects && correctSoundRef.current) {
      correctSoundRef.current.currentTime = 0;
      correctSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };

  const playWrong = () => {
    if (quiz?.enable_sound_effects && wrongSoundRef.current) {
      wrongSoundRef.current.currentTime = 0;
      wrongSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };

  const playTimeout = () => {
    if (quiz?.enable_sound_effects && timeoutSoundRef.current) {
      timeoutSoundRef.current.currentTime = 0;
      timeoutSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };

  const playFinish = () => {
    if (quiz?.enable_sound_effects && finishSoundRef.current) {
      finishSoundRef.current.currentTime = 0;
      finishSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };

  return {
    playCorrect,
    playWrong,
    playTimeout,
    playFinish
  };
}
