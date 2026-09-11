/** A self-contained text card: no remote images, coordinates or account data. */
export async function downloadInquiryCard(placeName: string, text: string) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const font = '"Noto Sans KR", sans-serif';
  const wrap = (value: string, size: number) => {
    context.font = `500 ${size}px ${font}`;
    return value.split("\n").flatMap(paragraph => {
      const lines: string[] = []; let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > 856) { lines.push(line); line = word; }
        else line = candidate;
        // Ordinary Korean words stay together; a long unspaced note still fits.
        if (context.measureText(line).width > 856) {
          let part = "";
          for (const char of line) {
            if (part && context.measureText(part + char).width > 856) { lines.push(part); part = char; }
            else part += char;
          }
          line = part;
        }
      }
      lines.push(line); return lines;
    });
  };
  const title = wrap(placeName.slice(0, 120), 30);
  const lines = wrap(text, 40);
  canvas.height = 280 + title.length * 46 + lines.length * 66;
  context.fillStyle = "#f5f4f8"; context.fillRect(0, 0, 1080, canvas.height);
  context.fillStyle = "#ffffff"; context.beginPath(); context.roundRect(40, 40, 1000, canvas.height - 80, 36); context.fill();
  context.textBaseline = "top";
  context.font = `500 30px ${font}`; context.fillStyle = "#6940a6";
  title.forEach((line, index) => context.fillText(line, 112, 104 + index * 46));
  context.font = `500 40px ${font}`; context.fillStyle = "#2b2632";
  const start = 150 + title.length * 46;
  lines.forEach((line, index) => context.fillText(line, 112, start + index * 66));
  context.font = `700 24px ${font}`; context.fillStyle = "#6940a6"; context.fillText("WAVE", 112, canvas.height - 100);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image unavailable")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = "WAVE-방문-문의카드.png";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
