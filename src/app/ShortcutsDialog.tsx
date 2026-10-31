import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Kbd } from '../components/Badge'
import { Dialog, DialogBody, DialogHeader } from '../components/Dialog'
import styles from './CommandPalette.module.css'
import { useUI } from './UIProvider'

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)

export function ShortcutsDialog() {
  const { t } = useTranslation()
  const { shortcutsOpen, setShortcutsOpen } = useUI()
  const close = () => setShortcutsOpen(false)
  const rows: Array<[string[], string]> = [
    [['N'], t('shortcuts.newJob')],
    [['/'], t('shortcuts.search')],
    [[isMac ? '⌘' : 'Ctrl', 'K'], t('shortcuts.palette')],
    [['G', 'T'], t('shortcuts.goToday')],
    [['G', 'B'], t('shortcuts.goBoard')],
    [['G', 'L'], t('shortcuts.goList')],
    [['G', 'V'], t('shortcuts.goCvs')],
    [['G', 'C'], t('shortcuts.goCalendar')],
    [['G', 'S'], t('shortcuts.goStats')],
    [['?'], t('shortcuts.help')],
    [['Esc'], t('shortcuts.close')],
  ]
  return (
    <Dialog open={shortcutsOpen} onClose={close} size="narrow" label={t('shortcuts.title')}>
      <DialogHeader title={t('shortcuts.title')} onClose={close} />
      <DialogBody>
        <dl className={styles.shortcuts}>
          {rows.map(([keys, label]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>
                {keys.map((k, i) => (
                  <Fragment key={k}>
                    {i > 0 && <span className={styles.then}>{keys[0] === 'G' ? t('shortcuts.then') : '+'}</span>}
                    <Kbd>{k}</Kbd>
                  </Fragment>
                ))}
              </dd>
            </Fragment>
          ))}
        </dl>
      </DialogBody>
    </Dialog>
  )
}
