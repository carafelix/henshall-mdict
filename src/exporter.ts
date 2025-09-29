import { DictionaryEntry } from "./parser.ts";

export class DictionaryExporter {
  static exportTSV(entries: DictionaryEntry[], outputFile: string): void {
    const tsvContent = entries.map(entry => {
      const examplesStr = entry.examples.map(ex => 
        `${ex.word} [${ex.reading}] - ${ex.meaning}`
      ).join('; ');
      
      // Update image paths to point to output/images
      const updatedImages = entry.images.map(img => 
        `images/${this.getFileName(img)}`
      );
      const imagesStr = updatedImages.join('; ');

      return [
        entry.kanji,
        entry.reading,
        entry.meaning,
        entry.level,
        entry.year,
        entry.strokes,
        examplesStr,
        entry.etymology || '',
        entry.mnemonic || '',
        imagesStr
      ].map(field => this.escapeTSVField(field)).join('\t');
    }).join('\n');

    // Add header
    const header = [
      'Kanji', 'Reading', 'Meaning', 'Level', 'Year', 
      'Strokes', 'Examples', 'Etymology', 'Mnemonic', 'Images'
    ].join('\t');
    
    const fullContent = header + '\n' + tsvContent;
    Deno.writeTextFileSync(outputFile, fullContent);
  }

  private static escapeTSVField(field: string): string {
    if (field.includes('\t') || field.includes('\n') || field.includes('\r')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  static exportStarDict(entries: DictionaryEntry[], outputDir: string): void {
    // Create output directory
    try {
      Deno.mkdirSync(outputDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
    }

    const dictContent: string[] = [];
    const idxContent: Uint8Array[] = [];
    
    let offset = 0;

    for (const entry of entries) {
      if (!entry.kanji) continue;

      const definition = this.formatStarDictDefinition(entry);
      const definitionBytes = new TextEncoder().encode(definition);
      
      // Add to dictionary content
      dictContent.push(definition);
      
      // Add to index
      const wordBytes = new TextEncoder().encode(entry.kanji);
      const idxEntry = new Uint8Array(wordBytes.length + 1 + 8);
      
      let pos = 0;
      idxEntry.set(wordBytes, pos);
      pos += wordBytes.length;
      idxEntry.set([0], pos); // null terminator
      pos += 1;
      
      // Write offset (big-endian)
      const offsetBytes = new Uint8Array(4);
      new DataView(offsetBytes.buffer).setUint32(0, offset, false);
      idxEntry.set(offsetBytes, pos);
      pos += 4;
      
      // Write size (big-endian)
      const sizeBytes = new Uint8Array(4);
      new DataView(sizeBytes.buffer).setUint32(0, definitionBytes.length, false);
      idxEntry.set(sizeBytes, pos);
      
      idxContent.push(idxEntry);
      offset += definitionBytes.length;
    }

    // Write files
    Deno.writeFileSync(`${outputDir}/dictionary.dict`, new TextEncoder().encode(dictContent.join('')));
    
    const idxData = new Uint8Array(idxContent.reduce((acc, curr) => acc + curr.length, 0));
    let idxPos = 0;
    for (const entry of idxContent) {
      idxData.set(entry, idxPos);
      idxPos += entry.length;
    }
    Deno.writeFileSync(`${outputDir}/dictionary.idx`, idxData);

    // Create info file
    const infoContent = `StarDict's dict ifo file
version=2.4.2
bookname=Japanese Dictionary
wordcount=${entries.length}
synwordcount=0
idxfilesize=${idxData.length}
author=Parser
description=Japanese dictionary with images
date=${new Date().toISOString().split('T')[0]}
sametypesequence=m
`;
    Deno.writeTextFileSync(`${outputDir}/dictionary.ifo`, infoContent);
  }

  private static formatStarDictDefinition(entry: DictionaryEntry): string {
    const lines: string[] = [];
    
    lines.push(`<b>${entry.kanji}</b>`);
    if (entry.reading) lines.push(`Reading: ${entry.reading}`);
    if (entry.meaning) lines.push(`Meaning: ${entry.meaning}`);
    if (entry.strokes) lines.push(`Strokes: ${entry.strokes}`);
    if (entry.level) lines.push(`Level: ${entry.level}`);
    if (entry.year) lines.push(`Number: ${entry.year}`);
    
    if (entry.examples.length > 0) {
      lines.push("\nExamples:");
      entry.examples.forEach(ex => {
        lines.push(`  • ${ex.word} [${ex.reading}] - ${ex.meaning}`);
      });
    }
    
    if (entry.etymology) {
      lines.push(`\nEtymology: ${entry.etymology}`);
    }
    
    if (entry.mnemonic) {
      lines.push(`\nMnemonic: ${entry.mnemonic}`);
    }
    
    if (entry.images.length > 0) {
      lines.push("\nImages:");
      entry.images.forEach(img => {
        // Reference images in output/images folder
        const imagePath = `images/${this.getFileName(img)}`;
        lines.push(`  [Image: ${imagePath}]`);
      });
    }
    
    return lines.join('\n') + '\n';
  }

  static exportYoumiTan(entries: DictionaryEntry[], outputFile: string): void {
    const youmitanData = entries.map(entry => ({
      character: entry.kanji,
      kana: entry.reading,
      meaning: entry.meaning,
      level: entry.level,
      stroke_count: entry.strokes,
      number: entry.year,
      examples: entry.examples,
      etymology: entry.etymology,
      mnemonic: entry.mnemonic,
      // Update image paths to point to output/images
      image_references: entry.images.map(img => 
        `images/${this.getFileName(img)}`
      ),
      id: entry.id
    }));

    Deno.writeTextFileSync(outputFile, JSON.stringify(youmitanData, null, 2));
  }

  private static getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
}