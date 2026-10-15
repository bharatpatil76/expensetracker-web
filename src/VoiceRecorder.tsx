import { useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 60

// Chrome/Edge/Firefox record WebM/Opus, Safari records MP4/AAC
const pickMimeType = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

type Props = { onRecorded: (audio: Blob, fileName: string) => Promise<void> }

export function VoiceRecorder({ onRecorded }: Props) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())   // release the microphone
        window.clearInterval(timerRef.current)
        setRecording(false)
        const type = recorder.mimeType || 'audio/webm'
        const audio = new Blob(chunks, { type })
        await onRecorded(audio, type.startsWith('audio/mp4') ? 'voice-note.m4a' : 'voice-note.webm')
      }

      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) recorder.stop()
          return s + 1
        })
      }, 1000)
    } catch {
      setError('Microphone permission denied or not available.')
    }
  }

  return (
    <span className="recorder">
      {recording ? (
        <button type="button" className="rec" onClick={() => recorderRef.current?.stop()}>
          ⏹ Stop ({seconds}s)
        </button>
      ) : (
        <button type="button" onClick={start}>🎤 Record</button>
      )}
      {error && <span className="error">{error}</span>}
    </span>
  )
}
