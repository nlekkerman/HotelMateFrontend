import "@/games/memory-match/styles/memory.css";

export default function Card({ img, flipped, backImg, onClick }) {
  return (
    <div className="card-container" onClick={onClick}>
      <div className={`card-inner ${flipped ? "flipped" : ""}`}>
        <div className="card-front">
          <img src={backImg} alt="Card back" />
        </div>
        <div className="card-back">
          <img src={img} alt="Smiley" />
        </div>
      </div>
    </div>
  );
}
