export interface DictionaryEntry {
  id: string;
  year: string;
  level: string;
  kanji: string;
  reading: string;
  meaning: string;
  strokes: string;
  examples: Example[];
  etymology: string;
  mnemonic: string;
  images: string[];
}

export interface Example {
  word: string;
  reading: string;
  meaning: string;
}

export class DictionaryParser {
  private currentEntry: DictionaryEntry | null = null;
  private entries: DictionaryEntry[] = [];

  parseHTML(htmlContent: string): DictionaryEntry[] {
    // Split by entry separator
    const entryBlocks = htmlContent.split(/<p class="bor"><\/p>\s*/);
    
    for (const block of entryBlocks) {
      if (!block.trim()) continue;
      
      this.currentEntry = this.createEmptyEntry();
      this.parseEntryBlock(block);
      this.entries.push(this.currentEntry);
    }
    
    return this.entries;
  }

  private createEmptyEntry(): DictionaryEntry {
    return {
      id: "",
      year: "",
      level: "",
      kanji: "",
      reading: "",
      meaning: "",
      strokes: "",
      examples: [],
      etymology: "",
      mnemonic: "",
      images: []
    };
  }

  private parseEntryBlock(block: string): void {
    const lines = block.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse year/number
      const yearMatch = trimmedLine.match(/<span class="textStyle47a">(\d+)<\/span>/);
      if (yearMatch) {
        this.currentEntry!.year = yearMatch[1];
        continue;
      }

      // Parse level
      const levelMatch = trimmedLine.match(/<span class="textStyle49">(L\d+)<\/span>/);
      if (levelMatch) {
        this.currentEntry!.level = levelMatch[1];
        continue;
      }

      // Parse kanji and ID
      const kanjiMatch = trimmedLine.match(/<span class="textStyle48" id="([^"]+)">([^<]+)<\/span>/);
      if (kanjiMatch) {
        this.currentEntry!.id = kanjiMatch[1];
        this.currentEntry!.kanji = kanjiMatch[2];
        continue;
      }

      // Parse reading
      const readingMatch = trimmedLine.match(/<span class="textStyle46">([^<]+)<\/span>/);
      if (readingMatch) {
        this.currentEntry!.reading = readingMatch[1];
        continue;
      }

      // Parse meaning
      const meaningMatch = trimmedLine.match(/<span class="textStyle47">([^<]+)<\/span>/);
      if (meaningMatch) {
        this.currentEntry!.meaning = meaningMatch[1];
        continue;
      }

      // Parse strokes - store only the digit
      const strokesMatch = trimmedLine.match(/<span class="textStyle44">(\d+)\s*strokes?<\/span>/i);
      if (strokesMatch) {
        this.currentEntry!.strokes = strokesMatch[1]; // Store only the number
        continue;
      }

      // Parse examples
      if (trimmedLine.includes('textStyle41') && trimmedLine.includes('textStyle43')) {
        this.parseExampleLine(trimmedLine);
        continue;
      }

      // Parse etymology (handle multi-line content)
      if (trimmedLine.includes('textStyle44') && 
          (trimmedLine.includes('Seal') || 
           trimmedLine.includes('References:') || 
           trimmedLine.includes('Originally'))) {
        this.parseEtymologyLine(trimmedLine);
        continue;
      }

      // Parse mnemonic
      const mnemonicMatch = trimmedLine.match(/<span class="textStyle45">Mnemonic:<\/span> <span class="textStyle44">([^<]+)<\/span>/);
      if (mnemonicMatch) {
        this.currentEntry!.mnemonic = mnemonicMatch[1];
        continue;
      }
    }
  }

  private parseExampleLine(line: string): void {
    const wordMatches = [...line.matchAll(/<span class="textStyle41">([^<]+)<\/span>/g)];
    const readingMatches = [...line.matchAll(/<span class="textStyle43">([^<]+)<\/span>/g)];
    const meaningMatches = [...line.matchAll(/<span class="textStyle44">([^<]+)<\/span>/g)];

    if (wordMatches.length > 0 && readingMatches.length > 0 && meaningMatches.length > 0) {
      const example: Example = {
        word: wordMatches[0][1],
        reading: readingMatches[0][1],
        meaning: meaningMatches[0][1]
      };
      this.currentEntry!.examples.push(example);
    }
  }

  private parseEtymologyLine(line: string): void {
    // Extract images
    const imgMatches = [...line.matchAll(/<img[^>]*src="([^"]*)"[^>]*>/g)];
    for (const match of imgMatches) {
      this.currentEntry!.images.push(match[1]);
    }

    // Clean HTML tags for text content
    let cleanText = line.replace(/<[^>]+>/g, ' ');
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    if (this.currentEntry!.etymology) {
      this.currentEntry!.etymology += " " + cleanText;
    } else {
      this.currentEntry!.etymology = cleanText;
    }
  }
}