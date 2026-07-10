import { net, protocol } from 'electron';
import { pathToFileURL } from 'url';
import { isAllowedImagePath, isAllowedWallpaperPath } from '../services/media';

export function registerMediaSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'cinnatool-image',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
    {
      scheme: 'cinnatool-wallpaper',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function registerMediaProtocolHandlers(): void {
  protocol.handle('cinnatool-image', (request) => {
    const requestUrl = new URL(request.url);
    const filePath = requestUrl.searchParams.get('path');

    if (!filePath || !isAllowedImagePath(filePath)) {
      throw new Error('Image is not available');
    }

    return net.fetch(pathToFileURL(filePath).href);
  });

  protocol.handle('cinnatool-wallpaper', (request) => {
    const requestUrl = new URL(request.url);
    const filePath = requestUrl.searchParams.get('path');

    if (!filePath || !isAllowedWallpaperPath(filePath)) {
      throw new Error('Wallpaper is not available');
    }

    return net.fetch(pathToFileURL(filePath).href);
  });
}
