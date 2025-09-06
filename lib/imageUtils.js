/**
 * Converts a base64 data URL to a File object.
 * @param {string} dataurl - The base64 data URL.
 * @param {string} filename - The desired filename.
 * @returns {File}
 */
export function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

/**
 * Instagram Classic filter - universally appealing enhancement
 * Applies: slight brightness boost, contrast increase, saturation enhancement, 
 * subtle warm sepia tone, and slight hue rotation for warmth
 * @returns {string} CSS filter string
 */
export function getInstagramClassicFilter() {
  // return 'brightness(1.05) contrast(1.1) saturate(1.15) sepia(0.1) hue-rotate(-5deg)';
  return 'brightness(1.05)';
}

/**
 * Applies the Instagram Classic filter to an image element
 * @param {HTMLImageElement} imageElement - The image element to apply filter to
 */
export function applyInstagramClassicFilter(imageElement) {
  if (imageElement) {
    imageElement.style.filter = getInstagramClassicFilter();
  }
}