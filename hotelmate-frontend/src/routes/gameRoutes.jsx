import React from 'react';
import GamesDashboard from '@/games/GamesDashboard';
import WhackAMolePage from '@/games/whack-a-mole/pages/GamePage';
import MemoryGame from '@/games/memory-match/pages/MemoryGame';
import MemoryMatchDashboard from '@/games/memory-match/pages/MemoryMatchDashboard';
import TournamentDashboard from '@/games/memory-match/pages/TournamentDashboard';
import TournamentWinners from '@/games/memory-match/pages/TournamentWinners';
import Leaderboard from '@/games/memory-match/pages/Leaderboard';
import PersonalStats from '@/games/memory-match/pages/PersonalStats';
import QuizStartScreen from '@/games/quiz-game/pages/QuizStartScreen';
import QuizPlayScreen from '@/games/quiz-game/pages/QuizPlayScreen';
import QuizResultsScreen from '@/games/quiz-game/pages/QuizResultsScreen';
import QuizLeaderboard from '@/games/quiz-game/pages/QuizLeaderboard';
import QuizTournaments from '@/games/quiz-game/pages/QuizTournaments';

/**
 * Game route configs — all require authentication (protected: true).
 *
 * audioSettings is injected by the route builder since it's layout-level state.
 */
const gameRoutes = [
  { path: '/games', element: <GamesDashboard />, protected: true },
  { path: '/games/whack-a-mole', element: 'WHACK_A_MOLE', protected: true }, // Needs audioSettings — handled in route builder
  { path: '/games/memory-match', element: <MemoryMatchDashboard />, protected: true },
  { path: '/games/memory-match/practice', element: <MemoryGame practiceMode={true} />, protected: true },
  { path: '/games/memory-match/tournament/:tournamentId', element: <MemoryGame />, protected: true },
  {
    path: '/games/memory-match/tournament/:tournamentId/winners',
    element: (
      <React.Suspense fallback={<div>Loading...</div>}>
        <TournamentWinners />
      </React.Suspense>
    ),
    protected: true,
  },
  { path: '/games/memory-match/tournaments', element: <TournamentDashboard />, protected: true },
  { path: '/games/memory-match/leaderboard', element: <Leaderboard />, protected: true },
  { path: '/games/memory-match/stats', element: <PersonalStats />, protected: true },
  { path: '/games/quiz', element: <QuizStartScreen />, protected: true },
  { path: '/games/quiz/play', element: <QuizPlayScreen />, protected: true },
  { path: '/games/quiz/results', element: <QuizResultsScreen />, protected: true },
  { path: '/games/quiz/leaderboard', element: <QuizLeaderboard />, protected: true },
  { path: '/games/quiz/tournaments', element: <QuizTournaments />, protected: true },
  { path: '/games/settings', element: <div>Game Settings Coming Soon!</div>, protected: true },
];

export default gameRoutes;
