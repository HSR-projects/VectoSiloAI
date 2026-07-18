'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SplineScene } from "@/components/ui/spline-scene";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { VoiceAgent } from "@/components/ui/voice-agent";

export default function VoiceAgentPage() {
  const [spline, setSpline] = useState<any>(null)

  const handleLoad = useCallback((splineApp: any) => {
    setSpline(splineApp)
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Back button */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm px-3 py-2 text-sm text-neutral-300 hover:bg-white/20 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      <Card className="w-full max-w-6xl h-[600px] bg-black/[0.96] relative overflow-hidden border-neutral-800">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
        />

        <div className="flex h-full">
          <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              Talk to Me
            </h1>
            <p className="mt-4 text-neutral-300 max-w-lg">
              A real-time voice conversation with a 3D presence. It greets you,
              listens, reacts physically, and talks back — no typing required.
            </p>
            <div className="mt-6 flex flex-col gap-2 text-xs text-neutral-500">
              <p>Uses <span className="text-neutral-400">faster-whisper</span> for speech recognition</p>
              <p>Uses <span className="text-neutral-400">Piper TTS</span> for natural voice synthesis</p>
              <p>Uses <span className="text-neutral-400">SearXNG</span> for web search</p>
            </div>
          </div>

          <div className="flex-1 relative">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
              onLoad={handleLoad}
            />
            <VoiceAgent spline={spline} />
          </div>
        </div>
      </Card>
    </div>
  )
}
