'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type AgentState = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error'

interface VoiceAgentProps {
  className?: string
  greeting?: string
  spline?: any
  enableSearch?: boolean
  onStateChange?: (state: AgentState) => void
}

export function VoiceAgent({
  className,
  greeting = "Hi! How are you?",
  spline,
  enableSearch = true,
  onStateChange,
}: VoiceAgentProps) {
  const [state, setState] = useState<AgentState>('idle')
  const [transcript, setTranscript] = useState('')
  const [started, setStarted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const enableSearchRef = useRef(enableSearch)
  const stateRef = useRef<AgentState>('idle')

  useEffect(() => {
    enableSearchRef.current = enableSearch
  }, [enableSearch])

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Drive Spline 3D character reactions
  useEffect(() => {
    if (!spline) return
    try {
      const root = spline.root
      if (!root) return

      // Find objects by name — adjust names to match your Spline scene
      const findObject = (name: string) =>
        root.findAllChildren?.((o: any) => o.name?.toLowerCase().includes(name.toLowerCase()))?.[0]

      // Try common Spline object names for facial animations
      const mouth = findObject('mouth') ?? findObject('Mouth') ?? findObject('lips')
      const eyes = findObject('eyes') ?? findObject('Eyes')
      const head = findObject('head') ?? findObject('Head')

      if (state === 'speaking') {
        // Mouth open during speech
        if (mouth?.trigger?.('MouthOpen')) mouth.trigger('MouthOpen')
        if (head?.trigger?.('Talk')) head.trigger('Talk')
      } else if (state === 'listening') {
        // Perked up / attentive
        if (eyes?.trigger?.('Blink')) eyes.trigger('Blink')
      } else if (state === 'thinking') {
        // Tilt / ponder
        if (head?.trigger?.('Think')) head.trigger('Think')
      } else if (state === 'idle') {
        // Idle breathing
        if (head?.trigger?.('Idle')) head.trigger('Idle')
      }
    } catch {
      // Spline API may differ — non-fatal
    }
  }, [state, spline])

  const updateState = useCallback((s: AgentState) => {
    setState(s)
    onStateChange?.(s)
  }, [onStateChange])

  // --- STT via faster-whisper (/api/stt) ---
  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    const res = await fetch('/api/stt', {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
    })
    if (!res.ok) throw new Error(`STT failed: ${res.status}`)
    const data = await res.json()
    return (data.text ?? '').trim()
  }, [])

  // --- TTS via Piper (/api/tts) ---
  const speakRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve())
  speakRef.current = (text: string) =>
    new Promise<void>(async (resolve) => {
      updateState('speaking')
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (!res.ok) {
          console.error('[VoiceAgent] TTS failed, falling back to browser voice')
          await browserSpeak(text)
          resolve()
          return
        }

        const audioBlob = await res.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        await audio.play()
      } catch (e) {
        console.error('[VoiceAgent] TTS error, fallback:', e)
        await browserSpeak(text)
        resolve()
      }
    })

  // Fallback browser TTS if Piper is unavailable
  function browserSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      try { window.speechSynthesis.cancel() } catch { /* */ }
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1
      u.pitch = 1
      // Pick best available voice
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v => /google.*us english|samantha|daniel|google.*uk english/i.test(v.name))
      if (preferred) u.voice = preferred
      const t = setTimeout(() => { try { window.speechSynthesis.cancel() } catch { /* */ }; resolve() }, 15000)
      u.onend = () => { clearTimeout(t); resolve() }
      u.onerror = () => { clearTimeout(t); resolve() }
      window.speechSynthesis.speak(u)
    })
  }

  // --- Recording via MediaRecorder ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        audioChunksRef.current = []

        if (blob.size < 500) {
          // Too small — likely silence, restart
          startRecording()
          return
        }

        updateState('thinking')
        try {
          const text = await transcribeAudio(blob)
          if (text.length > 0) {
            setTranscript(text)
            await handleUserTurnRef.current(text)
          } else {
            // Silence — restart
            startRecording()
          }
        } catch (e) {
          console.error('[VoiceAgent] Transcribe error:', e)
          startRecording()
        }
      }

      recorder.start(250) // collect data every 250ms
      updateState('listening')
    } catch (e) {
      console.error('[VoiceAgent] Microphone error:', e)
      setErrorMsg('Could not access microphone. Please allow mic access.')
      updateState('error')
    }
  }, [transcribeAudio, updateState])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // --- Turn handling ---
  const handleUserTurnRef = useRef<(userText: string) => Promise<void>>(() => Promise.resolve())

  handleUserTurnRef.current = async (userText: string) => {
    updateState('thinking')
    historyRef.current.push({ role: 'user', content: userText })

    try {
      const res = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyRef.current, enableSearch: enableSearchRef.current }),
      })
      const data = await res.json()
      const reply = data.reply as string
      historyRef.current.push({ role: 'assistant', content: reply })

      await speakRef.current(reply)
    } catch (e) {
      console.error('[VoiceAgent] Turn error:', e)
      await speakRef.current("Sorry, something went wrong. Let's try again.")
    }

    setTranscript('')
    // Restart listening
    startRecording()
  }

  // --- Session control ---
  const startSession = useCallback(async () => {
    setErrorMsg('')
    setStarted(true)
    updateState('greeting')
    historyRef.current.push({ role: 'assistant', content: greeting })

    await speakRef.current(greeting)
    startRecording()
  }, [greeting, speakRef, startRecording, updateState])

  const endSession = useCallback(() => {
    stopRecording()
    try { window.speechSynthesis.cancel() } catch { /* */ }
    updateState('idle')
    setStarted(false)
    setTranscript('')
    historyRef.current = []
  }, [stopRecording, updateState])

  useEffect(() => {
    return () => {
      stopRecording()
      try { window.speechSynthesis.cancel() } catch { /* */ }
    }
  }, [stopRecording])

  return (
    <div className={cn('absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3', className)}>
      {errorMsg && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-300 max-w-xs text-center">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {started && (
        <div className="text-xs text-neutral-300 min-h-[1rem] text-center px-4 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
          {state === 'greeting' && 'Greeting…'}
          {state === 'listening' && (transcript || 'Listening…')}
          {state === 'thinking' && 'Thinking…'}
          {state === 'speaking' && 'Speaking…'}
        </div>
      )}

      <button
        onClick={started ? endSession : startSession}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 shadow-lg',
          started
            ? 'bg-red-500/90 hover:bg-red-500 shadow-red-500/30'
            : 'bg-white/90 hover:bg-white shadow-white/20'
        )}
      >
        {state === 'thinking' || state === 'greeting' ? (
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        ) : started ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-black" />
        )}
      </button>
    </div>
  )
}
