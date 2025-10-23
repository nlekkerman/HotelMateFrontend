import { useState, useEffect, useRef } from "react";
import Card from "../components/Card";
import backImg from "../assets/images/card-back.png";

// 🎭 Smileys
import alienChill from "../assets/images/smileys/alien-chill.png";
import alien from "../assets/images/smileys/alien.png";
import blarb from "../assets/images/smileys/blarb.png";
import blib from "../assets/images/smileys/blib.png";
import blurb from "../assets/images/smileys/blurb.png";
import cute from "../assets/images/smileys/cute.png";
import face from "../assets/images/smileys/face.png";
import fox from "../assets/images/smileys/fox.png";
import hihi from "../assets/images/smileys/hihi.png";
import hit2 from "../assets/images/smileys/hit (2).png";
import hit from "../assets/images/smileys/hit.png";
import iceman from "../assets/images/smileys/iceman.png";
import miss from "../assets/images/smileys/miss.png";
import smiley from "../assets/images/smileys/smiley.png";

// 🎵 Sounds
import correctSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";
import wrongSoundFile from "@/games/whack-a-mole/assets/sounds/iihh.wav";
import winSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";

const allSmileys = [
  alienChill, alien, blarb, blib, blurb, cute, face,
  fox, hihi, hit2, hit, iceman, miss, smiley
];

// Helper: get images per difficulty
const getImagesForDifficulty = (level) => {
  const shuffled = [...allSmileys].sort(() => Math.random() - 0.5);
  if (level === "easy") return shuffled.slice(0, 4);
  if (level === "intermediate") return shuffled.slice(0, 7);
  return shuffled; // hard = all
};

// Custom hook for game logic
function useMemoryGame(images) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [lastAction, setLastAction] = useState(null);

  const resetGame = () => {
    const shuffled = [...images, ...images]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({ id: index, img }));
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setLastAction(null);
  };

  useEffect(() => {
    resetGame();
  }, [images]);

  const handleFlip = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].img === cards[second].img) {
        setMatched((prev) => [...prev, first, second]);
        setLastAction("match");
      } else {
        setLastAction("mismatch");
      }
      setTimeout(() => setFlipped([]), 800);
    }
  };

  return { cards, flipped, matched, handleFlip, resetGame, lastAction };
}

export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState("easy");
  const [images, setImages] = useState(getImagesForDifficulty("easy"));
  const { cards, flipped, matched, handleFlip, resetGame, lastAction } = useMemoryGame(images);

  // Timer
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Sounds
  const correctSound = useRef(new Audio(correctSoundFile));
  const wrongSound = useRef(new Audio(wrongSoundFile));
  const winSound = useRef(new Audio(winSoundFile));

  useEffect(() => {
    if (lastAction === "match") correctSound.current.play();
    if (lastAction === "mismatch") wrongSound.current.play();
  }, [lastAction]);

  useEffect(() => {
    if (matched.length && matched.length === cards.length) {
      setIsRunning(false);
      winSound.current.play();
    }
  }, [matched, cards]);

  const handleReset = () => {
    resetGame();
    setTime(0);
    setIsRunning(true);
  };

  const handleDifficultyChange = (level) => {
    setDifficulty(level);
    setImages(getImagesForDifficulty(level));
    setTime(0);
    setIsRunning(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-warning bg-opacity-25 py-5">
      <h1 className="display-5 fw-bold mb-4 text-center">🧠 Memory Match Game 🧠</h1>

      {/* Timer */}
      <div className="fs-5 fw-semibold mb-3 text-dark">
        ⏱ Time: <span className="text-primary">{formatTime(time)}</span>
      </div>

      {/* Difficulty Selector */}
      <div className="btn-group mb-4" role="group" aria-label="Difficulty levels">
        {["easy", "intermediate", "hard"].map((level) => (
          <button
            key={level}
            onClick={() => handleDifficultyChange(level)}
            className={`btn btn-${difficulty === level ? "primary" : "outline-primary"} text-capitalize`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Game Grid */}
      <div
        className="d-grid justify-content-center align-items-center"
        style={{
          gridTemplateColumns:
            difficulty === "easy"
              ? "repeat(auto-fit, minmax(90px, 1fr))"
              : difficulty === "intermediate"
              ? "repeat(auto-fit, minmax(80px, 1fr))"
              : "repeat(auto-fit, minmax(70px, 1fr))",
          gap: "1.2rem",
          maxWidth: "650px",
          width: "100%",
          padding: "1rem",
        }}
      >
        {cards.map((card, index) => (
          <Card
            key={card.id}
            img={card.img}
            backImg={backImg}
            flipped={flipped.includes(index) || matched.includes(index)}
            onClick={() => handleFlip(index)}
          />
        ))}
      </div>

      {matched.length === cards.length && (
        <div className="mt-4 fs-4 fw-semibold text-success text-center">
          🎉 You Win in {formatTime(time)}! 🎉
        </div>
      )}

      <button onClick={handleReset} className="btn btn-success mt-4 px-4 py-2 shadow-sm">
        Restart 🔁
      </button>
    </div>
  );
}
