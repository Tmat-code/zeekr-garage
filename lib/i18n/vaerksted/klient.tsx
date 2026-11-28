'use client';

// UI-i18n U6: Værksted-ordbogen i klient-komponenter. Sproget kommer fra den
// fælles SprogProvider i root-layoutet (bærer kun sprog-koden); selve
// Værksted-ordbogen slås op lokalt - og importeres kun af components/admin/**,
// så den kun ligger i Værkstedets bundle.

import { useSprog } from '../klient';
import { vordbog, type VOrdbog } from './index';

export function useVOrdbog(): VOrdbog {
  return vordbog(useSprog());
}
