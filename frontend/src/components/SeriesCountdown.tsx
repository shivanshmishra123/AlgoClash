import React, { useState, useEffect } from 'react';

interface SeriesCountdownProps {
  startsAt?: string;
  className?: string;
}

export const SeriesCountdown: React.FC<SeriesCountdownProps> = ({ startsAt, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPast, setIsPast] = useState<boolean>(false);

  useEffect(() => {
    if (!startsAt) {
      setTimeLeft('TBD');
      return;
    }

    const calculateTime = () => {
      const target = new Date(startsAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft('READY FOR KICKOFF');
        return;
      }

      setIsPast(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startsAt]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded border ${
        isPast
          ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-300 animate-pulse'
          : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
      } ${className}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${isPast ? 'bg-cyan-400' : 'bg-amber-400 animate-ping'}`} />
      <span>{timeLeft}</span>
    </div>
  );
};

export default SeriesCountdown;
