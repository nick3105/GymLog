import { useLocation } from 'react-router'

// A short confirmation passed by the page that sent us here, e.g. "Workout saved."
export default function Notice() {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  if (!notice) return null
  return (
    <p
      role="status"
      className="border-accent/40 bg-accent/10 text-accent mb-4 rounded-xl border px-4 py-3 font-medium"
    >
      {notice}
    </p>
  )
}
