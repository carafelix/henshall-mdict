import { DictionaryParser } from "./parser.ts";
import { DictionaryExporter } from "./exporter.ts";

async function main() {
  // Read HTML file
  const htmlContent = await Deno.readTextFile('assets/dict.xhtml');
  
  // Parse entries
  const parser = new DictionaryParser();
  const entries = parser.parseHTML(htmlContent);
  
  console.log(`Parsed ${entries.length} entries`);
  
  // Create output directory structure
  try {
    Deno.mkdirSync('output/images', { recursive: true });
    Deno.mkdirSync('output/stardict', { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
  }
  
  // Export to different formats (images will reference output/images/)
  DictionaryExporter.exportTSV(entries, 'output/dictionary.tsv');
  console.log("Exported to TSV");
  
  DictionaryExporter.exportStarDict(entries, 'output/stardict');
  console.log("Exported to StarDict format");
  
  DictionaryExporter.exportYoumiTan(entries, 'output/youmitan.json');
  console.log("Exported to YoumiTan format");
  
  // Print instructions for manual image copying
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Copy all your images manually to: output/images/");
  console.log("2. Make sure filenames match the references in the exported files");
  
  // Print sample entry for verification
   if (entries.length > 0) {
    console.log("\nSample entry:");
    console.log(JSON.stringify(entries[88], null, 2));
  }
}

// Run the main function
if (import.meta.main) {
  main().catch(console.error);
}