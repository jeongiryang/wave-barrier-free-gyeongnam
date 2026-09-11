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
      for (const char of paragraph) {
        if (line && context.measureText(line + char).width > 856) { lines.push(line); line = char; }
        else line += char;
      }
      lines.push(line); return lines;
    });
  };
  const title = wrap(placeName.slice(0, 120), 30);
  const lines = wrap(text, 40);
  canvas.height = 220 + title.length * 46 + lines.length * 66;
  context.fillStyle = "#f5f4f8"; context.fillRect(0, 0, 1080, canvas.height);
  context.fillStyle = "#ffffff"; context.beginPath(); context.roundRect(40, 40, 1000, canvas.height - 80, 36); context.fill();
  context.textBaseline = "top";
  context.font = `500 30px ${font}`; context.fillStyle = "#6940a6";
  title.forEach((line, index) => context.fillText(line, 112, 104 + index * 46));
  context.font = `500 40px ${font}`; context.fillStyle = "#2b2632";
  const start = 150 + title.length * 46;
  lines.forEach((line, index) => context.fillText(line, 112, start + index * 66));
  context.font = `700 24px ${font}`; context.fillStyle = "#6940a6"; context.fillText("WAVE", 112, canvas.height - 86);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image unavailable")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = "WAVE-방문-문의카드.png";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
