// A front and back body figure; each muscle is shaded by how much its group was trained (REV-09).
// Only a picture: the list under it is what you tap.

const levelFill = ['fill-border', 'fill-accent/35', 'fill-accent/65', 'fill-accent']
const levelNames = ['None', 'Light', 'Medium', 'Most']

type Props = { levels: Record<string, number>; label: string }

export default function BodyMap({ levels, label }: Props) {
  // Groups missing from the report (e.g. while loading) are drawn as untrained.
  // The picture combines detailed muscles into broad regions; the list keeps them separate.
  const fill = (...groups: string[]) =>
    levelFill[Math.max(...groups.map((group) => levels[group] ?? 0))]

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 176" className="w-full max-w-64" role="img" aria-label={label}>
        {/* Front: chest, shoulders, biceps, forearms, core, quads, calves. */}
        <g>
          <circle cx="50" cy="13" r="10" className="fill-ink" />
          <rect x="45" y="22" width="10" height="8" className={fill('Neck')} />
          <ellipse cx="31" cy="37" rx="8" ry="7" className={fill('Shoulders')} />
          <ellipse cx="69" cy="37" rx="8" ry="7" className={fill('Shoulders')} />
          <rect x="36" y="31" width="13.5" height="17" rx="4" className={fill('Chest')} />
          <rect x="50.5" y="31" width="13.5" height="17" rx="4" className={fill('Chest')} />
          <ellipse cx="27" cy="55" rx="5" ry="10" className={fill('Biceps')} />
          <ellipse cx="73" cy="55" rx="5" ry="10" className={fill('Biceps')} />
          <ellipse cx="24" cy="77" rx="4.5" ry="11" className={fill('Forearms')} />
          <ellipse cx="76" cy="77" rx="4.5" ry="11" className={fill('Forearms')} />
          <circle cx="22" cy="92" r="4" className="fill-ink" />
          <circle cx="78" cy="92" r="4" className="fill-ink" />
          <rect
            x="38"
            y="50"
            width="24"
            height="33"
            rx="5"
            className={fill('Core', 'Abdominals')}
          />
          <rect x="37" y="84" width="26" height="10" rx="4" className="fill-ink" />
          <rect
            x="37"
            y="95"
            width="12"
            height="40"
            rx="6"
            className={fill('Quads', 'Quadriceps', 'Abductors', 'Adductors')}
          />
          <rect
            x="51"
            y="95"
            width="12"
            height="40"
            rx="6"
            className={fill('Quads', 'Quadriceps', 'Abductors', 'Adductors')}
          />
          <ellipse cx="43" cy="150" rx="5" ry="12" className={fill('Calves')} />
          <ellipse cx="57" cy="150" rx="5" ry="12" className={fill('Calves')} />
          <ellipse cx="42" cy="167" rx="5" ry="3" className="fill-ink" />
          <ellipse cx="58" cy="167" rx="5" ry="3" className="fill-ink" />
        </g>
        {/* Back: shoulders, back, triceps, forearms, hamstrings and glutes, calves. */}
        <g>
          <circle cx="150" cy="13" r="10" className="fill-ink" />
          <rect x="145" y="22" width="10" height="8" className={fill('Neck')} />
          <ellipse cx="131" cy="37" rx="8" ry="7" className={fill('Shoulders')} />
          <ellipse cx="169" cy="37" rx="8" ry="7" className={fill('Shoulders')} />
          <rect
            x="136"
            y="31"
            width="28"
            height="52"
            rx="6"
            className={fill('Back', 'Lats', 'Lower back', 'Middle back', 'Traps')}
          />
          <ellipse cx="127" cy="55" rx="5" ry="10" className={fill('Triceps')} />
          <ellipse cx="173" cy="55" rx="5" ry="10" className={fill('Triceps')} />
          <ellipse cx="124" cy="77" rx="4.5" ry="11" className={fill('Forearms')} />
          <ellipse cx="176" cy="77" rx="4.5" ry="11" className={fill('Forearms')} />
          <circle cx="122" cy="92" r="4" className="fill-ink" />
          <circle cx="178" cy="92" r="4" className="fill-ink" />
          <rect
            x="137"
            y="84"
            width="26"
            height="14"
            rx="6"
            className={fill('Hamstrings & glutes', 'Glutes')}
          />
          <rect
            x="137"
            y="99"
            width="12"
            height="36"
            rx="6"
            className={fill('Hamstrings & glutes', 'Hamstrings')}
          />
          <rect
            x="151"
            y="99"
            width="12"
            height="36"
            rx="6"
            className={fill('Hamstrings & glutes', 'Hamstrings')}
          />
          <ellipse cx="143" cy="150" rx="5" ry="12" className={fill('Calves')} />
          <ellipse cx="157" cy="150" rx="5" ry="12" className={fill('Calves')} />
          <ellipse cx="142" cy="167" rx="5" ry="3" className="fill-ink" />
          <ellipse cx="158" cy="167" rx="5" ry="3" className="fill-ink" />
        </g>
      </svg>
      <div className="text-label flex w-full max-w-64 justify-around text-xs font-normal tracking-widest uppercase">
        <span>Front</span>
        <span>Back</span>
      </div>
      <ul className="text-muted flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {levelNames.map((name, level) => (
          <li key={name} className="flex items-center gap-1.5">
            <svg viewBox="0 0 10 10" className="size-3" aria-hidden>
              <rect width="10" height="10" rx="2" className={levelFill[level]} />
            </svg>
            {name}
          </li>
        ))}
      </ul>
    </figure>
  )
}
