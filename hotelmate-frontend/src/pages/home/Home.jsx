// src/pages/Home.jsx
import React from 'react';
import Feed from '@/components/home/Feed';
import { useOverviewLanding } from '@/hooks/useOverviewLanding';
import '@/styles/home.css';

export default function Home() {
  // One-time check: redirect to Overview if there are unseen operational signals
  useOverviewLanding();

  return (
    <div className="feed-container">
      <Feed />
    </div>
  );
}
