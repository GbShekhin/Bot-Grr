import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  ButtonInteraction,
  ModalSubmitInteraction,
  TextChannel,
  CategoryChannel,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error("DISCORD_BOT_TOKEN environment variable is required.");
}

const CANAL_BOTAO_ID = "1486852151467573369";
const CANAL_RELATORIOS_ID = "1486863719525912576";
const CATEGORIA_TICKET_ID = "1288859958040985685";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("recrutamento")
    .setDescription("Exibe o processo de recrutamento"),

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

  new SlashCommandBuilder()
    .setName("setup-recrutamento")
    .setDescription("Envia o painel de solicitação de recrutamento no canal configurado")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "recrutamento") {
      await handleRecrutamento(interaction);
    } else if (interaction.commandName === "contabilidade") {
      await handleContabilidade(interaction);
    } else if (interaction.commandName === "setup-recrutamento") {
      await handleSetupRecrutamento(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === "solicitar_recrutamento") {
      await handleAbrirModal(interaction);
    } else if (interaction.customId.startsWith("aprovar_")) {
      await handleAprovar(interaction);
    } else if (interaction.customId.startsWith("reprovar_")) {
      await handleReprovar(interaction);
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "modal_recrutamento") {
      await handleModalRecrutamento(interaction);
    }
  }
});

async function handleRecrutamento(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const avatarUrl = interaction.client.user.displayAvatarURL({ size: 256, extension: "png" });

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

  const embed = new EmbedBuilder()
    .setTitle("📊 Contabilidade de QRUs")
    .setDescription(
      [
        `📸 **Quantidade de fotos (QRUs):** ${quantidade}`,
        `💵 **Valor por foto:** R$ ${valorPorFoto.toLocaleString("pt-BR")}`,
        ``,
        `💰 **Total: R$ ${total.toLocaleString("pt-BR")}**`,
      ].join("\n")
    )
    .setColor(0x57f287)
    .setFooter({ text: "Cada QRU equivale a R$ 8.000" });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSetupRecrutamento(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const canal = interaction.guild?.channels.cache.get(CANAL_BOTAO_ID) as TextChannel | undefined;

  if (!canal) {
    await interaction.editReply({ content: "❌ Canal de recrutamento não encontrado. Verifique o ID configurado." });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 Solicitação de Recrutamento")
    .setDescription("Clique abaixo para solicitar seu recrutamento.")
    .setColor(0x2b2d31)
    .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256, extension: "png" }));

  const botao = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("solicitar_recrutamento")
      .setLabel("📋 Solicitar Recrutamento")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [botao] });
  await interaction.editReply({ content: `✅ Painel de recrutamento enviado em <#${CANAL_BOTAO_ID}>!` });
}

async function handleAbrirModal(interaction: ButtonInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("modal_recrutamento")
    .setTitle("Solicitação de Recrutamento");

  const nomeInput = new TextInputBuilder()
    .setCustomId("nome_ingame")
    .setLabel("Nome ingame")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const idInput = new TextInputBuilder()
    .setCustomId("id_ingame")
    .setLabel("ID ingame")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const patenteInput = new TextInputBuilder()
    .setCustomId("patente")
    .setLabel("Patente na Polícia")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const dataInput = new TextInputBuilder()
    .setCustomId("data_desejada")
    .setLabel("Data desejada")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex: Segunda, 14/04")
    .setRequired(true);

  const horarioInput = new TextInputBuilder()
    .setCustomId("horario_desejado")
    .setLabel("Horário desejado")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex: 15h")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nomeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(patenteInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dataInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(horarioInput),
  );

  await interaction.showModal(modal);
}

async function handleModalRecrutamento(
  interaction: ModalSubmitInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const nome = interaction.fields.getTextInputValue("nome_ingame");
  const id = interaction.fields.getTextInputValue("id_ingame");
  const patente = interaction.fields.getTextInputValue("patente");
  const data = interaction.fields.getTextInputValue("data_desejada");
  const horario = interaction.fields.getTextInputValue("horario_desejado");

  const canalRelatorios = interaction.guild?.channels.cache.get(CANAL_RELATORIOS_ID) as TextChannel | undefined;

  if (!canalRelatorios) {
    await interaction.editReply({ content: "❌ Canal de relatórios não encontrado." });
    return;
  }

  const solicitanteId = interaction.user.id;

  const embed = new EmbedBuilder()
    .setTitle("📋 Nova Solicitação de Recrutamento")
    .setDescription(
      [
        `**Nome:** ${nome}`,
        `**ID:** ${id}`,
        `**Patente:** ${patente}`,
        `**Data:** ${data}`,
        `**Horário:** ${horario}`,
        ``,
        `**Solicitante:** <@${solicitanteId}>`,
      ].join("\n")
    )
    .setColor(0xffa500)
    .setTimestamp();

  const botoes = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${solicitanteId}_${nome}_${id}_${patente}_${data}_${horario}`)
      .setLabel("✅ Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reprovar_${solicitanteId}`)
      .setLabel("❌ Reprovar")
      .setStyle(ButtonStyle.Danger),
  );

  await canalRelatorios.send({ embeds: [embed], components: [botoes] });
  await interaction.editReply({ content: "✅ Sua solicitação foi enviada! Aguarde a aprovação dos recrutadores." });
}

async function handleAprovar(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferUpdate();

  const partes = interaction.customId.split("_");
  const solicitanteId = partes[1];
  const nome = partes[2];
  const id = partes[3];
  const patente = partes[4];
  const data = partes[5];
  const horario = partes[6];

  const categoria = interaction.guild?.channels.cache.get(CATEGORIA_TICKET_ID) as CategoryChannel | undefined;

  if (!categoria) {
    await interaction.followUp({ content: "❌ Categoria de tickets não encontrada.", ephemeral: true });
    return;
  }

  const nomeCanal = `recrutamento-${nome.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`;

  const ticket = await interaction.guild!.channels.create({
    name: nomeCanal,
    type: ChannelType.GuildText,
    parent: CATEGORIA_TICKET_ID,
    permissionOverwrites: [
      {
        id: interaction.guild!.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: solicitanteId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ],
  });

  const embedAprovado = new EmbedBuilder()
    .setTitle("✅ Recrutamento aprovado!")
    .setDescription(
      [
        `<@${solicitanteId}>`,
        ``,
        `**Nome:** ${nome}`,
        `**ID:** ${id}`,
        `**Patente:** ${patente}`,
        `**Data:** ${data}`,
        `**Horário:** ${horario}`,
      ].join("\n")
    )
    .setColor(0x57f287)
    .setTimestamp();

  await (ticket as TextChannel).send({ embeds: [embedAprovado] });

  const embedAtualizado = new EmbedBuilder()
    .setTitle("📋 Solicitação de Recrutamento")
    .setDescription(
      [
        `**Nome:** ${nome}`,
        `**ID:** ${id}`,
        `**Patente:** ${patente}`,
        `**Data:** ${data}`,
        `**Horário:** ${horario}`,
        ``,
        `**Solicitante:** <@${solicitanteId}>`,
        ``,
        `✅ **Aprovado por <@${interaction.user.id}>** — Ticket: <#${ticket.id}>`,
      ].join("\n")
    )
    .setColor(0x57f287)
    .setTimestamp();

  await interaction.message.edit({ embeds: [embedAtualizado], components: [] });
}

async function handleReprovar(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferUpdate();

  const solicitanteId = interaction.customId.split("_")[1];

  const embedAtualizado = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xff0000)
    .setDescription(
      (interaction.message.embeds[0].description ?? "") +
      `\n\n❌ **Reprovado por <@${interaction.user.id}>**`
    );

  await interaction.message.edit({ embeds: [embedAtualizado], components: [] });

  try {
    const solicitante = await interaction.client.users.fetch(solicitanteId);
    await solicitante.send("❌ Sua solicitação de recrutamento foi **reprovada**. Você pode tentar novamente em outro momento.");
  } catch {
    console.log("Não foi possível enviar DM ao solicitante.");
  }
}

client.login(token);
