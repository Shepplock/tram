import { useEffect } from 'react';
import { BootSplash } from './components/BootSplash/BootSplash';
import { BottomBar } from './components/BottomBar/BottomBar';
import { CameraOverlay } from './components/CameraOverlay/CameraOverlay';
import { CropOverlay } from './components/CropOverlay/CropOverlay';
import { ExportSheet } from './components/ExportSheet/ExportSheet';
import { PreviewScreen } from './components/PreviewScreen/PreviewScreen';
import { Tabs } from './components/Tabs/Tabs';
import { TonePanel } from './components/TonePanel/TonePanel';
import { StylePanel } from './components/StylePanel/StylePanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { TitleBar } from './components/TitleBar/TitleBar';
import { hashToState } from './services/urlState';
import { useBatchStore } from './state/batchStore';
import { useBootStore } from './state/bootStore';
import { useDeviceStore } from './state/deviceStore';
import { usePresetsStore } from './state/presetsStore';
import { useSkinStore } from './state/skins';
import { useToneStore } from './state/toneStore';
import { useUiStore } from './state/uiStore';

function App() {
  const loadDevice = useDeviceStore((s) => s.load);
  const setDevice = useDeviceStore((s) => s.setDevice);
  const loadSkin = useSkinStore((s) => s.load);
  const loadPresets = usePresetsStore((s) => s.load);
  const loadBoot = useBootStore((s) => s.load);
  const setTone = useToneStore((s) => s.setTone);
  const curItem = useBatchStore((s) => s.items[s.cur] ?? null);
  const cropOpen = useUiStore((s) => s.cropOpen);
  const setCropOpen = useUiStore((s) => s.setCropOpen);
  const cameraOpen = useUiStore((s) => s.cameraOpen);
  const setCameraOpen = useUiStore((s) => s.setCameraOpen);

  useEffect(() => {
    loadSkin();
    loadDevice();
    loadPresets();
    loadBoot();
    // A settings link puts values straight in the hash, so it takes effect
    // even before any photo is loaded (index.html:2450-2483).
    const hit = hashToState(location.hash);
    if (hit) {
      setTone(hit.tone);
      setDevice(hit.device);
    }
    // Runs once on mount — loaders/setters are stable store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-wrap">
      <TitleBar />
      <PreviewScreen />
      <Tabs
        tabs={[
          { id: 'tone', label: 'Tone', content: <TonePanel /> },
          { id: 'style', label: 'Style', content: <StylePanel /> },
          { id: 'export', label: 'Export', content: <ExportPanel /> },
          { id: 'settings', label: 'Settings', content: <SettingsPanel /> },
        ]}
      />
      <BottomBar />
      <ExportSheet />
      {/* Rendered outside PreviewScreen's `.pin` (a position:sticky stacking
          context) so their z-index is compared against BottomBar/ExportSheet
          directly, instead of being capped at .pin's own rank. */}
      {cropOpen && curItem && <CropOverlay item={curItem} onClose={() => setCropOpen(false)} />}
      {cameraOpen && <CameraOverlay onClose={() => setCameraOpen(false)} />}
      <BootSplash />
    </div>
  );
}

export default App;
