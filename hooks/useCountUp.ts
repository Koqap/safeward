import { useState, useEffect } from 'react';

export const useCountUp = (end: number, duration: number = 1000, decimals: number = 0) => {
  const [count, setCount] = useState(end);

  useEffect(() => {
    let startTime: number | null = null;
    const start = count;
    
    // If the change is very small, just jump to end
    if (Math.abs(end - start) < 0.1) {
      setCount(end);
      return;
    }

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function (easeOutQuart)
      const ease = 1 - Math.pow(1 - progress, 4);
      
      const current = start + (end - start) * ease;
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]); // Re-run when target value changes

  return Number(count.toFixed(decimals));
};
