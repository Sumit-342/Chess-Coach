function PromotionPicker({ onSelect }) {
  const pieces = [
    { name: "Queen", symbol: "♕", value: "q" },
    { name: "Rook", symbol: "♖", value: "r" },
    { name: "Bishop", symbol: "♗", value: "b" },
    { name: "Knight", symbol: "♘", value: "n" },
  ];

  return (
    <div className="promotion-picker">
      <h3>Choose Promotion</h3>

      <div className="promotion-options">
        {pieces.map((piece) => (
          <button
            key={piece.value}
            onClick={() => onSelect(piece.value)}
            title={piece.name}
          >
            <span>{piece.symbol}</span>
            <small>{piece.name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PromotionPicker;
