import { SKINS, useSkinStore } from '../../state/skins';
import { usePrinterStore } from '../../state/printerStore';
import styles from './TitleBar.module.scss';

function PrinterStatus() {
  const status = usePrinterStore((s) => s.status);
  const name = usePrinterStore((s) => s.name);
  const connect = usePrinterStore((s) => s.connect);
  const disconnect = usePrinterStore((s) => s.disconnect);

  if (status === 'unsupported') return <span className={styles.sub}>Dither for thermal printers</span>;

  const on = status === 'connected' || status === 'printing';
  const busy = status === 'connecting' || status === 'printing';
  const label = status === 'connecting' ? 'Connecting…' : status === 'printing' ? 'Printing…' : on ? name : 'No printer';

  return (
    <button
      type="button"
      className={styles.printer}
      disabled={busy}
      title={on ? 'Disconnect printer' : 'Connect printer'}
      onClick={on ? disconnect : connect}
    >
      <i className={`${styles.led} ${busy ? styles.busy : on ? styles.on : ''}`} />
      {label}
    </button>
  );
}

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
      <PrinterStatus />
    </header>
  );
}
