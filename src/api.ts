const API_URL = import.meta.env.VITE_API_URL

export type Category = { id: number; name: string }

export type Expense = {
  id: number
  title: string
  amount: number
  spentOn: string
  categoryId: number
  categoryName: string
}

export type ExpenseRequest = {
  title: string
  amount: number
  spentOn: string
  categoryId: number
}

export type CategoryTotal = { categoryName: string; total: number }

export function createApi(getToken: () => Promise<string | undefined>) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return res.status === 204 || res.status === 201 ? (undefined as T) : res.json()
  }

  return {
    getCategories: () => request<Category[]>('/api/categories'),
    getExpenses: () => request<Expense[]>('/api/expenses'),
    getSummary: () => request<CategoryTotal[]>('/api/expenses/summary'),
    createExpense: (body: ExpenseRequest) =>
      request<void>('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
    deleteExpense: (id: number) => request<void>(`/api/expenses/${id}`, { method: 'DELETE' }),
  }
}
