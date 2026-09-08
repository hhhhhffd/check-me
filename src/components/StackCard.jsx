import TerminalCard from './TerminalCard'

export default function StackCard({ groups }) {
  if (!groups?.length) return null

  return (
    <TerminalCard command="~/cv $ env --stack" className="md:col-span-1 lg:col-span-3">
      <div className="mt-5 space-y-3">
        {groups.slice(0, 3).map((group) => (
          <div key={group.name}>
            <p className="text-xs font-medium text-[#b8b1ca]">{group.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#8f88a8]">{group.skills?.slice(0, 4).join(' · ')}</p>
          </div>
        ))}
      </div>
    </TerminalCard>
  )
}
