/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fish, TrendingUp, ShoppingCart, Info, Zap, Waves, History, Trophy, X, Award, ChevronRight, LayoutPanelLeft } from 'lucide-react';
import { UPGRADES, NEWS_HEADLINES, ACHIEVEMENTS } from './constants';

const SAVE_KEY = 'salmon_clicker_save';

export default function App() {
  // --- Game State ---
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState(
    Object.fromEntries(UPGRADES.map((u) => [u.id, 0]))
  );
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [multiBuyAmount, setMultiBuyAmount] = useState(1);
  const [showAchievements, setShowAchievements] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);
  const [mobilePanel, setMobilePanel] = useState('clicker'); // 'records', 'clicker', 'hatchery'
  const [showCodes, setShowCodes] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isWorldAdmin, setIsWorldAdmin] = useState(false);
  const [customSalmonValue, setCustomSalmonValue] = useState('');
  const [rebirths, setRebirths] = useState(0);
  const [globalEvent, setGlobalEvent] = useState({ multiplier: 1, announcement: "", type: "none", active: false });
  const [showWorldAdmin, setShowWorldAdmin] = useState(false);
  const [worldAdminForm, setWorldAdminForm] = useState({ multiplier: 2, announcement: 'RAINING SALMON!', type: 'salmon_rain', duration: 5 });

  // --- Persistence ---
  const saveGame = useCallback((forceData) => {
    const data = forceData || { count, totalCount, ownedUpgrades, unlockedAchievements, isAdminMode, isWorldAdmin, rebirths };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [count, totalCount, ownedUpgrades, unlockedAchievements, isAdminMode, isWorldAdmin, rebirths]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCount(data.count || 0);
        setTotalCount(data.totalCount || 0);
        setOwnedUpgrades(data.ownedUpgrades || Object.fromEntries(UPGRADES.map((u) => [u.id, 0])));
        setUnlockedAchievements(data.unlockedAchievements || []);
        setIsAdminMode(data.isAdminMode || false);
        setIsWorldAdmin(data.isWorldAdmin || false);
        setRebirths(data.rebirths || 0);
      } catch (e) {
        console.error('Failed to load save data', e);
      }
    }
  }, []);

  // --- Server Polling for Global Events ---
  useEffect(() => {
    const fetchGlobalEvent = async () => {
      try {
        const res = await fetch('/api/global-event');
        const data = await res.json();
        setGlobalEvent(data);
      } catch (e) {
        // Silently fail if server is still starting
      }
    };
    fetchGlobalEvent();
    const timer = setInterval(fetchGlobalEvent, 5000);
    return () => clearInterval(timer);
  }, []);

  // Auto-save every 10 seconds or on important actions
  useEffect(() => {
    const timer = setInterval(() => {
      saveGame();
      const indicator = document.getElementById('save-indicator');
      if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => { if (indicator) indicator.style.opacity = '0'; }, 1500);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [saveGame]);

  // Audio Context for synthetic sounds
  const playSplosh = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio might be blocked by browser policy until interaction
    }
  }, []);

  // --- Refs ---
  const countRef = useRef(count);
  useEffect(() => { countRef.current = count; }, [count]);

  // --- Calculations ---
  const calculateSps = useCallback(() => {
    const base = UPGRADES.reduce((total, upgrade) => {
      return total + upgrade.baseSps * (ownedUpgrades[upgrade.id] || 0);
    }, 0);
    const eventMult = globalEvent.active ? globalEvent.multiplier : 1;
    return base * (1 + rebirths * 0.5) * eventMult;
  }, [ownedUpgrades, rebirths, globalEvent]);

  const sps = calculateSps();

  // --- Achievement Logic ---
  useEffect(() => {
    const checkAchievements = () => {
      const newUnlocks = [];

      const tryUnlock = (id) => {
        if (!unlockedAchievements.includes(id)) {
          newUnlocks.push(id);
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          if (ach) setLastNotification(ach);
        }
      };

      if (totalCount >= 1) tryUnlock('first_click');
      if (totalCount >= 100) tryUnlock('century_caught');
      if (totalCount >= 1000000) tryUnlock('millionaire');
      if (totalCount >= 1000000000) tryUnlock('billionaire');
      if (ownedUpgrades['bear'] >= 1) tryUnlock('bear_friend');
      if (calculateSps() >= 10) tryUnlock('sps_10');
      if (ownedUpgrades['hatchery'] >= 1) tryUnlock('hatchery_tycoon');
      if (rebirths >= 1) tryUnlock('rebirth_1');
      if (rebirths >= 5) tryUnlock('rebirth_5');

      if (newUnlocks.length > 0) {
        setUnlockedAchievements(prev => [...prev, ...newUnlocks]);
        saveGame();
      }
    };

    checkAchievements();
  }, [totalCount, ownedUpgrades, calculateSps, unlockedAchievements, saveGame, rebirths]);

  useEffect(() => {
    if (lastNotification) {
      const timer = setTimeout(() => setLastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastNotification]);

  // --- Game Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSps = calculateSps();
      if (currentSps > 0) {
        setCount((prev) => prev + currentSps / 10);
        setTotalCount((prev) => prev + currentSps / 10);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [calculateSps]);

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSalmonClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [count]); // Trigger on count so handleSalmonClick has closure (though better use functional updates)

  useEffect(() => {
    const newsInterval = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % NEWS_HEADLINES.length);
    }, 8000);
    return () => clearInterval(newsInterval);
  }, []);

  // --- Actions ---
  const handleSalmonClick = (e) => {
    const eventMult = globalEvent.active ? globalEvent.multiplier : 1;
    const clickValue = 1 * (1 + rebirths * 0.5) * eventMult;
    setCount((prev) => prev + clickValue);
    setTotalCount((prev) => prev + clickValue);
    playSplosh();

    let centerX, centerY;
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    } else {
      centerX = window.innerWidth / 2;
      centerY = window.innerHeight / 2;
    }

    // Spawn multiple particles for an "explosion"
    const particleCount = 5;
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const id = Date.now() + i;
      const rotation = (Math.random() - 0.5) * 60;
      // Explosion logic: Burst outwards and slightly down to avoid header
      const trajectoryX = (Math.random() - 0.5) * 450;
      const trajectoryY = (Math.random() * 300) - 50; // Largely outwards and down
      
      newParticles.push({ 
        id, 
        x: centerX, 
        y: centerY, 
        value: clickValue, 
        rotation, 
        trajectoryX,
        trajectoryY,
        isMain: i === 0
      });
    }

    setFloatingTexts((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => !newParticles.find(p => p.id === t.id)));
    }, 1000);
  };

  const getMultiBuyTotalCost = (upgrade, amount) => {
    const current = ownedUpgrades[upgrade.id] || 0;
    let total = 0;
    for (let i = 0; i < amount; i++) {
      total += Math.floor(upgrade.baseCost * Math.pow(1.15, current + i));
    }
    return total;
  };

  const buyUpgrade = (upgrade) => {
    const cost = getMultiBuyTotalCost(upgrade, multiBuyAmount);
    if (count >= cost) {
      setCount((prev) => prev - cost);
      setOwnedUpgrades((prev) => ({
        ...prev,
        [upgrade.id]: (prev[upgrade.id] || 0) + multiBuyAmount
      }));
      saveGame();
    }
  };

  const buyMaxAll = () => {
    let currentCount = count;
    const newOwned = { ...ownedUpgrades };
    let changed = false;
    
    UPGRADES.forEach(upgrade => {
      let canBuyMore = true;
      while (canBuyMore) {
        const nextLevel = newOwned[upgrade.id] || 0;
        const nextCost = Math.floor(upgrade.baseCost * Math.pow(1.15, nextLevel));
        if (currentCount >= nextCost) {
          currentCount -= nextCost;
          newOwned[upgrade.id] = (newOwned[upgrade.id] || 0) + 1;
          changed = true;
        } else {
          canBuyMore = false;
        }
      }
    });

    if (changed) {
      setCount(currentCount);
      setOwnedUpgrades(newOwned);
      saveGame();
    }
  };

  const performRebirth = () => {
    const baseCost = 1000000000 * Math.pow(10, rebirths);
    if (count >= baseCost) {
      // Calculate max rebirths buyable: n = floor(log10((9 * Cash) / (BaseCost) + 1))
      const n = Math.floor(Math.log10((9 * count) / (baseCost) + 1));
      
      if (n > 0) {
        const newRebirths = rebirths + n;
        setCount(0);
        setOwnedUpgrades(Object.fromEntries(UPGRADES.map((u) => [u.id, 0])));
        setRebirths(newRebirths);
        saveGame({ 
          count: 0, 
          totalCount, 
          ownedUpgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])), 
          unlockedAchievements, 
          isAdminMode, 
          isWorldAdmin,
          rebirths: newRebirths 
        });
        alert(`Congratulations! You have been reborn ${n} time(s). Your production bonus has increased!`);
      }
    }
  };

  const formatNumber = (num) => {
    if (num < 1000) return Math.floor(num).toString();
    
    const suffixes = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];
    const suffixIndex = Math.floor(Math.log10(num) / 3);
    
    if (suffixIndex >= suffixes.length) {
      return num.toExponential(2);
    }
    
    const shortValue = num / Math.pow(1000, suffixIndex);
    return shortValue.toFixed(suffixIndex === 0 ? 0 : 2) + suffixes[suffixIndex];
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (codeValue === '6767') {
      setIsAdminMode(true);
      setShowCodes(false);
      setCodeValue('');
      saveGame({ count, totalCount, ownedUpgrades, unlockedAchievements, isAdminMode: true, rebirths, isWorldAdmin });
    } else if (codeValue === 'salmon67') {
      setIsWorldAdmin(true);
      setShowWorldAdmin(true);
      setShowCodes(false);
      setCodeValue('');
      saveGame({ count, totalCount, ownedUpgrades, unlockedAchievements, isAdminMode, rebirths, isWorldAdmin: true });
    } else {
      alert('Invalid code!');
    }
  };

  const triggerWorldEvent = async () => {
    try {
      const res = await fetch('/api/admin/trigger-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'salmon67',
          multiplier: worldAdminForm.multiplier,
          announcement: worldAdminForm.announcement,
          type: worldAdminForm.type,
          durationMinutes: worldAdminForm.duration
        })
      });
      if (res.ok) {
        alert("Global Event Triggered!");
        setShowWorldAdmin(false);
      } else {
        alert("Failed to trigger event - check server status");
      }
    } catch (e) {
      alert("Error contacting server");
    }
  };

  const clearWorldEvent = async () => {
    try {
      const res = await fetch('/api/admin/clear-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'salmon67' })
      });
      if (res.ok) {
        alert("Event Cleared!");
        setShowWorldAdmin(false);
      }
    } catch (e) {
      alert("Error contacting server");
    }
  };

  const applyAdminSalmon = () => {
    const val = parseInt(customSalmonValue);
    if (!isNaN(val)) {
      setCount(val);
      const newTotal = Math.max(totalCount, val);
      setTotalCount(newTotal);
      setCustomSalmonValue('');
      setShowAdminPanel(false);
      saveGame({ count: val, totalCount: newTotal, ownedUpgrades, unlockedAchievements, isAdminMode, isWorldAdmin, rebirths });
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#E0F7FA] text-[#004D40] font-['Segoe_UI',Roboto,Helvetica,Arial,sans-serif] selection:bg-[#FF8C69]/30 overflow-hidden flex flex-col items-center">
      <AnimatePresence>
        {globalEvent.active && globalEvent.type === 'salmon_rain' && (
          <SalmonRain />
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] w-full h-full p-3 md:p-6 flex flex-col gap-3 md:gap-4 box-border relative overflow-hidden">
        
        {/* Global Announcement Overlay */}
        <AnimatePresence>
          {globalEvent.active && globalEvent.announcement && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-[500] bg-yellow-400 border-4 border-yellow-600 px-8 py-2 rounded-b-3xl shadow-xl flex items-center gap-4"
            >
              <Zap className="text-yellow-700 animate-pulse" />
              <div className="text-sm md:text-lg font-black text-yellow-900 uppercase italic">
                {globalEvent.announcement}
              </div>
              <div className="bg-yellow-100/50 px-2 rounded font-mono text-xs font-bold text-yellow-800">
                {globalEvent.multiplier}x BOOST!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Top Right Action Buttons */}
        <div className="absolute top-2 md:top-4 right-2 md:right-4 flex gap-2 z-[250]">
          {isWorldAdmin && (
            <button 
              onClick={() => setShowWorldAdmin(true)}
              className="p-2 md:p-3 bg-white border-2 md:border-4 border-yellow-400 rounded-xl md:rounded-2xl shadow-[0_3px_0_#FBC02D] md:shadow-[0_5px_0_#FBC02D] hover:scale-105 active:scale-95 transition-all text-yellow-600 animate-pulse"
              title="Global Events Admin"
            >
              <Zap className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          )}
          {isAdminMode && (
            <button 
              onClick={() => setShowAdminPanel(true)}
              className="p-2 md:p-3 bg-white border-2 md:border-4 border-[#FFD54F] rounded-xl md:rounded-2xl shadow-[0_3px_0_#FBC02D] md:shadow-[0_5px_0_#FBC02D] hover:scale-105 active:scale-95 transition-all text-orange-500"
              title="Salmon Giver Admin"
            >
              <Fish className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          )}
          <button 
            onClick={() => setShowAchievements(true)}
            className="p-2 md:p-3 bg-white border-2 md:border-4 border-[#FF8C69] rounded-xl md:rounded-2xl shadow-[0_3px_0_#FF7043] md:shadow-[0_5px_0_#FF7043] hover:scale-105 active:scale-95 transition-all text-[#FF7043]"
            title="View Achievements"
          >
            <Trophy className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <button 
            onClick={() => setShowCodes(true)}
            className="p-2 md:p-3 bg-white border-2 md:border-4 border-[#4DD0E1] rounded-xl md:rounded-2xl shadow-[0_3px_0_#26C6DA] md:shadow-[0_5px_0_#26C6DA] hover:scale-105 active:scale-95 transition-all text-[#26C6DA]"
            title="Enter Codes"
          >
            <LayoutPanelLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Save Indicator */}
        <div id="save-indicator" className="fixed bottom-14 md:bottom-2 left-2 bg-[#26C6DA] text-white text-[10px] font-black px-2 py-1 rounded-full opacity-0 transition-opacity duration-500 z-[300] shadow-sm pointer-events-none uppercase">
          Device Saved
        </div>

        {/* Vibrant Header */}
        <header className="h-[60px] md:h-[80px] bg-[#FF8C69] border-[3px] md:border-[4px] border-[#FF7043] rounded-[15px] md:rounded-[20px] shadow-[0_4px_0_#F4511E] md:shadow-[0_6px_0_#F4511E] flex flex-col items-center justify-center relative shrink-0">
          <h1 className="text-xl md:text-[42px] font-[900] text-white uppercase tracking-[1px] md:tracking-[2px] [text-shadow:2px_2px_0_#D84315] md:[text-shadow:3px_3px_0_#D84315] leading-none text-center px-10">
            🐟 SALMON CLICKER 🐟
          </h1>
        </header>

        {/* Achievement Notification remains at bottom-right */}
        <AnimatePresence>
          {lastNotification && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="fixed bottom-16 md:bottom-8 right-4 md:right-8 bg-white border-4 border-[#4DD0E1] rounded-2xl p-4 shadow-[0_8px_0_#26C6DA] z-[100] flex items-center gap-4 max-w-[280px] md:max-w-sm"
            >
              <div className="text-3xl md:text-4xl">{lastNotification.icon}</div>
              <div>
                <div className="text-[10px] md:text-xs font-black text-[#26C6DA] uppercase">Unlocked!</div>
                <div className="text-sm md:text-lg font-black text-[#00838F]">{lastNotification.name}</div>
                <div className="text-[10px] md:text-xs font-bold opacity-70 leading-tight">{lastNotification.description}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid - Responsive */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(240px,280px)_1fr_minmax(260px,320px)] gap-3 md:gap-4 overflow-hidden min-h-0 w-full">
          
          {/* Mobile Navigation Tabs */}
          <div className="lg:hidden flex gap-1 bg-white/20 p-1 rounded-xl shrink-0">
            {[
              { id: 'records', label: 'Records', icon: <History className="w-4 h-4"/> },
              { id: 'clicker', label: 'River', icon: <Fish className="w-4 h-4"/> },
              { id: 'hatchery', label: 'Hatchery', icon: <ShoppingCart className="w-4 h-4"/> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobilePanel(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  mobilePanel === tab.id ? 'bg-[#26C6DA] text-white shadow-md' : 'text-[#00838F] hover:bg-white/40'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Left Panel: Records/Stats */}
          <aside className={`
            lg:flex flex-col p-4 md:p-5 overflow-hidden transition-all duration-300
            bg-white/80 backdrop-blur-[10px] rounded-[24px] border-[4px] border-[#4DD0E1] shadow-[0_8px_0_#26C6DA]
            ${mobilePanel === 'records' ? 'flex flex-1' : 'hidden'}
          `}>
            <div className="flex items-center justify-between border-b-[3px] border-[#B2EBF2] pb-2 mb-4">
              <div className="text-xl md:text-[24px] font-[800] text-[#00838F] uppercase">
                Records
              </div>
            </div>
            
            <div className="space-y-1">
              <StatRow label="Caught" value={formatNumber(totalCount)} icon={<Trophy className="w-3 h-3"/>} />
              <StatRow label="Rebirths" value={rebirths} icon={<History className="w-3 h-3"/>} />
              <StatRow label="SPS" value={formatNumber(sps)} icon={<Zap className="w-3 h-3 text-yellow-500"/>} />
              <StatRow label="Rank" value={unlockedAchievements.length >= ACHIEVEMENTS.length ? 'Master' : 'Amateur'} icon={<Award className="w-3 h-3"/>} />
            </div>

            {totalCount >= 1000000000 && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="text-[10px] font-black text-[#006064] uppercase text-center opacity-60">Cycle of Life</div>
                <button 
                  onClick={performRebirth}
                  disabled={count < (1000000000 * Math.pow(10, rebirths))}
                  className={`py-2 px-4 rounded-xl border-2 font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                    count >= (1000000000 * Math.pow(10, rebirths))
                    ? 'bg-[#FF7043] border-white text-white shadow-[0_4px_0_#D84315] hover:scale-105 active:scale-95 active:shadow-none'
                    : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <History className="w-3 h-3" />
                  {count >= (1000000000 * Math.pow(10, rebirths) * 1.1) ? 'Rebirth Max' : `Rebirth (${formatNumber(1000000000 * Math.pow(10, rebirths))})`}
                </button>
              </div>
            )}

            <div className="mt-4 bg-[#FFEE58] p-3 rounded-[8px] border-[2px] border-[#FBC02D] text-center shadow-inner">
               <div className="text-[12px] font-extrabold text-[#D84315]">X2 SEASONAL BONUS</div>
               <div className="text-[10px] font-bold text-[#D84315]/70 italic">RIVER RUN EVENT</div>
            </div>

            <div className="mt-auto pt-4 text-center font-bold text-[10px] md:text-[11px] opacity-40 uppercase tracking-widest italic leading-tight">
              The Great Migration<br/>approaches fast...
            </div>
          </aside>

          {/* Center Column: Big Salmon Area */}
          <main className={`
            lg:flex flex-col items-center justify-center relative min-h-0 transition-all duration-300
            ${mobilePanel === 'clicker' ? 'flex flex-1' : 'hidden'}
          `}>
            {/* Pulsing Aura */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-[#4DD0E1]/10 rounded-full blur-[40px] md:blur-[80px] -z-10"
            />

            {/* Counter Box */}
            <div className="mb-4 md:mb-8 flex flex-col items-center">
              <div className="bg-white px-6 md:px-10 py-2 md:py-3 rounded-[100px] border-[3px] md:border-[4px] border-[#FF8C69] shadow-[0_4px_0_#FF7043] md:shadow-[0_6px_0_#FF7043] flex flex-col items-center">
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-3xl md:text-[48px] font-[900] text-[#E64A19] tabular-nums leading-none">
                    {formatNumber(count)}
                  </span>
                  <span className="text-sm md:text-[18px] text-[#F4511E] font-[600] uppercase tracking-tighter self-end mb-1">Salmon</span>
                </div>
                {sps > 0 && (
                  <div className="text-[11px] md:text-[14px] font-black text-[#D84315] opacity-80 uppercase tracking-widest border-t border-[#FF8C69]/20 w-full text-center pt-0.5 md:pt-1 mt-0.5 md:mt-1">
                    {formatNumber(sps)} per sec
                  </div>
                )}
              </div>
            </div>

            {/* The Great Clicker */}
            <div className="relative flex flex-col items-center">
              {isAdminMode && (
                <button 
                  onClick={() => setShowAdminPanel(true)}
                  className="mb-4 px-4 py-2 bg-yellow-400 border-2 border-yellow-600 rounded-xl font-black text-yellow-900 shadow-[0_3px_0_#ca8a04] hover:scale-105 active:scale-95 transition-all text-xs uppercase flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Admin Tools
                </button>
              )}

              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.8, rotate: (Math.random() - 0.5) * 5 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  onClick={handleSalmonClick}
                  className="w-[240px] h-[240px] md:w-[320px] md:h-[320px] bg-[radial-gradient(circle,#80DEEA,#26C6DA)] rounded-full flex items-center justify-center border-[8px] md:border-[12px] border-white shadow-[0_10px_0_#00ACC1] md:shadow-[0_15px_0_#00ACC1] cursor-pointer group active:shadow-[0_2px_0_#00ACC1] active:translate-y-[8px] md:active:translate-y-[13px] transition-all overflow-visible"
                >
                  <div className="text-7xl md:text-9xl transition-transform group-hover:rotate-12 group-hover:scale-110 drop-shadow-lg select-none pointer-events-none">
                    🐟
                  </div>
                </motion.div>
                
                {/* Ripple Effect */}
                <AnimatePresence>
                  <motion.div
                    key={count}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 border-[10px] border-[#4DD0E1] rounded-full pointer-events-none"
                  />
                </AnimatePresence>
              </div>
            </div>

            {/* Floating salmon layer - Explosion particles */}
            <AnimatePresence>
              {floatingTexts.map((text) => (
                <motion.div
                  key={text.id}
                  initial={{ 
                    opacity: 1, 
                    y: text.y - 40, // Offset from center
                    x: text.x,      // Use viewport center
                    rotate: 0,
                    scale: 0.2
                  }}
                  animate={{ 
                    opacity: 0, 
                    y: text.y + text.trajectoryY, 
                    x: text.x + text.trajectoryX,
                    rotate: text.rotation * 10,
                    scale: text.isMain ? 2 : 1
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  exit={{ opacity: 0 }}
                  className="fixed pointer-events-none flex flex-col items-center -translate-x-1/2 -translate-y-1/2 z-50 select-none"
                >
                  <span className="text-4xl filter drop-shadow-md">🐟</span>
                  {text.isMain && (
                    <span className="text-xl font-[900] text-[#FF7043] [text-shadow:2px_2px_0_white] mt-1 shrink-0">
                      +{text.value}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </main>

          {/* Right Panel: Shop */}
          <aside className={`
            lg:flex flex-col p-4 md:p-5 overflow-hidden transition-all duration-300
            bg-white/80 backdrop-blur-[10px] rounded-[24px] border-[4px] border-[#4DD0E1] shadow-[0_8px_0_#26C6DA]
            ${mobilePanel === 'hatchery' ? 'flex flex-1' : 'hidden'}
          `}>
            <div className="text-xl md:text-[24px] font-[800] text-center text-[#00838F] border-b-[3px] border-[#B2EBF2] pb-2 mb-2 uppercase">
              The Hatchery
            </div>

            {/* Multi-buy selection */}
            <div className="flex bg-[#E0F7FA] p-1 rounded-xl mb-3 gap-1 shrink-0">
              {[1, 10, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setMultiBuyAmount(amt)}
                  className={`flex-1 py-1 text-[10px] md:text-xs font-black rounded-lg border-2 transition-all ${
                    multiBuyAmount === amt 
                      ? 'bg-[#26C6DA] text-white border-white shadow-sm' 
                      : 'bg-white/50 text-[#00838F] border-transparent hover:bg-white'
                  }`}
                >
                  x{amt}
                </button>
              ))}
              <button
                onClick={buyMaxAll}
                className="flex-[1.5] py-1 text-[10px] md:text-xs font-black rounded-lg border-2 bg-gradient-to-r from-[#FF8C69] to-[#FF7043] text-white border-white shadow-[0_2px_0_#F4511E] hover:scale-105 active:scale-95 active:shadow-none transition-all uppercase"
              >
                Max All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-2.5 custom-scrollbar">
              {UPGRADES.map((upgrade) => {
                const owned = ownedUpgrades[upgrade.id] || 0;
                const cost = getMultiBuyTotalCost(upgrade, multiBuyAmount);
                const canAfford = count >= cost;

                return (
                  <motion.button
                    key={upgrade.id}
                    whileHover={canAfford ? { scale: 1.02, x: 4 } : {}}
                    whileTap={canAfford ? { scale: 0.98 } : {}}
                    onClick={() => buyUpgrade(upgrade)}
                    disabled={!canAfford}
                    className={`
                      w-full bg-white rounded-[16px] p-2.5 md:p-3 flex items-center border-[3px] transition-all group shrink-0
                      ${canAfford ? 'border-[#B2EBF2] shadow-sm cursor-pointer' : 'border-slate-200 opacity-60 grayscale cursor-not-allowed'}
                    `}
                  >
                    <div className="w-[40px] md:w-[50px] h-[40px] md:h-[50px] bg-[#FFAB91] rounded-[10px] md:rounded-[12px] flex items-center justify-center text-xl md:text-2xl shrink-0 mr-3 shadow-sm group-hover:rotate-6 transition-transform">
                      {upgrade.icon}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-[700] text-[14px] md:text-[16px] text-[#37474F] truncate tracking-tight">{upgrade.name}</div>
                      <div className="text-[12px] md:text-[14px] font-[800] text-[#FF7043] leading-none mt-0.5">
                        Cost: {formatNumber(cost)}
                      </div>
                    </div>
                    <div className="text-[18px] md:text-[20px] font-[900] text-[#0097A7] ml-2 leading-none">
                      {owned}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </aside>
        </div>

        {/* Achievement Viewer Modal */}
        <AnimatePresence>
          {showAchievements && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#004D40]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-8"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[24px] md:rounded-[32px] border-[6px] md:border-[8px] border-[#FF8C69] shadow-[0_10px_0_#FF7043] md:shadow-[0_15px_0_#FF7043] flex flex-col p-6 md:p-8 max-h-[90vh] md:max-h-[80vh]"
              >
                <div className="flex justify-between items-start mb-4 md:mb-6">
                  <div>
                    <h2 className="text-2xl md:text-4xl font-[900] text-[#FF7043] uppercase tracking-wider">Achievements</h2>
                    <p className="text-[10px] md:text-sm text-[#00838F] font-bold uppercase">Unlocked: {unlockedAchievements.length} / {ACHIEVEMENTS.length}</p>
                  </div>
                  <button onClick={() => setShowAchievements(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 md:w-8 md:h-8 text-[#FF7043]" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-1 md:pr-4 custom-scrollbar-orange">
                  {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div 
                        key={ach.id} 
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-[3px] md:border-4 flex items-center gap-4 md:gap-6 transition-all ${
                          isUnlocked 
                            ? 'bg-[#E0F7FA] border-[#4DD0E1] shadow-sm' 
                            : 'bg-slate-50 border-slate-200 opacity-40 grayscale'
                        }`}
                      >
                        <div className="text-3xl md:text-5xl shrink-0">{ach.icon}</div>
                        <div className="flex-1">
                           <div className="text-base md:text-xl font-black text-[#00838F] tracking-tight">{ach.name}</div>
                           <div className="text-[10px] md:text-sm font-bold opacity-70 leading-tight">{ach.description}</div>
                        </div>
                        {isUnlocked && <Award className="shrink-0 w-6 h-6 md:w-8 md:h-8 text-[#26C6DA]" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secret Codes Modal */}
        <AnimatePresence>
          {showCodes && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#004D40]/60 backdrop-blur-md z-[300] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border-[6px] md:border-[8px] border-[#4DD0E1] shadow-[0_8px_0_#26C6DA] md:shadow-[0_12px_0_#26C6DA] w-full max-w-sm"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-[900] text-[#00838F] uppercase tracking-wider">Secret Code</h3>
                  <button onClick={() => setShowCodes(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-[#26C6DA]"/>
                  </button>
                </div>
                <form onSubmit={handleCodeSubmit} className="space-y-6">
                  <input 
                    type="text" 
                    value={codeValue}
                    onChange={(e) => setCodeValue(e.target.value)}
                    placeholder="ENTER CODE..."
                    className="w-full p-4 border-[3px] border-[#B2EBF2] rounded-xl font-[800] text-xl text-center focus:outline-none focus:border-[#26C6DA] text-[#00838F] placeholder:opacity-30"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#26C6DA] text-white font-[900] rounded-xl shadow-[0_5px_0_#0097A7] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest text-lg"
                  >
                    Submit
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Tools Modal */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#004D40]/60 backdrop-blur-md z-[300] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border-[6px] md:border-[8px] border-[#FBC02D] shadow-[0_8px_0_#F9A825] md:shadow-[0_12px_0_#F9A825] w-full max-w-sm"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <Fish className="w-8 h-8 text-orange-500" />
                    <h3 className="text-2xl font-[900] text-orange-600 uppercase tracking-wider">Salmon Giver</h3>
                  </div>
                  <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-[#F9A825]"/>
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-[900] text-[#FBC02D] uppercase mb-2 tracking-widest">Set Salmon Count</label>
                    <div className="flex gap-3">
                      <input 
                        type="number" 
                        value={customSalmonValue}
                        onChange={(e) => setCustomSalmonValue(e.target.value)}
                        placeholder="0"
                        className="flex-1 p-4 border-[3px] border-[#FFF9C4] rounded-xl font-[800] text-xl focus:outline-none focus:border-[#FBC02D] text-yellow-700 placeholder:opacity-30"
                      />
                      <button 
                        onClick={applyAdminSalmon}
                        className="px-6 bg-[#FBC02D] text-yellow-900 font-[900] rounded-xl shadow-[0_5px_0_#F9A825] active:translate-y-1 active:shadow-none transition-all uppercase text-sm"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                  <div className="pt-4 border-t-2 border-dashed border-yellow-100">
                    <p className="text-[11px] font-black text-yellow-600/40 uppercase text-center leading-relaxed">
                      Developer override active.<br/>Manage the hatchery responsibly.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* World Admin Modal */}
        <AnimatePresence>
          {showWorldAdmin && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#004D40]/80 backdrop-blur-xl z-[450] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                className="bg-white p-6 md:p-8 rounded-[32px] border-[8px] border-yellow-400 shadow-[0_15px_0_#FBC02D] w-full max-w-lg"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-2xl">
                      <Zap className="w-8 h-8 text-yellow-600"/>
                    </div>
                    <div>
                      <h3 className="text-2xl font-[950] text-[#006064] uppercase leading-none">World Admin</h3>
                      <p className="text-[10px] font-black text-yellow-600 uppercase opacity-60">Global Event Control</p>
                    </div>
                  </div>
                  <button onClick={() => setShowWorldAdmin(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-8 h-8 text-yellow-400"/>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#006064] uppercase ml-1">Multiplier (X)</label>
                      <input 
                        type="number" 
                        value={worldAdminForm.multiplier}
                        onChange={(e) => setWorldAdminForm({...worldAdminForm, multiplier: e.target.value})}
                        className="w-full p-3 bg-slate-50 border-4 border-slate-100 rounded-xl font-bold"
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#006064] uppercase ml-1">Duration (Min)</label>
                      <input 
                        type="number" 
                        value={worldAdminForm.duration}
                        onChange={(e) => setWorldAdminForm({...worldAdminForm, duration: e.target.value})}
                        className="w-full p-3 bg-slate-50 border-4 border-slate-100 rounded-xl font-bold"
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#006064] uppercase ml-1">Announcement</label>
                    <input 
                      type="text" 
                      value={worldAdminForm.announcement}
                      onChange={(e) => setWorldAdminForm({...worldAdminForm, announcement: e.target.value})}
                      className="w-full p-3 bg-slate-50 border-4 border-slate-100 rounded-xl font-bold"
                      placeholder="THE SALMON ARE RAINING!"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#006064] uppercase ml-1">Event Type</label>
                    <select 
                      value={worldAdminForm.type}
                      onChange={(e) => setWorldAdminForm({...worldAdminForm, type: e.target.value})}
                      className="w-full p-3 bg-slate-50 border-4 border-slate-100 rounded-xl font-bold appearance-none"
                    >
                      <option value="none">Standard Multiplier</option>
                      <option value="salmon_rain">Salmon Rain EFFECT</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button 
                      onClick={clearWorldEvent}
                      className="py-4 bg-slate-200 text-slate-700 font-black rounded-2xl uppercase hover:bg-slate-300 transition-all"
                    >
                      Stop All
                    </button>
                    <button 
                      onClick={triggerWorldEvent}
                      className="py-4 bg-yellow-400 text-yellow-900 font-black rounded-2xl uppercase shadow-[0_6px_0_#FBC02D] hover:-translate-y-1 hover:shadow-[0_8px_0_#FBC02D] active:translate-y-1 active:shadow-none transition-all"
                    >
                      Go Global
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar-orange::-webkit-scrollbar { width: 6px; }
        @media (min-width: 768px) {
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar-orange::-webkit-scrollbar { width: 8px; }
        }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #26C6DA; 
          border-radius: 10px; 
          border: 1px solid white;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb { 
          background: #FF8C69; 
          border-radius: 20px; 
        }
      `}</style>
    </div>
  );
}

function StatRow({ label, value, icon }) {
  return (
    <div className="flex justify-between items-center py-1.5 md:py-2 border-b-2 border-dashed border-[#B2EBF2] last:border-0">
      <div className="flex items-center gap-1.5 md:gap-2 text-[12px] md:text-[14px] font-[600] text-[#006064]">
        {icon}
        {label}
      </div>
      <div className="font-[800] text-[14px] md:text-[16px] text-[#FF7043]">{value}</div>
    </div>
  );
}

function SalmonRain() {
  const [salmons, setSalmons] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSalmons(prev => [
        ...prev.slice(-15),
        {
          id: Math.random(),
          left: Math.random() * 100,
          duration: 3 + Math.random() * 4,
          size: 30 + Math.random() * 40
        }
      ]);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1000] overflow-hidden">
      <AnimatePresence>
        {salmons.map(s => (
          <motion.div
            key={s.id}
            initial={{ y: -100, x: `${s.left}vw`, opacity: 0, rotate: 0 }}
            animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration: s.duration, ease: "linear" }}
            className="absolute"
            style={{ fontSize: s.size }}
          >
            🐟
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
