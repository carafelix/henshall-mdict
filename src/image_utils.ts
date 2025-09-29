import { DictionaryEntry } from "./parser.ts";

export async function extractImagesToBase64(entries: DictionaryEntry[], outputFile: string): Promise<void> {
  const imageData: Record<string, { data: string; mime_type: string; filename: string }> = {};

  const allImages = new Set<string>();
  entries.forEach(entry => entry.images.forEach(img => allImages.add(img)));

  for (const imgPath of allImages) {
    try {
      const imageBytes = await Deno.readFile(imgPath);
      const base64Str = btoa(String.fromCharCode(...imageBytes));
      
      const ext = imgPath.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      
      imageData[imgPath] = {
        data: base64Str,
        mime_type: mimeType,
        filename: imgPath.split('/').pop() || imgPath
      };
    } catch (e) {
      console.error(`Error processing image ${imgPath}: ${e}`);
    }
  }

  await Deno.writeTextFile(outputFile, JSON.stringify(imageData, null, 2));
  console.log(`Extracted ${Object.keys(imageData).length} images to base64`);
}