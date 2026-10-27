import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import "./App.css";
import useStockfish from "./hooks/useStockfish";
import PromotionPicker from "./components/PromotionPicker";

function App() {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const gameIdRef = useRef(0);
  const { getBestMove, readyRef, restartWorker } = useStockfish();
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const boardWrapperRef = useRef(null);
  const [boardSize, setBoardSize] = useState(0);


  useEffect(() => {
    const wrapper = boardWrapperRef.current;

    if (!wrapper) return;

    const updateSize = () => {
      setBoardSize(wrapper.getBoundingClientRect().width);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);


  function makeMove(sourceSquare, targetSquare, promotion = null) {
    if (isAiThinking) return false;
    if (game.turn() === "b") return false;

    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    const piece = gameCopy.get(sourceSquare);

    const isPromotion =
      piece?.type === "p" &&
      ((piece.color === "w" && targetSquare[1] === "8") ||
        (piece.color === "b" && targetSquare[1] === "1"));

    if (isPromotion && !promotion) {
      setPendingPromotion({
        sourceSquare,
        targetSquare,
      });
      return false;
    }

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || "q",
      });

      if (!move) return false;

      setGame(gameCopy);
      setPosition(gameCopy.fen());
      setSelectedSquare(null);
      setLegalMoves([]);

      // AI plays Black after White's move
      if (!gameCopy.isGameOver() && gameCopy.turn() === "b") {
        makeAiMove(gameCopy.fen(), gameCopy.pgn());
      }

      return true;
    } catch {
      return false;
    }
  }

  function completePromotion(piece) {
    if (!pendingPromotion) return;

    const { sourceSquare, targetSquare } = pendingPromotion;

    setPendingPromotion(null);

    makeMove(sourceSquare, targetSquare, piece);
  }

  async function makeAiMove(fen, pgn) {
    const requestGameId = gameIdRef.current;

    setIsAiThinking(true);

    try {
      const bestMove = await getBestMove(fen);

      if (requestGameId !== gameIdRef.current) return;

      if (!bestMove || bestMove === "(none)" || bestMove === "0000") {
        return;
      }

      const updatedGame = new Chess();
      updatedGame.loadPgn(pgn);

      // Make sure the position is still the expected one
      if (updatedGame.fen() !== fen) return;

      if (updatedGame.isGameOver()) return;

      const aiMove = updatedGame.move({
        from: bestMove.slice(0, 2),
        to: bestMove.slice(2, 4),
        promotion: bestMove[4] || "q",
      });

      if (!aiMove) {
        console.error("Stockfish returned an invalid move:", bestMove);
        return;
      }

      setGame(updatedGame);
      setPosition(updatedGame.fen());
      setSelectedSquare(null);
      setLegalMoves([]);

      console.log("AI played:", aiMove.san);
    } catch (error) {
      console.error("AI Move Error:", error.message);
    } finally {
      if (requestGameId === gameIdRef.current) {
        setIsAiThinking(false);
      }
    }
  }

  function selectSquare(square) {
    if (isAiThinking) return;

    const piece = game.get(square);

    if (!piece || piece.color !== game.turn()) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const moves = game.moves({
      square,
      verbose: true,
    });

    setSelectedSquare(square);
    setLegalMoves(moves);
  }

  function onPieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false;
    return makeMove(sourceSquare, targetSquare);
  }

  function resetGame() {
    gameIdRef.current += 1;

    restartWorker();

    const newGame = new Chess();
    setGame(newGame);
    setPosition(newGame.fen());
    setPendingPromotion(null);
    setIsAiThinking(false);
  }

  const checkedKingSquare = game.isCheck()
    ? game
        .board()
        .flatMap((row, rowIndex) =>
          row.map((piece, colIndex) => ({
            piece,
            square: `${"abcdefgh"[colIndex]}${8 - rowIndex}`,
          })),
        )
        .find(({ piece }) => piece?.type === "k" && piece.color === game.turn())
        ?.square
    : null;

  const moveHistory = game.history();

  console.log("Move History:", moveHistory);

  const formattedMoves = [];

  for (let i = 0; i < moveHistory.length; i += 2) {
    formattedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1] || "",
    });
  }

  let status = "";

  if (game.isCheckmate()) {
    status = `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
  } else if (game.isDraw()) {
    status = "Draw!";
  } else if (game.isCheck()) {
    status = `${game.turn() === "w" ? "White" : "Black"} is in check!`;
  } else {
    status = `${game.turn() === "w" ? "White" : "Black"} to move`;
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">♟</span>
          <div>
            <h1>
              Chess<span>Coach</span>
            </h1>
            <p>PLAY • LEARN • IMPROVE</p>
          </div>
        </div>

        <div className="engine-badge">
          <span className="status-dot"></span>
          ENGINE COMING SOON
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR PERSONAL CHESS TRAINER</p>
        <h2>
          Every move is a <span>lesson.</span>
        </h2>
        <p className="hero-description">
          Play chess, sharpen your decisions, and learn one move at a time.
        </p>
      </section>

      <section className="game-layout">
        <div className="board-panel">
          <div className="board-heading">
            <div>
              <h3>Practice Board</h3>
              <p>White pieces · Local practice</p>
            </div>
            <span className="live-label">● LIVE GAME</span>
          </div>

          <div className="board-wrapper" ref={boardWrapperRef}>
            <Chessboard
              options={{
                position,
                onPieceDrop,
                boardOrientation: "white",
                allowDragging: !game.isGameOver(),
                animationDuration: 180,

                onSquareClick: ({ square }) => {
                  if (selectedSquare) {
                    const moved = makeMove(selectedSquare, square);

                    if (moved) return;
                  }

                  selectSquare(square);
                },

                onPieceClick: ({ square }) => {
                  selectSquare(square);
                },

                squareStyles: {
                  ...Object.fromEntries(
                    legalMoves.map((move) => [
                      move.to,
                      {
                        background: game.get(move.to)
                          ? "radial-gradient(transparent 60%, rgba(255, 100, 100, 0.65) 61%)"
                          : "radial-gradient(rgba(30, 30, 30, 0.35) 18%, transparent 20%)",
                      },
                    ]),
                  ),

                  ...(selectedSquare
                    ? {
                        [selectedSquare]: {
                          backgroundColor: "rgba(184, 242, 139, 0.45)",
                        },
                      }
                    : {}),

                  ...(checkedKingSquare
                    ? {
                        [checkedKingSquare]: {
                          backgroundColor: "rgba(255, 45, 65, 0.75)",
                        },
                      }
                    : {}),
                },
              }}
            />
            {pendingPromotion && boardSize > 0 && (
              <PromotionPicker
                onSelect={completePromotion}
                targetSquare={pendingPromotion.targetSquare}
                boardSize={boardSize}
              />
            )}
          </div>

          <div className="game-status"></div>

          <div className="game-status">
            <span className="turn-icon">♟</span>
            <div>
              <strong>{status}</strong>
              <p>
                {game.isGameOver()
                  ? "Start a new game to play again."
                  : "Make your move on the board."}
              </p>
            </div>
          </div>

          <div className="board-actions">
            <button className="primary-button" onClick={resetGame}>
              ↻ New Game
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                const updatedGame = new Chess();
                updatedGame.loadPgn(game.pgn());

                if (updatedGame.undo()) {
                  gameIdRef.current += 1;

                  restartWorker();

                  setGame(updatedGame);
                  setPosition(updatedGame.fen());
                  setSelectedSquare(null);
                  setLegalMoves([]);
                  setIsAiThinking(false);
                }
              }}
              disabled={game.history().length === 0}
            >
              ↶ Undo Move
            </button>
          </div>
        </div>

        <aside className="side-panel">
          <div className="info-card coach-card">
            <div className="card-icon">✦</div>
            <p className="card-label">YOUR AI COACH</p>
            <h3>Think beyond the board.</h3>
            <p className="muted">
              Soon, your coach will help you understand mistakes, spot threats,
              and discover stronger moves.
            </p>
            <div className="feature-list">
              <div>
                <span>✓</span> Move analysis
              </div>
              <div>
                <span>✓</span> Mistake detection
              </div>
              <div>
                <span>✓</span> Personalized lessons
              </div>
            </div>
            <span className="coming-soon">COMING IN A FUTURE UPDATE</span>
          </div>

          <div className="info-card difficulty-card">
            <p className="card-label">YOUR TRAINING PATH</p>
            <h3>Choose your challenge</h3>
            <div className="difficulty-option">
              <span className="difficulty-symbol beginner">●</span>
              <div>
                <strong>Beginner</strong>
                <p>Build your fundamentals</p>
              </div>
              <span className="locked-label">SOON</span>
            </div>
            <div className="difficulty-option">
              <span className="difficulty-symbol intermediate">◆</span>
              <div>
                <strong>Intermediate</strong>
                <p>Develop your strategy</p>
              </div>
              <span className="locked-label">SOON</span>
            </div>
            <div className="difficulty-option">
              <span className="difficulty-symbol expert">♛</span>
              <div>
                <strong>Expert</strong>
                <p>Test your calculation</p>
              </div>
              <span className="locked-label">SOON</span>
            </div>
          </div>

          <div className="tip-card">
            <span>♟</span>
            <p>
              <strong>Remember:</strong> Every strong player was once a
              beginner. Focus on understanding, not just winning.
            </p>
          </div>

          <div className="info-card history-card">
            <p className="card-label">YOUR GAME</p>
            <h3>Move History</h3>

            {formattedMoves.length === 0 ? (
              <p className="muted">Your moves will appear here.</p>
            ) : (
              <div className="move-history">
                <div className="move-history-header">
                  <span>#</span>
                  <span>WHITE</span>
                  <span>BLACK</span>
                </div>

                {formattedMoves.map((move) => (
                  <div className="move-history-row" key={move.moveNumber}>
                    <span>{move.moveNumber}.</span>
                    <span>{move.white}</span>
                    <span>{move.black}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      <footer>
        <span>CHESS COACH</span>
        <span>BUILT TO HELP YOU THINK BETTER ♟</span>
      </footer>
    </main>
  );
}

export default App;
