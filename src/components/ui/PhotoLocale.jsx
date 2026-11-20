/**
 * Photo servie depuis `public/`, en AVIF, WebP et JPEG.
 *
 * POURQUOI UN `<picture>` ET NON UN SIMPLE `srcSet`
 *
 * `srcSet` choisit une TAILLE ; `<source type>` choisit un FORMAT. Il faut les
 * deux : la même photo existe en quatre largeurs et en trois formats, et le
 * navigateur doit pouvoir prendre la plus petite déclinaison qu'il lui faut
 * dans le format le plus efficace qu'il sait lire. Sur la photo d'accueil,
 * cela fait 482 Ko en JPEG contre 214 en AVIF, à l'œil près.
 *
 * L'ORDRE DES SOURCES EST LA SEULE CHOSE QUI DÉCIDE. Un `<picture>` retient la
 * première qu'il sait décoder, sans comparer : AVIF avant WebP, et le JPEG du
 * `<img>` en dernier recours pour les navigateurs qui ne connaissent ni l'un
 * ni l'autre.
 *
 * `width` et `height` sont obligatoires ici, et c'est voulu : ce sont eux qui
 * donnent le rapport de forme avant l'arrivée de l'image. Sans eux la page se
 * réagence au chargement, et ce décalage compte au CLS — l'audit le relevait
 * sur treize pages.
 */
export function PhotoLocale({ photo, alt, sizes, className = '', width, height, loading = 'lazy' }) {
  return (
    <picture>
      <source type="image/avif" srcSet={photo.avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={photo.webpSrcSet} sizes={sizes} />
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className={className}
      />
    </picture>
  )
}
