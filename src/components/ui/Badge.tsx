interface BadgeProps {
  label: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple'
}

const colorClasses = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  gray: 'bg-slate-100 text-slate-800 border-slate-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200'
}

export function Badge({ label, color }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color]}`}>
      {label}
    </span>
  )
}