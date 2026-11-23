import { textButton } from '../ui'

export default function ScheduleProblem({
  message,
  retry,
}: {
  message: string
  retry?: () => void
}) {
  if (!message) return null
  return (
    <div className="mb-3">
      <p role="alert" className="text-danger">
        {message}
      </p>
      {retry && (
        <button type="button" onClick={retry} className={textButton}>
          Reload schedule
        </button>
      )}
    </div>
  )
}
