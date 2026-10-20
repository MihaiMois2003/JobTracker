import { Skeleton } from '../components/Feedback'
import styles from './ShellSkeleton.module.css'

/** Shown for the few ms while Firebase restores the session. */
export function ShellSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true">
      <div className={styles.side}>
        <Skeleton width={96} height={22} />
        <Skeleton height={36} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={28} />
        ))}
      </div>
      <div className={styles.main}>
        <Skeleton width={120} height={12} />
        <Skeleton width="min(320px, 70%)" height={34} />
        <div className={styles.rows}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={64} radius={10} />
          ))}
        </div>
      </div>
    </div>
  )
}
