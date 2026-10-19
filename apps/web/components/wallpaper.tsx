'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Check, ImagePlus, LayoutGrid, PanelLeft } from 'lucide-react';
import { Card } from './ui';
import { useToast } from './feedback';

/** Per-browser UI preference in localStorage; every hook using the same key stays in sync. */
export function usePref(key: string, fallback: string) {
  const read = () => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const sync = () => setValue(read());
    sync();
    window.addEventListener('ka:pref', sync);
    return () => window.removeEventListener('ka:pref', sync);
  }, [key]);
  const set = (next: string) => {
    try {
      localStorage.setItem(key, next);
    } catch {
      return false; // quota exceeded / storage blocked
    }
    window.dispatchEvent(new Event('ka:pref'));
    return true;
  };
  return [value, set] as const;
}

/** Original Apple-style scenes as inline SVG (no downloads, no third-party artwork). */
const svg = (body: string) =>
  `center / cover no-repeat url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000' preserveAspectRatio='xMidYMid slice'>${body}</svg>`,
  )}")`;
const sky = (id: string, stops: string[]) =>
  `<linearGradient id='${id}' x1='0' y1='0' x2='0' y2='1'>${stops
    .map((c, i) => `<stop offset='${i / (stops.length - 1)}' stop-color='${c}'/>`)
    .join('')}</linearGradient>`;
const layers = (paths: [string, string][]) =>
  paths.map(([d, fill]) => `<path d='${d}' fill='${fill}'/>`).join('');

const SCENES: Record<string, string> = {
  hills: svg(
    `<defs>${sky('s', ['#2b3a8f', '#e58ba0', '#f6c38b'])}</defs><rect width='1600' height='1000' fill='url(#s)'/>` +
      layers([
        ['M0 620C250 520 450 560 700 600S1200 520 1600 580V1000H0Z', '#4f7a6b'],
        ['M0 720C300 640 600 700 900 690S1400 640 1600 700V1000H0Z', '#2f5d55'],
        ['M0 830C350 760 700 820 1000 800S1450 780 1600 820V1000H0Z', '#1d3f3d'],
        ['M0 920C400 870 800 930 1200 900S1500 890 1600 910V1000H0Z', '#122a2b'],
      ]),
  ),
  waves: svg(
    `<defs><filter id='b'><feGaussianBlur stdDeviation='40'/></filter></defs><rect width='1600' height='1000' fill='#0b1030'/><g filter='url(#b)'>` +
      layers([
        [
          'M-100 700C300 500 700 900 1100 600S1700 500 1800 650L1800 820C1500 700 1100 1000 700 860S100 800-100 920Z',
          '#3b5bdb',
        ],
        [
          'M-100 560C400 380 800 760 1200 470S1700 420 1800 520L1800 620C1400 560 1100 820 700 710S200 600-100 710Z',
          '#9c36b5',
        ],
        [
          'M-100 420C300 300 900 600 1300 360S1700 330 1800 380L1800 450C1400 420 1000 620 600 530S100 460-100 530Z',
          '#f76707',
        ],
      ]) +
      `</g>`,
  ),
  dunes: svg(
    `<defs>${sky('s', ['#fde7c8', '#f4a582'])}</defs><rect width='1600' height='1000' fill='url(#s)'/><circle cx='1180' cy='330' r='90' fill='#fff4e0' opacity='.8'/>` +
      layers([
        ['M0 560C300 470 520 520 800 600S1300 520 1600 470V1000H0Z', '#e8925a'],
        ['M0 700C350 600 600 650 900 720S1350 640 1600 620V1000H0Z', '#cf6a36'],
        ['M0 820C300 760 700 800 1000 860S1400 800 1600 790V1000H0Z', '#a24a26'],
        ['M0 930C450 880 900 950 1600 900V1000H0Z', '#6e2f1b'],
      ]),
  ),
  coast: svg(
    `<defs>${sky('s', ['#1b2a6b', '#7b5ea7', '#f2a07b'])}</defs><rect width='1600' height='1000' fill='url(#s)'/><rect y='760' width='1600' height='240' fill='#27336e'/><rect y='760' width='1600' height='4' fill='#f2a07b' opacity='.5'/>` +
      layers([
        ['M900 1000L960 640L1080 560L1180 600L1300 470L1450 430L1600 380V1000Z', '#3a2f63'],
        ['M1100 1000L1180 720L1300 660L1420 600L1600 560V1000Z', '#251f45'],
        ['M0 1000L0 690L120 650L260 720L360 760L420 1000Z', '#2b2552'],
      ]),
  ),
  liquid: svg(
    `<defs><filter id='b'><feGaussianBlur stdDeviation='90'/></filter></defs><rect width='1600' height='1000' fill='#050816'/><g filter='url(#b)'>` +
      `<circle cx='420' cy='320' r='300' fill='#4f46e5'/><circle cx='1150' cy='280' r='260' fill='#06b6d4'/><circle cx='900' cy='760' r='320' fill='#ec4899'/><circle cx='300' cy='820' r='200' fill='#f59e0b'/></g>`,
  ),
};

export const WALLPAPERS: Record<string, string> = {
  ...SCENES,
  ledger:
    'repeating-linear-gradient(to bottom, transparent 0 39px, rgb(255 255 255 / 0.04) 39px 40px), radial-gradient(at 80% 15%, #1d4ed8 0, transparent 55%), radial-gradient(at 10% 90%, #0e7490 0, transparent 45%), linear-gradient(160deg, #0f1f45, #0a1530)',
  aurora:
    'radial-gradient(at 20% 20%, #3b82f6 0, transparent 50%), radial-gradient(at 80% 10%, #8b5cf6 0, transparent 45%), radial-gradient(at 70% 85%, #06b6d4 0, transparent 50%), linear-gradient(135deg, #0f1f45, #1e1b4b)',
  dawn: 'radial-gradient(at 15% 85%, #f97316 0, transparent 50%), radial-gradient(at 85% 20%, #ec4899 0, transparent 50%), linear-gradient(160deg, #7c3aed, #1e1b4b)',
  forest:
    'radial-gradient(at 30% 30%, #10b981 0, transparent 50%), radial-gradient(at 80% 75%, #0ea5e9 0, transparent 45%), linear-gradient(160deg, #064e3b, #0f172a)',
  ocean:
    'radial-gradient(at 75% 25%, #38bdf8 0, transparent 50%), radial-gradient(at 20% 80%, #2563eb 0, transparent 55%), linear-gradient(180deg, #0c4a6e, #172554)',
  graphite:
    'radial-gradient(at 50% 0%, #475569 0, transparent 60%), linear-gradient(180deg, #1e293b, #020617)',
};

const background = (value: string) =>
  value.startsWith('data:')
    ? `center / cover no-repeat url("${value}")`
    : (WALLPAPERS[value] ?? WALLPAPERS.hills);

export const useWallpaper = () => usePref('ka.wallpaper', 'hills');
export const useLayoutPref = () => usePref('ka.layout', 'desktop');

export function Wallpaper() {
  const [value] = useWallpaper();
  return (
    <div aria-hidden className="fixed inset-0 -z-10" style={{ background: background(value) }}>
      {/* Refraction for .glass (see globals.css): low-frequency noise bends what is behind the glass. */}
      <svg className="absolute size-0">
        <filter id="liquid-glass" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation={2} result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale={40}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </div>
  );
}

/** Downscale to ≤1920px JPEG so it fits in localStorage. */
async function shrink(file: File) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / img.width);
  const canvas = Object.assign(document.createElement('canvas'), {
    width: Math.round(img.width * scale),
    height: Math.round(img.height * scale),
  });
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export function AppearanceSettings() {
  const toast = useToast();
  const [wallpaper, setWallpaper] = useWallpaper();
  const [layout, setLayout] = useLayoutPref();

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (!setWallpaper(await shrink(file))) toast('Image is too large to save in this browser', 'error');
    } catch {
      toast('Could not read that image', 'error');
    }
  }

  const swatch = (selected: boolean) =>
    `relative h-16 rounded-xl ring-offset-2 transition hover:scale-[1.03] ${selected ? 'ring-2 ring-blue-600' : 'ring-1 ring-slate-200'}`;

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-medium text-slate-900">Appearance</h2>
      <p className="mb-4 text-xs text-slate-500">Saved in this browser only.</p>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {(
          [
            ['desktop', 'Desktop', LayoutGrid],
            ['classic', 'Classic sidebar', PanelLeft],
          ] as const
        ).map(([key, name, Icon]) => (
          <button
            key={key}
            onClick={() => setLayout(key)}
            aria-pressed={layout === key}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
              layout === key
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="size-4" /> {name}
          </button>
        ))}
      </div>
      <p className="mb-2 text-sm font-medium text-slate-700">Wallpaper</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(WALLPAPERS).map((key) => (
          <button
            key={key}
            aria-label={`${key} wallpaper`}
            title={key}
            onClick={() => setWallpaper(key)}
            className={swatch(wallpaper === key)}
            style={{ background: WALLPAPERS[key] }}
          >
            {wallpaper === key && <Check className="absolute top-1.5 right-1.5 size-4 text-white" />}
          </button>
        ))}
        <label
          className={`${swatch(wallpaper.startsWith('data:'))} grid cursor-pointer place-items-center bg-slate-50 text-slate-500`}
          style={wallpaper.startsWith('data:') ? { background: background(wallpaper) } : undefined}
        >
          <span className="flex flex-col items-center text-xs">
            <ImagePlus className="size-5" /> Upload
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={upload} />
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Upload any image you like. On a Mac, Apple&apos;s own wallpapers are in{' '}
        <code className="rounded bg-slate-100 px-1">/System/Library/Desktop Pictures</code>.
      </p>
    </Card>
  );
}
