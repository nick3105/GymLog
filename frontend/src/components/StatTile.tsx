// One number on the profile: an uppercase label, the value big, and an optional line under it.
export default function StatTile({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string | null
}) {
  return (
    <div className="min-w-0">
      <p className="text-label text-xs font-normal tracking-widest uppercase">{label}</p>
      <p className="font-mono text-2xl font-light break-words">{value}</p>
      {detail && <p className="text-muted text-sm">{detail}</p>}
    </div>
  )
}
