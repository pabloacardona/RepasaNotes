// Crops the photo to a centred square and shrinks it to 256px, so the stored picture is a few KB.
export async function photoToAvatar(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
  return canvas.toDataURL("image/jpeg", 0.85);
}
