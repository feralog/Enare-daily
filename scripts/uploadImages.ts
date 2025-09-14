import fs from 'fs';
import path from 'path';
import cloudinary from 'cloudinary';

/**
 * Script utilitário para carregar imagens de todas as pastas de imagens do ENARE
 * para o Cloudinary. Este script percorre os diretórios de imagens
 * encontrados em `data/imagens_enare_*` e envia cada arquivo. O
 * link gerado pode ser salvo em `metadados_imagens_enare.json`.
 */
async function uploadImages() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Defina as variáveis de ambiente do Cloudinary para enviar imagens.');
    return;
  }
  cloudinary.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  const baseDir = path.join('data');
  const dirs = fs.readdirSync(baseDir).filter((d) => d.startsWith('imagens_enare_'));
  const result: Record<string, string> = {};
  for (const dir of dirs) {
    const dirPath = path.join(baseDir, dir);
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const key = path.join(dir, file);
      try {
        const res = await cloudinary.v2.uploader.upload(filePath, {
          folder: `enare-daily/${dir}`,
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto',
        });
        result[key] = res.secure_url;
        console.log(`${key} -> ${res.secure_url}`);
      } catch (err) {
        console.error(`Erro ao enviar ${key}`, err);
      }
    }
  }
  fs.writeFileSync('metadados_imagens_enare.json', JSON.stringify(result, null, 2));
  console.log('Upload de imagens concluído.');
}

uploadImages();