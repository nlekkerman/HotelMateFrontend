// src/pages/Home.jsx
import React from 'react';
import Feed from '@/components/home/Feed';

export default function Home() {
  return (
    <div className="container my-4">
      {/* Composer at the top */}
     

      <hr />

      {/* The scrolling feed */}
      <section>
        <Feed />
      </section>
    </div>
  );
}
