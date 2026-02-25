import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  const response = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 200,
    messages: [
      { role: "user", content: "Explique o que é JavaScript em poucas palavras." }
    ],
  });

  console.log(response.content[0].text);
}

main();