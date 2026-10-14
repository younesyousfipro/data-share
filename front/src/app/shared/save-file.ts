// Hands a file received in memory to the browser, which saves it like any download
export function saveFile(content: Blob, fileName: string): void {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Freed once the click is handled: the URL keeps the whole file in memory until then
  setTimeout(() => URL.revokeObjectURL(url));
}
