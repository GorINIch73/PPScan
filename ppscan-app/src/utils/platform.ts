import { Capacitor } from '@capacitor/core';

export const Platform = {
  isAndroid: (): boolean => Capacitor.isNativePlatform(),
  isIOS: (): boolean => Capacitor.getPlatform() === 'ios',
  isWeb: (): boolean => !Capacitor.isNativePlatform()
};
