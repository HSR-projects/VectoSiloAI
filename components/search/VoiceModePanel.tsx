'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicOff, Loader2, PhoneOff } from 'lucide-react'
import { SplineScene } from '@/components/ui/spline-scene'
import { cn } from '@/lib/utils'

type AgentState = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error'
type BubbleType = 'say' | 'think' | 'user' | 'error'

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
}

interface VoiceModePanelProps {
  onClose: (messages: ChatMessage[]) => void
  greeting?: string
  enableSearch?: boolean
  className?: string
}

export function VoiceModePanel({
  onClose,
  greeting = "Hi! How are you?",
  enableSearch = true,
  className,
}: VoiceModePanelProps) {
  const [state, setState] = useState<AgentState>('greeting')
  const [bubble, setBubble] = useState<{ text: string; type: BubbleType } | null>(null)
  const [spline, setSpline] = useState<any>(null)
  const [statusText, setStatusText] = useState('Starting...')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const historyRef = useRef<ChatMessage[]>([])
  const enableSearchRef = useRef(enableSearch)
  const activeRef = useRef(true)
  const processingRef = useRef(false) // Prevent concurrent processing

  useEffect(() => { enableSearchRef.current = enableSearch }, [enableSearch])

  const updateState = (s: AgentState, text?: string) => {
    if (!activeRef.current) return
    setState(s)
    if (text) setStatusText(text)
  }

  // --- Spline 3D reactions ---
  useEffect(() => {
    if (!spline) return
    try {
      const root = spline.root
      if (!root) return
      const find = (name: string) =>
        root.findAllChildren?.((o: any) => o.name?.toLowerCase().includes(name.toLowerCase()))?.[0]
      const head = find('head') ?? find('Head') ?? find('character')
      if (!head) return
      if (state === 'speaking') head.trigger?.('Talk')
      else if (state === 'listening') head.trigger?.('Blink')
      else if (state === 'thinking') head.trigger?.('Think')
      else head.trigger?.('Idle')
    } catch {}
  }, [state, spline])

  // --- TTS ---
  const speak = async (text: string): Promise<void> => {
    updateState('speaking', 'Speaking...')
    setBubble({ text, type: 'say' })

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const audioBlob = await res.blob()
        if (audioBlob.size > 1000) {
          const audioUrl = URL.createObjectURL(audioBlob)
          await new Promise<void>((resolve) => {
            const audio = new Audio(audioUrl)
            audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve() }
            audio.onerror = () => { URL.revokeObjectURL(audioUrl); resolve() }
            audio.play().catch(() => { URL.revokeObjectURL(audioUrl); resolve() })
          })
          return
        }
      }
    } catch {}

    // Fallback: browser TTS
    await new Promise<void>((resolve) => {
      try { window.speechSynthesis.cancel() } catch {}
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.0
      u.pitch = 1.0
      const t = setTimeout(() => { try { window.speechSynthesis.cancel() } catch {}; resolve() }, 12000)
      u.onend = () => { clearTimeout(t); resolve() }
      u.onerror = () => { clearTimeout(t); resolve() }
      window.speechSynthesis.speak(u)
    })
  }

  // --- STT ---
  const transcribeAudio = async (blob: Blob): Promise<string> => {
    try {
      const res = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        body: blob,
      })
      if (res.ok) {
        const data = await res.json()
        return (data.text ?? '').trim()
      }
    } catch {}
    return ''
  }

  // --- LLM reply ---
  const getReply = async (userText: string): Promise<string> => {
    historyRef.current.push({ role: 'user', content: userText })

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const res = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyRef.current, enableSearch: enableSearchRef.current }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const reply = (data.reply as string) || "I'm not sure what to say."
      historyRef.current.push({ role: 'assistant', content: reply })
      return reply
    } catch (e) {
      console.error('[VoiceMode] LLM error:', e)
      return "Sorry, I had trouble thinking. Could you say that again?"
    }
  }

  // --- Process recorded audio ---
  const processAudio = async (blob: Blob) => {
    if (!activeRef.current || processingRef.current) return
    processingRef.current = true

    try {
      updateState('thinking', 'Transcribing...')

      const text = await transcribeAudio(blob)
      if (!text || !activeRef.current) {
        processingRef.current = false
        startMic()
        return
      }

      // Show what user said
      console.log(`[VoiceMode] Heard: "${text}"`)
      setBubble({ text, type: 'user' })
      await new Promise(r => setTimeout(r, 800))

      updateState('thinking', 'Thinking...')
      setBubble({ text: 'Thinking...', type: 'think' })

      const reply = await getReply(text)
      if (!activeRef.current) return

      console.log(`[VoiceMode] Reply: "${reply.slice(0, 100)}"`)
      await speak(reply)

      if (!activeRef.current) return
      setBubble(null)
      processingRef.current = false
      startMic()
    } catch (e) {
      console.error('[VoiceMode] Process error:', e)
      processingRef.current = false
      if (activeRef.current) {
        setBubble({ text: 'Something went wrong. Click mic to retry.', type: 'error' })
        updateState('listening', 'Tap mic to retry')
      }
    }
  }

  // --- Recording ---
  const startMic = () => {
    if (!activeRef.current || processingRef.current) return

    // Clean up previous
    try { mediaRecorderRef.current?.stop() } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop())

    navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
    }).then(stream => {
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return }

      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        audioChunksRef.current = []
        processAudio(blob)
      }

      recorder.start()
      updateState('listening', 'Listening — speak now...')
      setBubble({ text: 'Listening...', type: 'think' })

      // Auto-stop after 6 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 6000)
    }).catch(e => {
      console.error('[VoiceMode] Mic error:', e)
      updateState('error', 'Mic access denied')
      setBubble({ text: 'Please allow microphone access.', type: 'error' })
    })
  }

  const stopMic = () => {
    activeRef.current = false
    try { mediaRecorderRef.current?.stop() } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  // --- Start session ---
  useEffect(() => {
    activeRef.current = true
    processingRef.current = false

    const run = async () => {
      historyRef.current.push({ role: 'assistant', content: greeting })
      await speak(greeting)
      if (activeRef.current) {
        setBubble(null)
        startMic()
      }
    }
    run()

    return () => {
      activeRef.current = false
      processingRef.current = false
      stopMic()
      try { window.speechSynthesis.cancel() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const endSession = () => {
    stopMic()
    processingRef.current = false
    try { window.speechSynthesis.cancel() } catch {}
    setBubble(null)
    updateState('idle', 'Ended')
    onClose(historyRef.current)
  }

  // Manual mic restart (for error recovery)
  const toggleMic = () => {
    if (processingRef.current) return
    if (state === 'listening') {
      try { mediaRecorderRef.current?.stop() } catch {}
    } else {
      startMic()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 20, height: 0 }}
      className={cn('w-full max-w-2xl mx-auto mb-4 overflow-hidden', className)}
    >
      <div className="relative rounded-2xl border border-vectosilo-border bg-vectosilo-surface overflow-hidden">
        {/* 3D Robot + Bubbles */}
        <div className="relative h-[320px] bg-gradient-to-b from-vectosilo-surface-2 to-vectosilo-surface">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
            onLoad={(s) => setSpline(s)}
          />

          <AnimatePresence mode="wait">
            {bubble && (
              <motion.div
                key={bubble.text.slice(0, 30)}
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-xl',
                  bubble.type === 'error'
                    ? 'bg-red-500/90 text-white'
                    : bubble.type === 'user'
                      ? 'bg-vectosilo-surface-2 text-vectosilo-text border border-vectosilo-border ml-auto'
                      : bubble.type === 'think'
                        ? 'bg-white/10 text-neutral-200 border border-white/20 backdrop-blur-sm'
                        : 'bg-vectosilo-accent text-white'
                )}
              >
                {bubble.type === 'user' && <span className="text-[10px] text-vectosilo-muted block mb-1">You said:</span>}
                <p className="leading-relaxed">{bubble.text}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-vectosilo-border">
          <div className="flex items-center gap-2">
            <span className={cn(
              'h-2 w-2 rounded-full',
              state === 'listening' ? 'bg-green-400 animate-pulse' :
              state === 'speaking' ? 'bg-vectosilo-accent animate-pulse' :
              state === 'thinking' ? 'bg-yellow-400 animate-pulse' :
              state === 'error' ? 'bg-red-400' :
              'bg-neutral-500'
            )} />
            <span className="text-xs text-vectosilo-muted">{statusText}</span>
          </div>

          <div className="flex items-center gap-2">
            {(state === 'listening' || state === 'error') && (
              <button
                onClick={toggleMic}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  state === 'listening'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-vectosilo-accent text-white hover:bg-vectosilo-accent-soft'
                )}
              >
                <MicOff className="h-5 w-5" />
              </button>
            )}
            {(state === 'thinking' || state === 'greeting' || state === 'speaking') && (
              <div className="flex h-10 w-10 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-vectosilo-accent" />
              </div>
            )}

            <button
              onClick={endSession}
              className="flex items-center gap-1.5 rounded-lg border border-vectosilo-border bg-vectosilo-surface-2 px-3 py-2 text-xs text-vectosilo-muted hover:bg-vectosilo-border hover:text-vectosilo-text transition-colors"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
