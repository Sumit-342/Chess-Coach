import { useEffect, useRef, useCallback } from "react";

export default function useStockfish() {
  const workerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingMoveRef = useRef(null);

  useEffect(() => {
    const worker = new Worker("/stockfish/stockfish-19-lite-single.js");

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const line = String(event.data);

      console.log("Stockfish:", line);

      if (line === "uciok") {
        worker.postMessage("isready");
      }

      if (line === "readyok") {
        readyRef.current = true;
        console.log("Stockfish is ready!");
      }

      if (line.startsWith("bestmove")) {
        const bestMove = line.split(" ")[1];
        const resolve = pendingMoveRef.current;

        if (resolve) {
          pendingMoveRef.current = null;
          resolve(bestMove);
        }
      }
    };

    worker.postMessage("uci");

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  const getBestMove = useCallback((fen, movetime = 500) => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current;

      if (!worker || !readyRef.current) {
        reject(new Error("Stockfish is not ready yet."));
        return;
      }

      if (pendingMoveRef.current) {
        reject(new Error("Stockfish is already calculating a move."));
        return;
      }

      pendingMoveRef.current = resolve;

      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go movetime ${movetime}`);
    });
  }, []);

  return { getBestMove, readyRef };
}
