"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [board, setBoard] = useState(Array(81).fill(""));
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);
  
  // Simulated initial load
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
      // Mock rankings
      setRankings([
        { username: "Player1", score: 9500, time_seconds: 120 },
        { username: "SudokuMaster", score: 8900, time_seconds: 145 },
        { username: "CloudGamer", score: 8200, time_seconds: 180 },
      ]);
    }, 1500);
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const startGame = async () => {
    setLoading(true);
    try {
      // API call to the simulated ALB/ECS cluster
      const res = await fetch("http://localhost/api/start-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Guest", difficulty: "medium" })
      });
      
      const mockBoard = Array(81).fill("");
      mockBoard[0] = "5"; mockBoard[1] = "3"; mockBoard[4] = "7";
      mockBoard[9] = "6"; mockBoard[12] = "1"; mockBoard[13] = "9"; mockBoard[14] = "5";
      setBoard(mockBoard);
      setTimer(0);
      setIsRunning(true);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleCellChange = (index, val) => {
    if (!/^[1-9]?$/.test(val)) return;
    const newBoard = [...board];
    newBoard[index] = val;
    setBoard(newBoard);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-bold tracking-widest animate-pulse">CONNECTING TO CLOUD...</h2>
          <p className="text-slate-400 mt-2">Provisioning ECS Fargate Containers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">S</div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Sudoku Enterprise</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ALB Active</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> ECS: 3 Tasks</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Game Info & Controls */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Game Status</h3>
            <div className="text-4xl font-mono text-blue-400 mb-6 font-light tracking-wider">
              {formatTime(timer)}
            </div>
            {!isRunning ? (
              <button 
                onClick={startGame}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-95"
              >
                Start New Game
              </button>
            ) : (
              <button 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 active:scale-95"
              >
                Submit Solution
              </button>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm flex-1">
            <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
              <span className="text-slate-200">Global Ranking</span>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Redis Cache</span>
            </h3>
            <ul className="space-y-4">
              {rankings.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>#{i+1}</span>
                    <span className="text-slate-200">{r.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-emerald-400">{r.score}</div>
                    <div className="text-xs text-slate-500">{formatTime(r.time_seconds)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center Column: Board */}
        <div className="lg:col-span-6 flex justify-center items-start">
          <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
            <div className="grid grid-cols-9 gap-px bg-slate-600 border-2 border-slate-600 rounded-lg overflow-hidden">
              {board.map((val, i) => {
                const row = Math.floor(i / 9);
                const col = i % 9;
                const isRightBorder = col === 2 || col === 5;
                const isBottomBorder = row === 2 || row === 5;
                const isInitial = val !== "" && (i===0||i===1||i===4||i===9||i===12||i===13||i===14);
                
                return (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={val}
                    readOnly={isInitial}
                    onChange={(e) => handleCellChange(i, e.target.value)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-center text-xl sm:text-2xl outline-none transition-colors
                      ${isInitial ? 'bg-slate-700 text-blue-300 font-semibold' : 'bg-slate-800 text-white font-light hover:bg-slate-700 focus:bg-slate-700 focus:ring-inset focus:ring-1 focus:ring-blue-500'}
                      ${isRightBorder ? 'border-r-2 border-r-slate-600' : ''}
                      ${isBottomBorder ? 'border-b-2 border-b-slate-600' : ''}
                    `}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Server Metrics */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Cloud Metrics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">ECS CPU Utilization</span>
                  <span className="text-emerald-400">42%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[42%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">RDS Connections</span>
                  <span className="text-blue-400">12/100</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[12%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Redis Hit Rate</span>
                  <span className="text-indigo-400">94%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[94%]"></div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 font-mono break-all flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                Load Balancer ID: alb-sudoku-prod-01
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
