function stripJsoncComments(source) {
  let result = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    const nextCharacter = source[index + 1]

    if (inString) {
      result += character
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      result += character
      continue
    }

    if (character === '/' && nextCharacter === '/') {
      index += 1
      while (index + 1 < source.length && source[index + 1] !== '\n') {
        index += 1
      }
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      index += 1
      while (index + 1 < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1
      }
      index += 1
      continue
    }

    result += character
  }

  return result
}

function removeTrailingCommas(source) {
  let result = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inString) {
      result += character
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      result += character
      continue
    }

    if (character === ',') {
      let lookAhead = index + 1
      while (/\s/.test(source[lookAhead])) {
        lookAhead += 1
      }
      if (source[lookAhead] === '}' || source[lookAhead] === ']') {
        continue
      }
    }

    result += character
  }

  return result
}

export function parseJsonc(source) {
  if (!source.trim()) {
    throw new Error('Файл пустой. Добавьте в него объект CV в public/cv.jsonc.')
  }

  return JSON.parse(removeTrailingCommas(stripJsoncComments(source)))
}

export function validateCvData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Корень файла должен быть объектом { ... }.')
  }

  if (!data.profile || typeof data.profile !== 'object') {
    throw new Error('Не найден обязательный объект profile.')
  }

  if (!data.profile.name || !data.profile.title) {
    throw new Error('Заполните profile.name и profile.title.')
  }

  const collectionNames = ['experience', 'projects', 'achievements', 'skillGroups', 'education', 'languages']
  for (const collectionName of collectionNames) {
    if (data[collectionName] !== undefined && !Array.isArray(data[collectionName])) {
      throw new Error(`${collectionName} должен быть массивом.`)
    }
  }

  return {
    ...data,
    experience: data.experience || [],
    projects: data.projects || [],
    achievements: data.achievements || [],
    skillGroups: data.skillGroups || [],
    education: data.education || [],
    languages: data.languages || [],
  }
}

export async function loadCvData() {
  const baseUrl = import.meta.env?.BASE_URL || '/'
  const response = await fetch(`${baseUrl}cv.jsonc`, { cache: 'no-store' })

  if (response.status === 404) {
    return { status: 'missing' }
  }

  if (!response.ok) {
    throw new Error(`Не удалось загрузить cv.jsonc: HTTP ${response.status}.`)
  }

  const source = await response.text()
  return { status: 'ready', data: validateCvData(parseJsonc(source)) }
}
