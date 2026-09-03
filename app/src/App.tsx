import { useEffect } from 'react';
import { BottomBar } from './components/BottomBar/BottomBar';
import { CameraOverlay } from './components/CameraOverlay/CameraOverlay';
import { CropOverlay } from './components/CropOverlay/CropOverlay';
import { ExportSheet } from './components/ExportSheet/ExportSheet';
import { PreviewScreen } from './components/PreviewScreen/PreviewScreen';
import { Tabs } from './components/Tabs/Tabs';
import { TonePanel } from './components/TonePanel/TonePanel';
import { StylePanel } from './components/StylePanel/StylePanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';
import { TitleBar } from './components/TitleBar/TitleBar';
import { useBatchStore } from './state/batchStore';
import { useDeviceStore } from './state/deviceStore';
import { useSkinStore } from './state/skins';
import { useUiStore } from './state/uiStore';

function App() {
  const loadDevice = useDeviceStore((s) => s.load);
  const loadSkin = useSkinStore((s) => s.load);
  const curItem = useBatchStore((s) => s.items[s.cur] ?? null);
  const cropOpen = useUiStore((s) => s.cropOpen);
  const setCropOpen = useUiStore((s) => s.setCropOpen);
  const cameraOpen = useUiStore((s) => s.cameraOpen);
  const setCameraOpen = useUiStore((s) => s.setCameraOpen);

  useEffect(() => {
    loadSkin();
    loadDevice();
  }, [loadDevice, loadSkin]);

  return (
    <div className="app-wrap">
      <TitleBar />
      <PreviewScreen />
      <Tabs
        tabs={[
          { id: 'tone', label: 'Tone', content: <TonePanel /> },
          { id: 'style', label: 'Style', content: <StylePanel /> },
          { id: 'export', label: 'Export', content: <ExportPanel /> },
        ]}
      />
      <BottomBar />
      <ExportSheet />
      {/* Rendered outside PreviewScreen's `.pin` (a position:sticky stacking
          context) so their z-index is compared against BottomBar/ExportSheet
          directly, instead of being capped at .pin's own rank. */}
      {cropOpen && curItem && <CropOverlay item={curItem} onClose={() => setCropOpen(false)} />}
      {cameraOpen && <CameraOverlay onClose={() => setCameraOpen(false)} />}
    </div>
  );
}

export default App;
