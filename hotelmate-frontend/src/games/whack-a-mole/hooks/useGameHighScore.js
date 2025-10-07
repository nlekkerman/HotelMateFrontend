import api from "@/services/api";

export function useGameHighScore(gameSlug) {
  // Check if a score qualifies for top 100 without saving
  const isScoreTop = async (score) => {

    if (!gameSlug) {
      console.warn("No gameSlug provided, treating score as top by default");
      return true;
    }

    try {
      const res = await api.get(`entertainment/games/highscores/?game=${gameSlug}&limit=100`);
      const topScores = res.data;

      // If no highscores yet, any score qualifies
      if (!topScores || topScores.length === 0) {
        return true;
      }

      // Safely get lowest score in top 100
      const lastItem = topScores[topScores.length - 1];
      const lowestTop = lastItem && lastItem.score != null ? lastItem.score : 0;

      
      return score > lowestTop;
    } catch (err) {
      console.error("Failed to check top scores:", err);
      return true; // treat score as top if API fails
    }
  };

  // Save score manually
  const submitScore = async (score, playerName = "") => {
    if (!gameSlug) {
      console.warn("No gameSlug provided, cannot save score");
      return false;
    }

    try {
      const saved = await api.post("entertainment/games/highscores/", {
        game: gameSlug,
        score,
        player_name: playerName,
      });
      return saved.data;
    } catch (err) {
      console.error("Failed to save score:", err);
      return false;
    }
  };

  return { isScoreTop, submitScore };
}

