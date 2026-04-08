import type { CubeColorOption } from './types';

export const CUBE_PALETTE: readonly CubeColorOption[] = [
  {
    id: 'ion-cyan',
    label: 'Ion Cyan',
    primary: 0x6ff6ff,
    glow: 0xb9fbff,
    stripe: 0xffffff,
  },
  {
    id: 'solar-gold',
    label: 'Solar Gold',
    primary: 0xffd166,
    glow: 0xfff1bf,
    stripe: 0xfff8db,
  },
  {
    id: 'reactor-lime',
    label: 'Reactor Lime',
    primary: 0xa4ff68,
    glow: 0xd9ffb8,
    stripe: 0xf6ffe8,
  },
  {
    id: 'nova-orange',
    label: 'Nova Orange',
    primary: 0xff9d5c,
    glow: 0xffcfaa,
    stripe: 0xfff0df,
  },
  {
    id: 'radar-blue',
    label: 'Radar Blue',
    primary: 0x73a8ff,
    glow: 0xc0d7ff,
    stripe: 0xeef5ff,
  },
] as const;

export const DEFAULT_CUBE_COLOR_ID = CUBE_PALETTE[0].id;

export function getCubeColorOption(id: string | null | undefined): CubeColorOption {
  return CUBE_PALETTE.find((option) => option.id === id) ?? CUBE_PALETTE[0];
}

export function getCubeTextureKey(id: string | null | undefined): string {
  return `player-${getCubeColorOption(id).id}`;
}
