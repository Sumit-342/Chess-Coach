import { useEffect, useRef, useCallback } from "react";

export default function useStockfish() {
  const workerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingMoveRef = useRef(null);
  const readyPromiseRef = useRef(null);
  const workerGenerationRef = useRef(0);

  function cancelPendingMove() {
    const pending = pendingMoveRef.current;

    if (!pending) {
      return;
    }

    pendingMoveRef.current = null;

    pending.reject(new Error("Stockfish request cancelled."));
  }

  function restartWorker() {
    cancelPendingMove();

    workerGenerationRef.current += 1;

    if (readyPromiseRef.current) {
      readyPromiseRef.current.resolve();
    }

    workerRef.current?.terminate();
    workerRef.current = null;
    readyRef.current = false;

    createWorker();
  }

  function createWorker() {
    const worker = new Worker("/stockfish/stockfish-19-lite-single.js");

    workerRef.current = worker;
    readyRef.current = false;

    let resolveReady;

    const readyPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });

    readyPromiseRef.current = {
      promise: readyPromise,
      resolve: resolveReady,
    };

    worker.onmessage = (event) => {
      const line = String(event.data);

      if (workerRef.current !== worker) {
        return;
      }

      console.log("Stockfish:", line);

      if (line === "uciok") {
        worker.postMessage("isready");
      }

      if (line === "readyok") {
        readyRef.current = true;

        if (readyPromiseRef.current) {
          readyPromiseRef.current.resolve();
        }

        console.log("Stockfish is ready!");
      }

      if (line.startsWith("bestmove")) {
        const bestMove = line.split(" ")[1];
        const pending = pendingMoveRef.current;

        if (pending) {
          pendingMoveRef.current = null;
          pending.resolve(bestMove);
        }
      }
    };

    worker.postMessage("uci");

    return worker;
  }

  useEffect(() => {
    createWorker();

    return () => {
      cancelPendingMove();

      workerGenerationRef.current += 1;

      if (readyPromiseRef.current) {
        readyPromiseRef.current.resolve();
        readyPromiseRef.current = null;
      }

      workerRef.current?.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  const getBestMove = useCallback(async (fen, movetime = 500) => {
    const requestGeneration = workerGenerationRef.current;

    while (!readyRef.current) {
      const readiness = readyPromiseRef.current;

      if (!readiness) {
        throw new Error("Stockfish readiness is unavailable.");
      }

      await readiness.promise;

      if (requestGeneration !== workerGenerationRef.current) {
        throw new Error("Stockfish request cancelled.");
      }
    }

    if (requestGeneration !== workerGenerationRef.current) {
      throw new Error("Stockfish request cancelled.");
    }

    const worker = workerRef.current;

    if (!worker || !readyRef.current) {
      throw new Error("Stockfish is not ready yet.");
    }

    if (pendingMoveRef.current) {
      throw new Error("Stockfish is already calculating a move.");
    }

    return new Promise((resolve, reject) => {
      pendingMoveRef.current = { resolve, reject };

      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go movetime ${movetime}`);
    });
  }, []);

  return { getBestMove, readyRef, restartWorker };
}
