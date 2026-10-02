import net from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const port = Number(process.env.MOCK_SMTP_PORT || process.env.SMTP_PORT || 2525);
const outputDir = process.env.MOCK_SMTP_OUT || ".mock-smtp";
await mkdir(outputDir, { recursive: true });

const server = net.createServer(socket => {
  let data = "";
  let greeted = false;
  let accepted = false;
  const reply = message => socket.write(`${message}\r\n`);
  reply("220 NOVA CART Mock SMTP ready");
  socket.on("data", async chunk => {
    data += chunk.toString("utf8");
    const lines = data.split(/\r?\n/);
    data = lines.pop() || "";
    for (const raw of lines) {
      const line = raw.trim();
      const upper = line.toUpperCase();
      if (upper.startsWith("EHLO") || upper.startsWith("HELO")) { greeted = true; reply("250-mock.local\r\n250 AUTH PLAIN LOGIN"); }
      else if (upper.startsWith("AUTH")) reply("235 2.7.0 Authentication successful");
      else if (upper.startsWith("MAIL FROM")) { accepted = greeted; reply(accepted ? "250 2.1.0 Sender OK" : "503 5.5.1 Say HELO first"); }
      else if (upper.startsWith("RCPT TO")) reply(accepted ? "250 2.1.5 Recipient OK" : "503 5.5.1 Sender required");
      else if (upper === "DATA") reply("354 End data with <CR><LF>.<CR><LF>");
      else if (line === ".") {
        const filename = join(outputDir, `${new Date().toISOString().replaceAll(/[:.]/g, "-")}.eml`);
        await writeFile(filename, data, "utf8");
        data = "";
        reply("250 2.0.0 Message accepted for testing");
        console.log(`[mock-smtp] captured ${filename}`);
      } else if (upper === "QUIT") { reply("221 2.0.0 Bye"); socket.end(); }
    }
  });
});

server.listen(port, "127.0.0.1", () => console.log(`[mock-smtp] listening on 127.0.0.1:${port}; messages -> ${outputDir}`));
process.on("SIGINT", () => server.close(() => process.exit(0)));
