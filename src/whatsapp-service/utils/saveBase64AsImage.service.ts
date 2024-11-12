// utils/saveBase64AsImage.ts
import { writeFile } from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);

export async function saveBase64AsImage(base64String: string, outputPath: string) {
  // Eliminar el prefijo "data:image/png;base64,"
  const base64Data = base64String.replace(/^data:image\/png;base64,/, '');

  // Convertir el base64 a un buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // Guardar el archivo
  await writeFileAsync(outputPath, buffer);
  console.log('Imagen guardada en:', outputPath);
}
