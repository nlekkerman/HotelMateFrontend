import React from "react";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Difficulty({ onSelectDifficulty, onBack }) {
  const difficulties = [
    { label: "Beginner", duration: 1200, color: "success" },
    { label: "Intermediate", duration: 800, color: "warning" },
    { label: "Hard", duration: 500, color: "danger" },
  ];

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-dark text-white">
      <motion.h1
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="mb-4"
      >
        Choose Your Difficulty
      </motion.h1>

      <div className="d-flex gap-3 flex-wrap justify-content-center">
        {difficulties.map(({ label, duration, color }) => (
          <motion.button
            key={label}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`btn btn-${color} btn-lg`}
            onClick={() => onSelectDifficulty(duration)}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <button className="btn btn-secondary mt-5" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
