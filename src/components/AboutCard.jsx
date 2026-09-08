import TerminalCard, { TerminalPrompt } from './TerminalCard'
import { getNowEntries } from '../utils/cvPresentation'

function getMetadata(profile, languages) {
  const location = [profile.location?.city, profile.location?.country].filter(Boolean).join(', ')
  const formats = profile.workPreference?.formats?.filter(Boolean).join(' · ')
  const languageNames = languages?.map((language) => language.name).filter(Boolean).join(' · ')

  return [
    ['LOCATION', location],
    ['TIMEZONE', profile.location?.timezone],
    ['LANGUAGES', languageNames],
    ['FORMAT', formats],
  ].filter(([, value]) => value)
}

export default function AboutCard({ profile, about, languages, cv }) {
  const metadata = getMetadata(profile, languages)
  const nowEntries = getNowEntries(cv)

  return (
    <TerminalCard command="~/cv $ cat ./about.md" className="md:col-span-1 lg:col-span-3">
      {about && <p className="mt-5 text-sm leading-6 text-[#c7c1d4]">{about}</p>}

      {metadata.length > 0 && (
        <dl className="about-meta">
          {metadata.map(([label, value]) => (
            <div key={label} className="about-meta-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {nowEntries.length > 0 && (
        <div className="about-now">
          <TerminalPrompt>~/cv $ status</TerminalPrompt>
          <dl className="now-list">
            {nowEntries.map((entry) => (
              <div key={entry.label} className="now-row">
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </TerminalCard>
  )
}
