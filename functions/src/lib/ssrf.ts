import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'node:dns'
import { BlockList, isIP } from 'node:net'

/** Address ranges a user-supplied URL must never reach (SSRF protection). */
const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4')
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['64:ff9b::', 96],
  ['2001:db8::', 32],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6')
}

const BLOCKED_HOSTNAMES = [/^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i, /^metadata(\.|$)/i]

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return blocked.check(ip, 'ipv4')
  if (family === 6) {
    // IPv4-mapped IPv6 (::ffff:10.0.0.1) must be checked as IPv4.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
    if (mapped) return blocked.check(mapped[1], 'ipv4')
    return blocked.check(ip, 'ipv6')
  }
  return true
}

export class UnsafeUrlError extends Error {}

/** Parses and validates a user-supplied URL. Throws UnsafeUrlError when it is not allowed. */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new UnsafeUrlError('not a URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('protocol')
  if (url.username || url.password) throw new UnsafeUrlError('credentials')
  if (url.port && url.port !== '80' && url.port !== '443') throw new UnsafeUrlError('port')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (BLOCKED_HOSTNAMES.some((re) => re.test(host))) throw new UnsafeUrlError('hostname')
  if (isIP(host) && isPrivateAddress(host)) throw new UnsafeUrlError('private address')
  if (!isIP(host) && !host.includes('.')) throw new UnsafeUrlError('single-label hostname')
  return url
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void

/**
 * DNS lookup used for every outgoing connection: resolves, then refuses private addresses.
 * Checking at connect time (not just before fetching) also covers redirects and DNS rebinding.
 */
export function safeLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, [])
    const list = addresses as LookupAddress[]
    const bad = list.find((a) => isPrivateAddress(a.address))
    if (bad || list.length === 0) {
      const e: NodeJS.ErrnoException = new Error(`Blocked address for ${hostname}`)
      e.code = 'EBLOCKED'
      return callback(e, [])
    }
    if (options.all) return callback(null, list)
    callback(null, list[0].address, list[0].family)
  })
}
