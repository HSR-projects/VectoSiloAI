"use client";

import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AIAvatar() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-blue-400 to-blue-600 shadow-sm ring-1 ring-white/10 dark:ring-black/10 cursor-pointer">
          {/* Subtle background glow */}
          <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 blur-[2px]" />
          
          {/* Robot Eyes */}
          <div className="relative z-10 flex gap-[3px] mt-0.5">
            <motion.div 
              className="h-2 w-1.5 rounded-full bg-white"
              animate={{ scaleY: [1, 0.2, 1], opacity: [1, 0.8, 1] }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "loop", 
                ease: "easeInOut", 
                times: [0, 0.02, 0.04] // Quick blink
              }}
            />
            <motion.div 
              className="h-2 w-1.5 rounded-full bg-white"
              animate={{ scaleY: [1, 0.2, 1], opacity: [1, 0.8, 1] }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "loop", 
                ease: "easeInOut", 
                times: [0, 0.02, 0.04]
              }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="px-3 py-1.5 rounded-lg border-zinc-800 bg-zinc-900 text-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 shadow-xl">
        <p className="text-[13px] font-medium tracking-wide">Hi, I&apos;m Incogni. How can I help you today?</p>
      </TooltipContent>
    </Tooltip>
  );
}
