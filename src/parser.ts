export class DictionaryParser {
  private currentEntry: DictionaryEntry | null = null;
  private entries: DictionaryEntry[] = [];

  parseHTML(htmlContent: string): DictionaryEntry[] {
    // Split by the entry separator
    const entryBlocks = htmlContent.split(/\s*<p class="bor"><\/p>\s*/);
    
    console.log(`Found ${entryBlocks.length} potential entry blocks`);
    
    for (const block of entryBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;
      
      // Check if this block contains actual entry content
      if (this.isValidEntryBlock(trimmedBlock)) {
        this.currentEntry = this.createEmptyEntry();
        this.parseEntryBlock(trimmedBlock);
        
        // Only add if we found essential data (kanji)
        if (this.currentEntry.kanji) {
          this.entries.push(this.currentEntry);
        }
      }
    }
    
    return this.entries;
  }

  private isValidEntryBlock(block: string): boolean {
    return block.includes('textStyle48')
  }

  private createEmptyEntry(): DictionaryEntry {
    return {
      id: "",
      raw: "",
      number: "", // Changed from year to number
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
    let inEtymologySection = false;
    let etymologyContent = "";
    
    // Extract all images from the entire block first
    this.currentEntry!.raw = block
    this.extractAllImagesFromBlock(block);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse entry number (not year!)
      const numberMatch = trimmedLine.match(/<span class="textStyle47a">(\d+)<\/span>/);
      if (numberMatch) {
        this.currentEntry!.number = numberMatch[1];
        continue;
      }

      // Parse level
      const levelMatch = trimmedLine.match(/<span class="textStyle49">(L\d+)<\/span>/);
      if (levelMatch) {
        this.currentEntry!.level = levelMatch[1];
        continue;
      }

      // Parse kanji and ID
      const kanjiMatch = trimmedLine.match(/<span class="textStyle48"[^>]*id="([^"]+)">([^<]+)<\/span>/);
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

      // Parse strokes
      const strokesMatch = trimmedLine.match(/<span class="textStyle44">(\d+)\s*strokes?<\/span>/i);
      if (strokesMatch) {
        this.currentEntry!.strokes = strokesMatch[1];
        continue;
      }

      // Parse examples
      if (trimmedLine.includes('textStyle41') && trimmedLine.includes('textStyle43')) {
        this.parseExampleLine(trimmedLine);
        continue;
      }

      // Parse etymology - improved detection
      if (trimmedLine.includes('indent2') && trimmedLine.includes('textStyle44') && 
          !trimmedLine.includes('Mnemonic') &&
          (trimmedLine.includes('OBI') || 
           trimmedLine.includes('Originally') || 
           trimmedLine.includes('Seal') ||
           trimmedLine.includes('References:'))) {
        inEtymologySection = true;
        etymologyContent = this.extractTextContent(trimmedLine);
        continue;
      }

      // Continue etymology section
      if (inEtymologySection && trimmedLine.includes('textStyle44') && 
          !trimmedLine.includes('Mnemonic')) {
        etymologyContent += " " + this.extractTextContent(trimmedLine);
        continue;
      }

      // End etymology section
      if (inEtymologySection && trimmedLine.includes('Mnemonic')) {
        inEtymologySection = false;
        this.currentEntry!.etymology = etymologyContent.replace(/\s+/g, ' ').trim();
        etymologyContent = "";
      }

      // Parse mnemonic - improved to handle different formats
      if (trimmedLine.includes('Mnemonic')) {
        this.parseMnemonicLine(trimmedLine);
        continue;
      }
    }

    // Final cleanup
    if (inEtymologySection && etymologyContent) {
      this.currentEntry!.etymology = etymologyContent.replace(/\s+/g, ' ').trim();
    }
  }

  // NEW METHOD: Extract all images from the entire block
  private extractAllImagesFromBlock(block: string): void {
    const imgMatches = [...block.matchAll(/<img[^>]*src="([^"]*)"[^>]*>/g)];
    for (const match of imgMatches) {
      this.currentEntry!.images.push(match[1]);
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

  private parseMnemonicLine(line: string): void {
    // Handle different mnemonic formats:
    // Format 1: <span class="textStyle45">Mnemonic:</span> <span class="textStyle44">TEXT</span>
    // Format 2: <span class="textStyle45">Mnemonic</span><span class="textStyle44">TEXT</span>
    
    let mnemonicText = "";
    
    // Try format 1 first
    const format1Match = line.match(/<span class="textStyle45">Mnemonic:<\/span> <span class="textStyle44">([^<]+)<\/span>/);
    if (format1Match) {
      mnemonicText = format1Match[1];
    } else {
      // Try format 2 - extract all textStyle44 content after "Mnemonic"
      const textStyle44Matches = [...line.matchAll(/<span class="textStyle44">([^<]+)<\/span>/g)];
      if (textStyle44Matches.length > 0) {
        // Take the last textStyle44 content (usually the mnemonic text)
        mnemonicText = textStyle44Matches[textStyle44Matches.length - 1][1];
      }
    }
    
    if (mnemonicText) {
      this.currentEntry!.mnemonic = mnemonicText.trim();
    }
  }

  private extractTextContent(html: string): string {
    // Remove all HTML tags and clean up whitespace
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export interface DictionaryEntry {
  id: string;
  raw: string;
  number: string; // Changed from year to number
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