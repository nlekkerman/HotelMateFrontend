import { useState, useRef, useEffect } from "react";
import Game from "@/games/whack-a-mole/logic/Game";
import hitSound from "@/games/whack-a-mole/assets/sounds/yes.wav";
import missSound from "@/games/whack-a-mole/assets/sounds/iihh.wav";
import bgMusicFile from "@/games/whack-a-mole/assets/sounds/music-theme-one.wav";

import smiley from "@/games/whack-a-mole/assets/images/smiley.png";
import hitSmiley from "@/games/whack-a-mole/assets/images/hit.png";
import missSmiley from "@/games/whack-a-mole/assets/images/miss.png";

export function useWhackAMole(difficulty, bgMusic = true, effects = true, onGameOver) {
  const [holes, setHoles] = useState(Array(6).fill(false));
  const [feedback, setFeedback] = useState(Array(6).fill(null));
  const [holeColors, setHoleColors] = useState(Array(6).fill("bg-transparent"));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [game, setGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
const [gameOver, setGameOver] = useState(false);

  const bgAudioRef = useRef(new Audio(bgMusicFile));
  const effectAudioRef = useRef(new Audio());
  const feedbackTimeouts = useRef([]);
  const countdownRef = useRef(null);

  const getMoleTimeByDifficulty = (difficulty) => {
    switch (difficulty) {
      case "Easy": return 1500;
      case "Intermediate": return 1000;
      case "Hard": return 600;
      default: return 1000;
    }
  };

  const startGame = () => {
    if (game) game.stop();
    clearInterval(countdownRef.current);
    feedbackTimeouts.current.forEach(t => t && clearTimeout(t));

    setScore(0);
    setTimeLeft(30);
    setHoles(Array(6).fill(false));
    setFeedback(Array(6).fill(null));
setHoleColors(Array(6).fill("bg-transparent"));
    setShowModal(false);
setGameOver(false)
    const moleTime = getMoleTimeByDifficulty(difficulty);
    const newGame = new Game(6, moleTime);
    setGame(newGame);

    // Background music
    const bgAudio = bgAudioRef.current;
    bgAudio.pause();
    bgAudio.currentTime = 0;
    bgAudio.loop = true;
    bgAudio.volume = 0.3;
    if (bgMusic) bgAudio.play().catch(() => {});

    // Start game logic
    newGame.start((holesState, scoreState) => {
      setHoles([...holesState]);
      setScore(scoreState);
    });

    // Timer
    let countdown = 30;
    countdownRef.current = setInterval(() => {
      countdown -= 1;
      setTimeLeft(countdown);

      if (countdown <= 0) {
        clearInterval(countdownRef.current);
        newGame.stop();
        setShowModal(true);
        setGameOver(true);
        if (onGameOver) onGameOver(score);
      }
    }, 1000);
  };

  const handleClick = (index) => {
    if (!game) return;

    const hit = game.clickHole(index);

    // Play effect sound
    const effectAudio = effectAudioRef.current;
    effectAudio.pause();
    effectAudio.currentTime = 0;
    if (effects) {
      effectAudio.src = hit ? hitSound : missSound;
      effectAudio.play();
    }

    // Set feedback icon
    setFeedback(prev => {
      const arr = [...prev];
      arr[index] = hit ? hitSmiley : missSmiley;
      return arr;
    });

    // Set hole color
    setHoleColors(prev => {
      const arr = [...prev];
      arr[index] = hit ? "bg-success" : "bg-danger";
      return arr;
    });

    // Reset after 700ms
    if (feedbackTimeouts.current[index]) clearTimeout(feedbackTimeouts.current[index]);
    feedbackTimeouts.current[index] = setTimeout(() => {
      setFeedback(prev => {
        const arr = [...prev];
        arr[index] = null;
        return arr;
      });
      setHoleColors(prev => {
        const arr = [...prev];
        arr[index] = "bg-transparent";
        return arr;
      });
    }, 700);

    // Update state
    const { holes: currentHoles, score: currentScore } = game.getState();
    setHoles([...currentHoles]);
    setScore(currentScore);
  };

  // Start game on mount or difficulty change
  useEffect(() => {
    startGame();
    return () => {
      if (game) game.stop();
      clearInterval(countdownRef.current);
      bgAudioRef.current.pause();
      bgAudioRef.current.currentTime = 0;
      effectAudioRef.current.pause();
      effectAudioRef.current.currentTime = 0;
    };
  }, [difficulty]);

  useEffect(() => {
    const bgAudio = bgAudioRef.current;
    if (bgMusic) bgAudio.play().catch(() => {});
    else bgAudio.pause();
  }, [bgMusic]);

  return {
    holes,
    feedback,
    holeColors, // ⚡ added
    score,
    timeLeft,
    showModal,
    setShowModal,
    gameOver,
    startGame,
    handleClick,
  };
}
