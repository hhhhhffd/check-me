export function setMetaTag(selector, attribute, value) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    const attrName = selector.includes('property=') ? 'property' : 'name'
    const match = selector.match(/"(.*?)"/)
    if (match?.[1]) element.setAttribute(attrName, match[1])
    document.head.appendChild(element)
  }
  element.setAttribute(attribute, value)
}
