async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function checkPasswordBreach(password: string): Promise<boolean> {
  const hash = (await sha1Hex(password)).toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  // no-store: the response itself isn't sensitive (it's the same for everyone with this prefix), but a disk-cached entry keeps proof this hash prefix was queried on this machine even after logout
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    cache: 'no-store',
  })
  if (!res.ok) return false

  const text = await res.text()
  return text.split('\n').some((line) => line.split(':')?.[0]?.trimEnd() === suffix)
}
