import { useEffect, useState } from 'react'
import type { Api, Attachment, AttachmentKind, Expense } from './api'
import { VoiceRecorder } from './VoiceRecorder'

type Props = { expense: Expense; api: Api; onChanged: () => void }

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`

export function Attachments({ expense, api, onChanged }: Props) {
  const [items, setItems] = useState<Attachment[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    api.getAttachments(expense.id).then(setItems).catch((e) => setError((e as Error).message))

  useEffect(() => { load() }, [expense.id])

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label)
    setError('')
    try {
      await action()
      await load()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const onReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run('Uploading receipt…', () => api.uploadReceipt(expense.id, file))
  }

  const remove = (kind: AttachmentKind) => run('Deleting…', () => api.deleteAttachment(expense.id, kind))

  const receipt = items.find((a) => a.kind === 'Receipt')
  const voice = items.find((a) => a.kind === 'VoiceNote')

  return (
    <div className="attachments">
      <div className="attachment">
        <h4>Receipt</h4>
        {receipt ? (
          <>
            {receipt.contentType === 'application/pdf' ? (
              <a href={receipt.url} target="_blank" rel="noreferrer">Open PDF ({kb(receipt.sizeBytes)})</a>
            ) : (
              <a href={receipt.url} target="_blank" rel="noreferrer">
                <img src={receipt.url} alt={`Receipt for ${expense.title}`} />
              </a>
            )}
            <button onClick={() => remove('Receipt')}>Remove</button>
          </>
        ) : (
          <p className="muted">No receipt yet</p>
        )}
        <label className="upload">
          {receipt ? 'Replace' : '📷 Upload'} (JPG, PNG, WebP, PDF · max 5 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onReceipt} hidden />
        </label>
      </div>

      <div className="attachment">
        <h4>Voice note</h4>
        {voice ? (
          <>
            <audio controls src={voice.url} preload="metadata" />
            <button onClick={() => remove('VoiceNote')}>Remove</button>
          </>
        ) : (
          <p className="muted">No voice note yet</p>
        )}
        <VoiceRecorder
          onRecorded={(audio, fileName) => run('Uploading voice note…', () => api.uploadVoiceNote(expense.id, audio, fileName))}
        />
      </div>

      {busy && <p className="muted">{busy}</p>}
      {error && <p className="error">{error}</p>}
      <p className="muted small">Links are temporary (10 min SAS). Reopen to refresh.</p>
    </div>
  )
}
