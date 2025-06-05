import { Filesystem, Directory } from '@capacitor/filesystem';

export const writeFile = async (filename: string, dataUrl: string): Promise<void> => {
  await Filesystem.writeFile({
    path: filename,
    data: dataUrl,
    directory: Directory.Data,
  });
};

export const readFile = async (filename: string): Promise<string> => {
  const contents = await Filesystem.readFile({
    path: filename,
    directory: Directory.Data,
  });
  return contents.data;
};