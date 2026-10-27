function PromotionPicker({ onSelect, targetSquare, boardSize }) {
  const squareSize = boardSize / 8;

  const fileIndex = targetSquare.charCodeAt(0) - 97;
  const rowIndex = 8 - Number(targetSquare[1]);

  const pickerWidth = 64;
  const pickerHeight = 232;

  const left = Math.max(
    0,
    Math.min(fileIndex * squareSize, boardSize - pickerWidth),
  );

  const rawTop =
    rowIndex < 4
      ? rowIndex * squareSize
      : (rowIndex + 1) * squareSize - pickerHeight;

  const top = Math.max(0, Math.min(rawTop, boardSize - pickerHeight));

  const pieces = [
    { name: "Queen", symbol: "♕", value: "q" },
    { name: "Rook", symbol: "♖", value: "r" },
    { name: "Bishop", symbol: "♗", value: "b" },
    { name: "Knight", symbol: "♘", value: "n" },
  ];

  return (
    <div
      className="promotion-picker"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      {pieces.map((piece) => (
        <button
          key={piece.value}
          onClick={() => onSelect(piece.value)}
          title={piece.name}
          aria-label={`Promote to ${piece.name}`}
        >
          <span>{piece.symbol}</span>
        </button>
      ))}
    </div>
  );
}

export default PromotionPicker;
