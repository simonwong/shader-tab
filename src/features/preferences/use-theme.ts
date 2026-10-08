import { useEffect, useState } from 'react';
import type { Preferences } from './model';
import type { Theme } from '../../effects/presets';
export function useTheme(appearance: Preferences['appearance']): Theme {
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return appearance === 'system' ? (dark ? 'night' : 'day') : appearance;
}
