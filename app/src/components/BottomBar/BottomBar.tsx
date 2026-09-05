import { useExport } from '../../hooks/useExport';
import { useImportFiles } from '../../hooks/useImportFiles';
import { pickFiles } from '../../services/pickFiles';
import { pickMimeType } from '../../services/videoRecording';
import { useBatchStore } from '../../state/batchStore';
import { useDeviceStore } from '../../state/deviceStore';
import { useUiStore } from '../../state/uiStore';
import styles from './BottomBar.module.scss';

const videoSupported = pickMimeType() !== null;

export function BottomBar() {
  const { addFiles, status } = useImportFiles();
  const setCameraOpen = useUiStore((s) => s.setCameraOpen);
  const setCropOpen = useUiStore((s) => s.setCropOpen);
  const hasCurrent = useBatchStore((s) => s.items.length > 0);
  const capture = useDeviceStore((s) => s.device.capture);
  const setDevice = useDeviceStore((s) => s.setDevice);
  const { doExport, canExport } = useExport();

  const openPicker = async () => {
    const files = await pickFiles();
    if (files && files.length) addFiles(files);
  };

  const choose = (mode: 'photo' | 'video') => {
    setDevice({ capture: mode });
    setCameraOpen(true);
  };

  return (
    <div className={`${styles.wrap} bottom-bar`}>
      {status && <div className={styles.status}>{status}</div>}
      <div className={styles.bar}>
        <div className={styles.mode}>
          <button type="button" aria-pressed={capture === 'photo'} onClick={() => choose('photo')}>Photo</button>
          <button
            type="button" aria-pressed={capture === 'video'} disabled={!videoSupported}
            title={videoSupported ? undefined : 'Video recording is not supported in this browser'}
            onClick={() => choose('video')}
          >
            Video
          </button>
        </div>
        <button type="button" className={styles.btn} onClick={openPicker}>Import</button>
        <button type="button" className={styles.btn} disabled={!hasCurrent} onClick={() => setCropOpen(true)}>
          Crop
        </button>
        <button type="button" className={`${styles.btn} ${styles.key}`} disabled={!canExport} onClick={doExport}>
          Export
        </button>
      </div>
    </div>
  );
}
