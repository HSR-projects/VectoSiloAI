import { bestMove, EngineError } from "@/lib/stockfish";

export interface ChessAnalysis {
  fen: string;
  bestMove: string;
  from: string;
  to: string;
  promotion?: string;
  engineReachable: boolean;
}

const FEN_REGEX = /^[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8]+ [wb] [-KkqQ]+ - \d+ \d+$/;

function extractFen(text: string): string | null {
  const match = text.match(FEN_REGEX);
  return match ? match[0] : null;
}

export async function analyzeChessQuery(query: string): Promise<ChessAnalysis | null> {
  const fen = extractFen(query) || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  try {
    const move = await bestMove(fen, { skill: 10, movetimeMs: 500 });
    return {
      fen,
      bestMove: move.uci,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      engineReachable: true,
    };
  } catch {
    return {
      fen,
      bestMove: "",
      from: "",
      to: "",
      engineReachable: false,
    };
  }
}
