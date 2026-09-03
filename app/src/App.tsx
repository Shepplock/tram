import { useEffect } from 'react';
import { BottomBar } from './components/BottomBar/BottomBar';
import { PreviewScreen } from './components/PreviewScreen/PreviewScreen';
import { Tabs } from './components/Tabs/Tabs';
import { TonePanel } from './components/TonePanel/TonePanel';
import { StylePanel } from './components/StylePanel/StylePanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';
import { TitleBar } from './components/TitleBar/TitleBar';
import { useDeviceStore } from './state/deviceStore';
import { useSkinStore } from './state/skins';

function App() {
  const loadDevice = useDeviceStore((s) => s.load);
  const loadSkin = useSkinStore((s) => s.load);

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
    </div>
  );
}

export default App;
