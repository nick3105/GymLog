type PersonalVolume = {
  volumeMuscle?: string | null
  volumeEligible?: boolean
  measurement?: 'duration' | 'repetitions'
}

export function personalVolumeDescription(exercise: PersonalVolume): string {
  if (exercise.volumeMuscle === null) return 'Personal exercise - excluded from volume (None)'
  if (exercise.measurement === 'duration')
    return 'Personal exercise - timed holds are excluded from weekly volume'
  if (exercise.volumeEligible && exercise.volumeMuscle) {
    const muscle = exercise.volumeMuscle.replaceAll('_', ' ')
    return `Personal exercise - each completed set counts as 1 for ${muscle}`
  }
  return 'Personal exercise - excluded from weekly volume estimates'
}
