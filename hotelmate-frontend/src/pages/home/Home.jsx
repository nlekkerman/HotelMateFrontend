// src/pages/Home.jsx
import React from 'react';
import Feed from '@/components/home/Feed';
import '@/styles/home.css';

export default function Home() {
  return (
    <div className="feed-container">
      <Feed />
    </div>
  );
}
