import { useImportFiles } from '../../hooks/useImportFiles';
import { pickFiles } from '../../services/pickFiles';
import styles from './ImportBar.module.scss';

export function ImportBar() {
  const { addFiles, status } = useImportFiles();

  const openPicker = async () => {
    const files = await pickFiles();
    if (files && files.length) addFiles(files);
  };

  return (
    <>
      <div className={styles.bar}>
        <button type="button" className={styles.btn} onClick={openPicker}>
          Import
        </button>
      </div>
      {status && <div className={styles.status}>{status}</div>}
    </>
  );
}
