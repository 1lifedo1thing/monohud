import * as React from 'react';
import { MonohudProvider, Slider, Starfield, Switch, Tabs, type Alert, type Theme } from '@monohud/react';
import type { MotionLevel } from '@monohud/fx';
import { Bridge } from './Bridge';
import { Catalog } from './Catalog';

export type Scene = { warp: number; body: number; flash: number; alert: Alert; surge: number };

export type Settings = {
  theme: Theme;
  motion: MotionLevel;
  setTheme: (theme: Theme) => void;
  setMotion: (motion: MotionLevel) => void;
  setScene: (change: Partial<Scene> | ((scene: Scene) => Partial<Scene>)) => void;
};

export function App() {
  const [theme, setTheme] = React.useState<Theme>('mono');
  const [motion, setMotion] = React.useState<MotionLevel>('full');
  const [sound, setSound] = React.useState(false);
  const [distortion, setDistortion] = React.useState(15);
  const [scene, setSceneState] = React.useState<Scene>({ warp: 0, body: 0.8, flash: 0, alert: 'none', surge: 0 });
  const setScene = React.useCallback<Settings['setScene']>((change) => {
    setSceneState((current) => ({ ...current, ...(typeof change === 'function' ? change(current) : change) }));
  }, []);
  const settings = React.useMemo(() => ({ theme, motion, setTheme, setMotion, setScene }), [theme, motion, setScene]);

  // Damage and jumps push the signal past the player's own setting, then it settles back.
  React.useEffect(() => {
    if (scene.surge <= 0) return undefined;
    const timer = setTimeout(() => setScene((current) => ({ surge: current.surge < 0.02 ? 0 : current.surge * 0.8 })), 70);
    return () => clearTimeout(timer);
  }, [scene.surge, setScene]);

  return (
    <MonohudProvider
      theme={theme}
      motion={motion}
      sound={sound}
      alert={scene.alert}
      distortion={Math.round(Math.min(1, distortion / 100 + scene.surge) * 100) / 100}
      className="demo"
    >
      <Starfield warp={scene.warp} body={scene.body} flash={scene.flash} />
      <Tabs.Root defaultValue="bridge" className="demo__shell">
        <header className="demo__bar">
          <Tabs.List aria-label="Page">
            <Tabs.Tab value="bridge">Bridge</Tabs.Tab>
            <Tabs.Tab value="catalog">Components</Tabs.Tab>
          </Tabs.List>
          <div className="demo__controls">
            <Slider
              className="demo__distortion"
              label="Distortion"
              thumbLabel="Distortion"
              hideScale
              min={0}
              max={100}
              value={distortion}
              onValueChange={(value) => setDistortion(value as number)}
            />
            <Switch checked={sound} onCheckedChange={setSound}>
              Sound
            </Switch>
          </div>
        </header>
        <Tabs.Panel value="bridge" className="demo__page demo__page--bridge">
          <Bridge settings={settings} />
        </Tabs.Panel>
        <Tabs.Panel value="catalog" className="demo__page">
          <Catalog settings={settings} />
        </Tabs.Panel>
      </Tabs.Root>
    </MonohudProvider>
  );
}
