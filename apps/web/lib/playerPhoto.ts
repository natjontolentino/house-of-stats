import "server-only";
import sharp from "sharp";

export const PLAYER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PLAYER_PHOTO_SIZE = 400;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class PlayerPhotoError extends Error {}

/**
 * Validates an uploaded player photo and returns a square 400x400 WebP.
 * The format is read from the file's actual bytes, not its name or the
 * browser-supplied MIME type, which a client can set to anything.
 */
export async function processPlayerPhoto(file: File): Promise<Buffer> {
  if (file.size === 0) throw new PlayerPhotoError("Choose a photo to upload.");
  if (file.size > PLAYER_PHOTO_MAX_BYTES) throw new PlayerPhotoError("That photo is over 2 MB. Pick a smaller one.");

  const input = Buffer.from(await file.arrayBuffer());
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw new PlayerPhotoError("That file isn't a readable image.");
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) throw new PlayerPhotoError("Photos must be JPG, PNG or WebP.");

  return sharp(input)
    .rotate() // honour the phone's EXIF orientation before cropping
    .resize(PLAYER_PHOTO_SIZE, PLAYER_PHOTO_SIZE, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();
}
