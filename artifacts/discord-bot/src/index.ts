import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error("DISCORD_BOT_TOKEN environment variable is required.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("recrutamento")
    .setDescription("Exibe o processo de recrutamento da PMRJ"),

  new SlashCommandBuilder()
    .setName("contabilidade")
    .setDescription("Conta os QRUs (fotos) no ticket e calcula o valor total")
    .addIntegerOption((option) =>
      option
        .setName("quantidade")
        .setDescription("Quantidade de fotos/QRUs no ticket")
        .setRequired(true)
        .setMinValue(0)
    ),
].map((cmd) => cmd.toJSON());

client.once("clientReady", async (readyClient) => {
  console.log(`Bot online como ${readyClient.user.tag}`);

  const rest = new REST().setToken(token!);
  try {
    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commands,
    });
    console.log("Comandos slash registrados com sucesso.");
  } catch (err) {
    console.error("Erro ao registrar comandos:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "recrutamento") {
    await handleRecrutamento(interaction);
  } else if (interaction.commandName === "contabilidade") {
    await handleContabilidade(interaction);
  }
});

async function handleRecrutamento(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const botUser = interaction.client.user;
  const avatarUrl = botUser.displayAvatarURL({ size: 256, extension: "png" });

  const embed = new EmbedBuilder()
    .setTitle("📋 Orientações sobre Recrutamento")
    .setDescription(
      [
        "🚓 **Processo**",
        "",
        "O recrutamento será dividido em duas etapas: prova teórica e prova prática.",
        "",
        "**1ª Etapa – Prova Teórica**",
        "",
        "Com base no manual de estudos e em tudo aquilo que foi passado no MAP, serão aplicadas 10 perguntas. A nota mínima para aprovação é 7.",
        "",
        "Caso o candidato obtenha nota inferior a 7, será reprovado automaticamente e não poderá seguir para a etapa prática.",
        "",
        "**2ª Etapa – Prova Prática**",
        "",
        "Nesta etapa, o candidato realizará um acompanhamento em situação de rua.",
        "",
        "O recrutador será responsável por simular uma fuga, podendo incluir rampas leves, becos, trajetos variados e outros elementos que considerar necessários. A avaliação terá duração de 5 a 10 minutos.",
        "",
        "**Durante o acompanhamento:**",
        "• Realize a modulação corretamente;",
        "• Mantenha contato visual constante com o alvo.",
        "",
        "**Critérios de avaliação:**",
        "• Nota inicial: 10",
        "• A cada perda de visual (quando comprometer o acompanhamento): -1",
        "• A cada pneu furado: -1",
        "• A cada capotamento: -1",
        "• Caso o candidato capote e utilize QTA: **reprovado automaticamente**",
        "• Caso não realize a modulação ou ela seja insuficiente: **reprovado automaticamente**",
        "• Ao final, se a nota for inferior a 7: reprovado.",
        "",
        "**Reprovação automática:**",
        "• Uso de QTA após capotar",
        "• Modulação insuficiente",
        "",
        "Caso o candidato seja reprovado, o recrutador poderá conceder uma segunda ou, no máximo, uma terceira tentativa. Se ainda assim não for aprovado, poderá tentar novamente em outro dia, sem prazo mínimo de espera.",
        "",
        "Ao final do processo, os dados do recrutamento e o resultado deverão ser registrados.",
      ].join("\n")
    )
    .setColor(0x2b2d31)
    .setImage(avatarUrl);

  await interaction.editReply({ embeds: [embed] });
}

async function handleContabilidade(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const quantidade = interaction.options.getInteger("quantidade", true);
  const valorPorFoto = 8000;
  const total = quantidade * valorPorFoto;

  const totalFormatado = total.toLocaleString("pt-BR");

  const embed = new EmbedBuilder()
    .setTitle("📊 Contabilidade de QRUs")
    .setDescription(
      [
        `📸 **Quantidade de fotos (QRUs):** ${quantidade}`,
        `💵 **Valor por foto:** R$ ${valorPorFoto.toLocaleString("pt-BR")}`,
        ``,
        `💰 **Total: R$ ${totalFormatado}**`,
      ].join("\n")
    )
    .setColor(0x57f287)
    .setFooter({ text: "Cada QRU equivale a R$ 8.000" });

  await interaction.editReply({ embeds: [embed] });
}

client.login(token);
