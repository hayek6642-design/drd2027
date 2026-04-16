/**
 * AI-Chat File Upload & Analysis
 * Enhanced upload capability for code, docs, images, audio
 */

class FileAnalyzer {
  constructor() {
    this.supportedTypes = {
      code: ["js","py","jsx","ts","tsx","java","cpp","c","rb","go"],
      docs: ["md","txt","pdf","docx","doc"],
      image: ["jpg","png","gif","webp","svg"],
      audio: ["mp3","wav","ogg","aac","flac"],
      data: ["json","csv","xml","sql"]
    };
  }
  
  getFileType(filename) {
    const ext = filename?.split('.')?.pop()?.toLowerCase();
    for(let [type, exts] of Object.entries(this.supportedTypes)) {
      if(exts.includes(ext)) return type;
    }
    return "unknown";
  }
  
  analyzeFile(file) {
    const type = this.getFileType(file.name);
    const size = (file.size / 1024).toFixed(2);
    
    let analysis = `📄 **File Analysis**\n\n**Name:** ${file.name}\n**Type:** ${type.toUpperCase()}\n**Size:** ${size}KB\n\n`;
    
    if(type === "code") {
      analysis += "**What I can do:**\n• Explain code logic\n• Find bugs\n• Suggest improvements\n• Explain functions\n• Check security\n\nShare your code and ask questions!";
    } else if(type === "docs") {
      analysis += "**What I can do:**\n• Summarize content\n• Extract key points\n• Answer questions about it\n• Translate\n• Format improvements\n\nWhat do you want to know?";
    } else if(type === "image") {
      analysis += "**What I can do:**\n• Describe what I see\n• Read text (OCR)\n• Identify objects\n• Suggest improvements\n\nTell me what you need!";
    } else if(type === "audio") {
      analysis += "**What I can do:**\n• Transcribe speech\n• Analyze tone/emotion\n• Extract key points\n• Identify speakers\n\nWhat would you like analyzed?";
    } else if(type === "data") {
      analysis += "**What I can do:**\n• Visualize patterns\n• Extract statistics\n• Explain structure\n• Find anomalies\n\nWhat insights do you need?";
    }
    
    return analysis;
  }
}

window.FileAnalyzer = FileAnalyzer;
console.log("[FileUpload] Analyzer ready ✓");
