/**
 * Função de carregamento de imagem customizada para Cloudinary.
 *
 * Permite adicionar parâmetros de transformação ao URL das imagens
 * hospedadas no Cloudinary. Se a imagem já estiver hospedada
 * no domínio do Cloudinary, os parâmetros são adicionados; caso
 * contrário, a URL é retornada sem modificação.
 */
export const cloudinaryLoader = ({ src, width, quality }: { src: string; width: number; quality?: number }) => {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  const paramsString = params.join(',');
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (src.includes('cloudinary.com')) {
    return src.replace('/upload/', `/upload/${paramsString}/`);
  }
  return src;
};