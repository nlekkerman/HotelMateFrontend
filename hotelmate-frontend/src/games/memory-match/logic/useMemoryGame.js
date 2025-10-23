import { useState, useEffect } from "react";

export function useMemoryGame(images) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  const resetGame = () => {
    const shuffled = [...images, ...images]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({ id: index, img }));
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
  };

  useEffect(() => {
    resetGame();
  }, [images]);

  const handleFlip = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    setFlipped([...flipped, id]);
  };

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first].img === cards[second].img) {
        setMatched([...matched, first, second]);
      }
      setTimeout(() => setFlipped([]), 800);
    }
  }, [flipped]);

  return { cards, flipped, matched, handleFlip, resetGame };
}
