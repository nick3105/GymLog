import { Link } from 'react-router'

import CompetitionPlanner from '../components/CompetitionPlanner'
import { secondaryButton } from '../ui'

export default function CompetitionPrep() {
  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Competition prep</h1>
      <CompetitionPlanner />
      <Link to="/schedule" className={secondaryButton + ' mt-4 w-full'}>
        Back to schedule
      </Link>
    </>
  )
}
