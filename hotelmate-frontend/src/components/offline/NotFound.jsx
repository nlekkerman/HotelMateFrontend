// src/components/NotFound.jsx
import React from 'react';
import Lottie from 'lottie-react';
import animationData from '@/assets/lottie/notFound404.json';

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light text-center p-4">
      {/* Responsive Lottie container */}
      <div
        style={{
          width: 'clamp(150px, 30vw, 300px)',
          height: 'clamp(150px, 30vw, 300px)'
        }}
        className="mb-4"
      >
        <Lottie animationData={animationData} loop />
      </div>

      {/* Big, responsive 404 heading */}
      <h1
        className="text-danger fw-bold mb-3"
        style={{
          fontSize: 'clamp(4rem, 20vw, 12rem)',
          lineHeight: 1
        }}
      >
        404
      </h1>

      {/* Larger, responsive subtitle */}
      <p
        className="text-secondary mb-4"
        style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
      >
        Oops! We can’t find that page.
      </p>

      {/* Bigger, touch‑friendly button */}
      <a
        href="/"
        className="btn btn-primary btn-lg px-5 py-3 fs-5"
      >
        ← Back to Home
      </a>
    </div>
  );
}
