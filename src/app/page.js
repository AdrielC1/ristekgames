'use client'; // Wajib di Next.js App Router jika pakai useState/useEffect

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Flag, TimerOff, CheckCircle, XCircle, Trophy, History, Monitor, CircuitBoard, AlertTriangle, Sun, Moon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('binary');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [name, setName] = useState('');
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [records, setRecords] = useState([]);

  const maxTime = activeTab === 'binary' ? 60000 : 120000;

  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  const isTimeUpRef = useRef(isTimeUp);
  const nameRef = useRef(name);
  const activeTabRef = useRef(activeTab);
  const timeRef = useRef(time);

  // Read dark mode preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ristekgames-dark-mode');
    if (saved !== null) {
      setIsDarkMode(saved === 'true');
    }
  }, []);

  // FETCH DATA DARI DATABASE SAAT PERTAMA KALI DIBUKA
  useEffect(() => {
    fetch('/api/records')
      .then(res => res.json())
      .then(data => {
        // Normalisasi format jika diperlukan
        const formattedData = data.map(row => ({
          ...row,
          time: row.time_ms,
          timestamp: new Date(row.created_at).toLocaleString('id-ID')
        }));
        setRecords(formattedData);
      })
      .catch(err => console.error("Gagal load data:", err));
  }, []);

  // Sync dark mode class to <html> and persist to localStorage
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('ristekgames-dark-mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isTimeUpRef.current = isTimeUp; }, [isTimeUp]);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { timeRef.current = time; }, [time]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 10);
      }, 10);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (time >= maxTime && isRunning) {
      setIsRunning(false);
      setIsPaused(false);
      setIsTimeUp(true);
      setTime(maxTime);
    }
  }, [time, isRunning, maxTime]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setErrorMessage('');
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    setIsPaused(true);
  }, []);

  // FUNGSI UNTUK MENYIMPAN KE DATABASE
  const saveRecord = async (isValid, reason) => {
    const newRecord = {
      game: activeTabRef.current,
      name: nameRef.current.trim(),
      time_ms: timeRef.current, // disesuaikan dengan field DB
      formatted_time: formatTime(timeRef.current),
      is_valid: isValid,
      reason: reason
    };

    // 1. Optimistic Update (Langsung tampil di UI agar cepat)
    setRecords(prev => [...prev, { ...newRecord, id: Date.now(), time: newRecord.time_ms, timestamp: new Date().toLocaleString('id-ID') }]);

    // 2. Simpan ke Database
    try {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
    } catch (error) {
      console.error("Gagal menyimpan ke database", error);
    }

    setIsTimeUp(false);
    setIsPaused(false);
    setIsRunning(false);
    setName('');
    setTime(0);
  };

  const handleFinish = useCallback(() => {
    saveRecord(true, 'Selesai Tepat Waktu');
  }, []);

  const handleTimeUpAcknowledge = () => {
    saveRecord(false, 'Gugur (Waktu Habis)');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || activeTabRef.current === 'history') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isTimeUpRef.current) return;
        if (!isRunningRef.current && !isPausedRef.current && !nameRef.current.trim()) {
          setErrorMessage('Harap masukkan nama peserta!');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
        if (isRunningRef.current) {
          handlePause();
        } else {
          handleStart();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart, handlePause]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const handleTabChange = (tab) => {
    if (isRunning || isPaused || isTimeUp) {
      setErrorMessage('Selesaikan sesi saat ini sebelum pindah tab!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    setActiveTab(tab);
    setName('');
    setTime(0);
    setIsTimeUp(false);
    setIsPaused(false);
    setErrorMessage('');
  };

  const getLeaderboard = (gameId) => {
    return records
      .filter((r) => r.game === gameId && r.is_valid)
      .sort((a, b) => a.time - b.time);
  };

  const getGameConfig = () => {
    if (activeTab === 'binary') return {
      title: 'Lomba Binary',
      color: 'blue',
      icon: <Monitor size={24} />,
      iconBadge: 'p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4 shadow-sm border border-blue-200 dark:border-blue-800/50',
      titleColor: 'text-blue-600 dark:text-blue-400',
      leaderboardHeader: 'bg-blue-50 dark:bg-blue-900/20 p-6 border-b border-blue-100 dark:border-blue-800/30 flex items-center justify-between',
      leaderboardTitle: 'text-xl font-bold text-blue-800 dark:text-blue-400 flex items-center',
      leaderboardBadge: 'bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider',
      startBtn: 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30',
      resumeBtn: 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30',
      timerRunning: 'text-blue-600 dark:text-blue-400',
    };
    if (activeTab === 'trainer') return {
      title: 'Lomba Trainer Board',
      color: 'emerald',
      icon: <CircuitBoard size={24} />,
      iconBadge: 'p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mr-4 shadow-sm border border-emerald-200 dark:border-emerald-800/50',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      leaderboardHeader: 'bg-emerald-50 dark:bg-emerald-900/20 p-6 border-b border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between',
      leaderboardTitle: 'text-xl font-bold text-emerald-800 dark:text-emerald-400 flex items-center',
      leaderboardBadge: 'bg-emerald-200 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider',
      startBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30',
      resumeBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30',
      timerRunning: 'text-emerald-600 dark:text-emerald-400',
    };
    return {
      title: 'Riwayat Keseluruhan',
      color: 'purple',
      icon: <History size={24} />,
      iconBadge: 'p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-4 shadow-sm border border-purple-200 dark:border-purple-800/50',
      titleColor: 'text-purple-600 dark:text-purple-400',
      leaderboardHeader: '',
      leaderboardTitle: '',
      leaderboardBadge: '',
      startBtn: '',
      resumeBtn: '',
      timerRunning: '',
    };
  };

  const getTabStyle = (tabId) => {
    if (activeTab !== tabId) return "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";
    if (tabId === 'binary') return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 font-bold";
    if (tabId === 'trainer') return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 font-bold";
    if (tabId === 'history') return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 font-bold";
  };

  const gameConfig = getGameConfig();

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-500">
              RistekGames
            </h1>
            <span className="ml-3 px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
              PANITIA
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => handleTabChange('binary')} className={`flex items-center px-4 py-2 rounded-lg transition-all text-sm ${getTabStyle('binary')}`}>
              <Monitor size={16} className="mr-2" /> Binary
            </button>
            <button onClick={() => handleTabChange('trainer')} className={`flex items-center px-4 py-2 rounded-lg transition-all text-sm ${getTabStyle('trainer')}`}>
              <CircuitBoard size={16} className="mr-2" /> Trainer
            </button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
            <button onClick={() => handleTabChange('history')} className={`flex items-center px-4 py-2 rounded-lg transition-all text-sm ${getTabStyle('history')}`}>
              <History size={16} className="mr-2" /> Riwayat
            </button>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className={`flex items-center text-2xl font-bold ${gameConfig.titleColor}`}>
            <span className={gameConfig.iconBadge}>
              {gameConfig.icon}
            </span>
            {gameConfig.title}
          </div>
          <div className="text-sm px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-medium shadow-sm">
            Total Entri: <span className="font-bold text-slate-800 dark:text-slate-200">{records.filter(r => activeTab === 'history' ? true : r.game === activeTab).length}</span>
          </div>
        </header>

        {activeTab !== 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center relative overflow-hidden transition-colors">

                {isTimeUp && (
                  <div className="absolute inset-0 bg-slate-900/95 dark:bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20 text-white text-center">
                    <TimerOff size={64} className="text-red-500 mb-4 animate-bounce" />
                    <h3 className="text-3xl font-bold mb-2 text-red-400">Waktu Habis!</h3>
                    <p className="text-slate-300 mb-8 text-lg">Peserta mencapai batas maksimal {activeTab === 'binary' ? '1 Menit' : '2 Menit'} dan dinyatakan <strong className="text-red-400">GUGUR</strong>.</p>
                    <button onClick={handleTimeUpAcknowledge} className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-red-500/20">
                      <XCircle className="mr-2" /> Catat ke Riwayat
                    </button>
                  </div>
                )}

                <h2 className="text-slate-400 dark:text-slate-500 font-bold mb-8 flex items-center uppercase tracking-widest text-xs">
                  <Monitor size={14} className="mr-2" /> Panel Juri & Timer
                </h2>

                <div className="w-full max-w-md mb-10">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Peserta / Tim</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isRunning || isPaused || isTimeUp} placeholder="Ketik nama di sini..." className="w-full px-5 py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 transition-all text-lg font-medium outline-none shadow-inner" />
                  {errorMessage && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-3 flex items-center font-medium animate-pulse bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/50">
                      <AlertTriangle size={16} className="mr-2" /> {errorMessage}
                    </p>
                  )}
                </div>

                <div className={`font-mono text-7xl sm:text-8xl font-black tracking-tighter tabular-nums mb-10 ${isRunning ? `${gameConfig.timerRunning} drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]` : (isPaused ? 'text-yellow-500 dark:text-yellow-400' : 'text-slate-800 dark:text-slate-100')}`}>
                  {formatTime(time)}
                </div>

                <div className="flex gap-4 w-full max-w-md">
                  {!isRunning && !isPaused ? (
                    <button onClick={() => { if (!name.trim()) { setErrorMessage('Harap masukkan nama peserta!'); setTimeout(() => setErrorMessage(''), 3000); return; } handleStart(); }} disabled={isTimeUp} className={`w-full flex justify-center items-center ${gameConfig.startBtn} text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 text-lg`}>
                      <Play className="mr-2" /> Mulai Timer
                    </button>
                  ) : isRunning ? (
                    <button onClick={handlePause} className="w-full flex justify-center items-center bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/30 transition-all active:scale-95 text-lg">
                      <Pause className="mr-2" /> Jeda Timer
                    </button>
                  ) : (
                    <>
                      <button onClick={handleStart} className={`flex-1 flex justify-center items-center ${gameConfig.resumeBtn} text-white px-4 py-4 rounded-xl font-bold transition-all active:scale-95 text-lg`}>
                        <Play className="mr-2" /> Lanjut
                      </button>
                      <button onClick={handleFinish} className="flex-1 flex justify-center items-center bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-4 py-4 rounded-xl font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 text-lg">
                        <CheckCircle className="mr-2" /> Selesai
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-8 text-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl w-full max-w-md border border-slate-100 dark:border-slate-700/50">
                  <p className="text-base text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider flex justify-center items-center">
                    <TimerOff size={18} className="mr-2 text-red-500" />
                    Batas Waktu: {activeTab === 'binary' ? '1 Menit' : '2 Menit'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[650px] transition-colors">
              <div className={gameConfig.leaderboardHeader}>
                <h2 className={gameConfig.leaderboardTitle}>
                  <Trophy className="mr-2" /> Papan Peringkat
                </h2>
                <span className={gameConfig.leaderboardBadge}>
                  TERCEPAT
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-0">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-700/50 backdrop-blur-md z-10">
                    <tr>
                      <th className="p-4 text-slate-500 dark:text-slate-400 font-semibold w-16 text-center text-sm uppercase tracking-wider">Rank</th>
                      <th className="p-4 text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Nama Peserta</th>
                      <th className="p-4 text-slate-500 dark:text-slate-400 font-semibold text-right text-sm uppercase tracking-wider">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLeaderboard(activeTab).length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-12 text-center text-slate-400 dark:text-slate-500 italic">
                          <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                          Belum ada rekor yang tercatat di kategori ini.
                        </td>
                      </tr>
                    ) : (
                      getLeaderboard(activeTab).map((record, index) => (
                        <tr key={record.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="p-4 text-center">
                            {index === 0 ? <span className="text-2xl drop-shadow-md">🥇</span> :
                              index === 1 ? <span className="text-2xl drop-shadow-md">🥈</span> :
                                index === 2 ? <span className="text-2xl drop-shadow-md">🥉</span> :
                                  <span className="font-bold text-slate-400 dark:text-slate-500">{index + 1}</span>}
                          </td>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{record.name}</td>
                          <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/20">{record.formatted_time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <History className="mr-2 text-purple-500" /> Riwayat Seluruh Permainan
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-5 text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Tanggal & Waktu</th>
                    <th className="p-5 text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Kategori Lomba</th>
                    <th className="p-5 text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Nama Peserta</th>
                    <th className="p-5 text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Waktu Tercatat</th>
                    <th className="p-5 text-slate-500 dark:text-slate-400 font-semibold text-center text-sm uppercase tracking-wider">Status Juri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-500 italic">
                        <History size={48} className="mx-auto mb-4 opacity-20" />
                        Sistem belum mencatat data permainan apapun.
                      </td>
                    </tr>
                  ) : (
                    [...records].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-5 text-sm text-slate-500 dark:text-slate-400">{record.timestamp || '-'}</td>
                        <td className="p-5 font-medium">
                          {record.game === 'binary' ? (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg w-max"><Monitor size={14} className="mr-2" /> Lomba Binary</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg w-max"><CircuitBoard size={14} className="mr-2" /> Trainer Board</span>
                          )}
                        </td>
                        <td className="p-5 font-bold text-slate-700 dark:text-slate-200">{record.name}</td>
                        <td className="p-5 font-mono font-medium text-slate-600 dark:text-slate-300">{record.formatted_time}</td>
                        <td className="p-5 text-center">
                          {record.is_valid ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle size={14} className="mr-1.5" /> SELESAI
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                              <TimerOff size={14} className="mr-1.5" /> GUGUR (WAKTU HABIS)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
