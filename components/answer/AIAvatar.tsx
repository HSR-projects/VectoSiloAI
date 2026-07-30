"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AIAvatar() {
  const [clicks, setClicks] = useState(0);
  
  // Reset clicks if no clicks for 5 seconds
  useEffect(() => {
    if (clicks === 0) return;
    const t = setTimeout(() => setClicks(0), 5000);
    return () => clearTimeout(t);
  }, [clicks]);

  const isAngry = clicks >= 5;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div 
          onClick={() => setClicks(c => c + 1)}
          className={`relative flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 ring-white/10 dark:ring-black/10 cursor-pointer transition-colors duration-300 ${isAngry ? 'bg-gradient-to-b from-red-500 to-red-700' : 'bg-gradient-to-b from-blue-400 to-blue-600'}`}
          animate={isAngry ? { x: [-2, 2, -2, 2, 0] } : {}}
          transition={isAngry ? { duration: 0.4, repeat: Infinity, repeatType: "mirror" } : {}}
        >
          {/* Subtle background glow */}
          <div className={`absolute inset-0 rounded-full opacity-20 blur-[2px] transition-colors duration-300 ${isAngry ? 'bg-red-500' : 'bg-blue-500'}`} />
          
          {/* Robot Eyes */}
          <div className="relative z-10 flex gap-[3px] mt-0.5">
            <div className="relative flex flex-col items-center">
              {isAngry && (
                <motion.div 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0.5 }}
                  className="absolute -top-0.5 -left-[1px] h-[2px] w-[8px] bg-white rounded-full z-20 rotate-[35deg]"
                />
              )}
              <motion.div 
                className="h-2 w-1.5 rounded-full bg-white"
                animate={{ 
                  scaleY: isAngry ? [1, 0.8, 1] : [1, 0.2, 1], 
                  opacity: [1, 0.8, 1],
                }}
                transition={{ 
                  duration: isAngry ? 2 : 4, 
                  repeat: Infinity, 
                  repeatType: "loop", 
                  ease: "easeInOut", 
                  times: [0, 0.02, 0.04] // Quick blink
                }}
              />
            </div>
            <div className="relative flex flex-col items-center">
              {isAngry && (
                <motion.div 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0.5 }}
                  className="absolute -top-0.5 -right-[1px] h-[2px] w-[8px] bg-white rounded-full z-20 -rotate-[35deg]"
                />
              )}
              <motion.div 
                className="h-2 w-1.5 rounded-full bg-white"
                animate={{ 
                  scaleY: isAngry ? [1, 0.8, 1] : [1, 0.2, 1], 
                  opacity: [1, 0.8, 1],
                }}
                transition={{ 
                  duration: isAngry ? 2 : 4, 
                  repeat: Infinity, 
                  repeatType: "loop", 
                  ease: "easeInOut", 
                  times: [0, 0.02, 0.04]
                }}
              />
            </div>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="px-3 py-1.5 rounded-lg border-zinc-800 bg-zinc-900 text-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 shadow-xl">
        <p className="text-[13px] font-medium tracking-wide">
          {isAngry ? "Stop poking me!" : "Hi, I'm Incogni. How can I help you today?"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
