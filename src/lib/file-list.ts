/** Constrói um `FileList` com um único ficheiro (ex.: foto capturada pela câmara). */
export function fileToFileList(file: File): FileList {
  const dt = new DataTransfer();
  dt.items.add(file);
  return dt.files;
}
