// src/pages/Home.jsx
import React from 'react';
import NewPostForm from '@/components/home/NewPostForm';
import Feed from '@/components/home/Feed';

export default function Home() {
  return (
    <div className="container my-4">
      {/* Composer at the top */}
      <section className="mb-5">
        <NewPostForm />
      </section>

      <hr />

      {/* The scrolling feed */}
      <section>
        <Feed />
      </section>
    </div>
  );
}
