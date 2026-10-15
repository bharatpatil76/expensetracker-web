const API_URL = import.meta.env.VITE_API_URL

export type Category = { id: number; name: string }

export type Expense = {
  id: number
  title: string
  amount: number
  spentOn: string
  categoryId: number
  categoryName: string
  hasReceipt: boolean
  hasVoiceNote: boolean
}

export type ExpenseRequest = {
  title: string
  amount: number
  spentOn: string
  categoryId: number
}

export type CategoryTotal = { categoryName: string; total: number }

export type AttachmentKind = 'Receipt' | 'VoiceNote'

export type Attachment = {
  kind: AttachmentKind
  contentType: string
  sizeBytes: number
  uploadedAt: string
  url: string // short-lived SAS link, valid ~10 minutes
}

export function createApi(getToken: () => Promise<string | undefined>) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    // FormData sets its own multipart Content-Type (with boundary) - only add JSON for string bodies
    const jsonHeader: Record<string, string> = typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...jsonHeader, Authorization: `Bearer ${token}`, ...options.headers },
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return res.status === 204 || res.status === 201 ? (undefined as T) : res.json()
  }

  const upload = (expenseId: number, route: string, file: Blob, fileName: string) => {
    const form = new FormData()
    form.append('file', file, fileName)
    return request<void>(`/api/expenses/${expenseId}/attachments/${route}`, { method: 'POST', body: form })
  }

  return {
    getCategories: () => request<Category[]>('/api/categories'),
    getExpenses: () => request<Expense[]>('/api/expenses'),
    getSummary: () => request<CategoryTotal[]>('/api/expenses/summary'),
    createExpense: (body: ExpenseRequest) =>
      request<void>('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
    deleteExpense: (id: number) => request<void>(`/api/expenses/${id}`, { method: 'DELETE' }),

    getAttachments: (expenseId: number) => request<Attachment[]>(`/api/expenses/${expenseId}/attachments`),
    uploadReceipt: (expenseId: number, file: File) => upload(expenseId, 'receipt', file, file.name),
    uploadVoiceNote: (expenseId: number, audio: Blob, fileName: string) => upload(expenseId, 'voice-note', audio, fileName),
    deleteAttachment: (expenseId: number, kind: AttachmentKind) =>
      request<void>(`/api/expenses/${expenseId}/attachments/${kind}`, { method: 'DELETE' }),
  }
}

export type Api = ReturnType<typeof createApi>
