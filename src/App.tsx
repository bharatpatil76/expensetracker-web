import { useEffect, useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createApi, type Category, type CategoryTotal, type Expense } from './api'
import './App.css'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function App() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => createApi(() => getAccessTokenSilently()), [getAccessTokenSilently])

  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<CategoryTotal[]>([])
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [spentOn, setSpentOn] = useState(today())
  const [categoryId, setCategoryId] = useState(0)

  const load = async () => {
    try {
      const [cats, exps, sum] = await Promise.all([api.getCategories(), api.getExpenses(), api.getSummary()])
      setCategories(cats)
      setExpenses(exps)
      setSummary(sum)
      setCategoryId((current) => current || cats[0]?.id || 0)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => { if (isAuthenticated) load() }, [isAuthenticated])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createExpense({ title: title.trim(), amount: Number(amount), spentOn, categoryId })
      setTitle('')
      setAmount('')
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const remove = async (id: number) => {
    await api.deleteExpense(id)
    load()
  }

  const total = summary.reduce((sum, s) => sum + s.total, 0)

  if (isLoading) return <main><p>Loading...</p></main>

  if (!isAuthenticated)
    return (
      <main>
        <h1>ExpenseTracker</h1>
        <button onClick={() => loginWithRedirect()}>Log in</button>
      </main>
    )

  return (
    <main>
      <header>
        <h1>ExpenseTracker</h1>
        <p>
          {user?.email}{' '}
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
        </p>
      </header>

      <form onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What did you spend on?" required />
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" required />
        <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required />
        <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <section className="summary">
        <div className="tile total"><span>Total</span><b>{money.format(total)}</b></div>
        {summary.map((s) => (
          <div className="tile" key={s.categoryName}><span>{s.categoryName}</span><b>{money.format(s.total)}</b></div>
        ))}
      </section>

      <table>
        <thead>
          <tr><th>Date</th><th>Title</th><th>Category</th><th className="num">Amount</th><th></th></tr>
        </thead>
        <tbody>
          {expenses.map((x) => (
            <tr key={x.id}>
              <td>{x.spentOn}</td>
              <td>{x.title}</td>
              <td>{x.categoryName}</td>
              <td className="num">{money.format(x.amount)}</td>
              <td><button onClick={() => remove(x.id)}>Delete</button></td>
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={5} className="empty">No expenses yet</td></tr>}
        </tbody>
      </table>
    </main>
  )
}

export default App
