import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';

export const usePersonalBest = () => {
  const [personalBest, setPersonalBest] = useState(null);

  // Load personal best from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('memoryMatch_personalBest');
    if (stored) {
      setPersonalBest(JSON.parse(stored));
    }
  }, []);

  const celebratePersonalBest = (score) => {
    // Confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Success toast
    toast.success(`🎉 New personal best: ${score} points!`, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const checkPersonalBest = (newScore, timeSeconds = null, moves = null) => {
    const currentBest = personalBest?.score || 0;
    
    if (newScore > currentBest) {
      // New personal best!
      const newBest = {
        score: newScore,
        date: new Date().toISOString(),
        timeSeconds: timeSeconds || personalBest?.timeSeconds,
        moves: moves || personalBest?.moves
      };
      
      setPersonalBest(newBest);
      localStorage.setItem('memoryMatch_personalBest', JSON.stringify(newBest));
      
      // Celebrate with confetti and toast
      celebratePersonalBest(newScore);
      
      return true;
    } else {
      // Not a personal best
      toast.info("Not a personal best—try again!", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      return false;
    }
  };

  return {
    personalBest,
    checkPersonalBest,
    celebratePersonalBest
  };
};