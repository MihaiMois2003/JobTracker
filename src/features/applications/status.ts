import {
  Bookmark,
  CircleX,
  FilePen,
  Ghost,
  Handshake,
  PhoneCall,
  Send,
  Undo2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Status } from './types'

export const STATUS_ICON: Record<Status, LucideIcon> = {
  saved: Bookmark,
  applied: Send,
  screening: PhoneCall,
  interview: Users,
  offer: FilePen,
  accepted: Handshake,
  rejected: CircleX,
  ghosted: Ghost,
  withdrawn: Undo2,
}

/** CSS custom properties for a status; consumed as `var(--st-x)` etc. */
export function statusVars(status: Status) {
  return {
    solid: `var(--st-${status})`,
    fg: `var(--st-${status}-fg)`,
    bg: `var(--st-${status}-bg)`,
  }
}
