/**
 * Configurações do Next.js para o ENARE Daily.
 *
 * Usamos um loader de imagens customizado para permitir
 * transformações automáticas no Cloudinary. Além disso,
 * habilitamos o App Router experimental por padrão.
 */
const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './utils/imageOptimization.ts',
    domains: ['res.cloudinary.com'],
  },
};

export default nextConfig;