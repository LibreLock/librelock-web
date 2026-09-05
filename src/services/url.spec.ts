import { describe, expect, it } from 'vitest'

import { displayUrl, externalHref } from './url'

describe('externalHref', () => {
  it('adds https to a bare host', () => {
    expect(externalHref('example.com')).toBe('https://example.com/')
    expect(externalHref('  example.com/path  ')).toBe('https://example.com/path')
  })

  it('keeps a URL that already carries an allowed scheme', () => {
    expect(externalHref('https://example.com/x')).toBe('https://example.com/x')
    expect(externalHref('http://192.168.1.1')).toBe('http://192.168.1.1/')
    expect(externalHref('mailto:help@example.com')).toBe('mailto:help@example.com')
  })

  it('does not double up the scheme on an already-qualified URL', () => {
    expect(externalHref('https://example.com')).not.toContain('https://https://')
  })

  it('rejects script-bearing schemes', () => {
    expect(externalHref('javascript:alert(1)')).toBe('')
    expect(externalHref('JavaScript:alert(1)')).toBe('')
    expect(externalHref('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(externalHref('vbscript:msgbox(1)')).toBe('')
  })

  it('rejects other schemes rather than assuming they are safe', () => {
    expect(externalHref('file:///etc/passwd')).toBe('')
    expect(externalHref('ftp://example.com')).toBe('')
  })

  it('returns empty for missing or unparseable values', () => {
    expect(externalHref('')).toBe('')
    expect(externalHref('   ')).toBe('')
    expect(externalHref(null)).toBe('')
    expect(externalHref(undefined)).toBe('')
    expect(externalHref('http://')).toBe('')
  })
})

describe('displayUrl', () => {
  it('drops the scheme and www', () => {
    expect(displayUrl('https://www.github.com')).toBe('github.com')
    expect(displayUrl('http://example.com/path')).toBe('example.com/path')
    expect(displayUrl('www.example.com')).toBe('example.com')
  })

  it('only strips a leading www label, not a lookalike host', () => {
    expect(displayUrl('https://wwwexample.com')).toBe('wwwexample.com')
    expect(displayUrl('https://example.com/www.foo')).toBe('example.com/www.foo')
  })

  it('drops a bare trailing slash', () => {
    expect(displayUrl('https://example.com/')).toBe('example.com')
    expect(displayUrl('example.com/path/')).toBe('example.com/path')
  })

  it('leaves a scheme-less value alone apart from trimming', () => {
    expect(displayUrl('  github.com  ')).toBe('github.com')
    expect(displayUrl('mailto:help@example.com')).toBe('mailto:help@example.com')
  })

  it('keeps query strings and ports', () => {
    expect(displayUrl('https://example.com:8443/login?next=1')).toBe(
      'example.com:8443/login?next=1',
    )
  })

  it('returns empty for missing values', () => {
    expect(displayUrl('')).toBe('')
    expect(displayUrl(null)).toBe('')
    expect(displayUrl(undefined)).toBe('')
  })
})
