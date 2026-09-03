import { SKINS, useSkinStore } from '../../state/skins';
import styles from './TitleBar.module.scss';

export function TitleBar() {
  const skin = useSkinStore((s) => s.skin);
  const setSkin = useSkinStore((s) => s.setSkin);

  return (
    <header className={styles.brand}>
      <b className={styles.title}>Print Pak</b>
      <div className={styles.skins}>
        {SKINS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.skinBtn} ${styles[s]}`}
            aria-pressed={skin === s}
            aria-label={`${s} skin`}
            onClick={() => setSkin(s)}
          />
        ))}
      </div>
      <span className={styles.sub}>Dither for thermal printers</span>
    </header>
  );
}
