const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');
const { getConfig } = require('../../utils/configLoader');

function cfg() {
  const c = getConfig() || {};
  return {
    domain: process.env.CARDSWAP_DOMAIN || c?.APIs?.CardSwap?.Domain || c?.CardSwap?.Domain || '',
    domainPost: process.env.CARDSWAP_DOMAIN_POST || c?.APIs?.CardSwap?.DomainPost || c?.CardSwap?.DomainPost || '',
    partnerId: process.env.CARDSWAP_PARTNER_ID || c?.APIs?.CardSwap?.PartnerId || c?.CardSwap?.PartnerId || '',
    partnerKey: process.env.CARDSWAP_PARTNER_KEY || c?.APIs?.CardSwap?.PartnerKey || c?.CardSwap?.PartnerKey || '',
    withdrawApiKey: process.env.CARDSWAP_WITHDRAW_API_KEY || c?.APIs?.CardSwap?.WithdrawApiKey || c?.CardSwap?.WithdrawApiKey || ''
  };
}

function md5(str) {
  return crypto.createHash('md5').update(String(str)).digest('hex');
}

function requireConfig(interaction, parts = []) {
  const c = cfg();
  const missing = [];
  for (const p of parts) {
    if (!c[p]) missing.push(p);
  }
  if (missing.length) {
    const msg = `Thiếu cấu hình CardSwap: ${missing.join(', ')}. Hãy thiết lập trong biến môi trường hoặc config.yml.`;
    throw new Error(msg);
  }
  return c;
}

async function postForm(url, data, timeout = 15000) {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const res = await axios.post(url, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    timeout
  });
  return res.data;
}

async function getJson(url, timeout = 15000) {
  const res = await axios.get(url, { timeout });
  return res.data;
}

function genRequestId() {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function jsonEmbed(title, obj) {
  const text = '```json\n' + JSON.stringify(obj, null, 2).slice(0, 3950) + '\n```';
  return new EmbedBuilder().setColor('#FF6C37').setTitle(title).setDescription(text).setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cardswap')
    .setDescription('Tích hợp Cardswap Partner API')
    .addSubcommand(sc => sc
      .setName('charge')
      .setDescription('Đổi thẻ cào (charging)')
      .addStringOption(o => o.setName('telco').setDescription('Nhà mạng (VD: VIETTEL, MOBIFONE, VINAPHONE, VNMOBI, GATE)').setRequired(true))
      .addStringOption(o => o.setName('code').setDescription('Mã thẻ').setRequired(true))
      .addStringOption(o => o.setName('serial').setDescription('Serial thẻ').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Mệnh giá khai báo').setRequired(true))
      .addStringOption(o => o.setName('request_id').setDescription('Mã yêu cầu (tuỳ chọn)'))
    )
    .addSubcommand(sc => sc
      .setName('check')
      .setDescription('Kiểm tra trạng thái thẻ (check)')
      .addStringOption(o => o.setName('request_id').setDescription('Mã yêu cầu khi nạp').setRequired(true))
      .addStringOption(o => o.setName('telco').setDescription('Nhà mạng'))
      .addStringOption(o => o.setName('code').setDescription('Mã thẻ'))
      .addStringOption(o => o.setName('serial').setDescription('Serial thẻ'))
      .addIntegerOption(o => o.setName('amount').setDescription('Mệnh giá khai báo'))
    )
    .addSubcommand(sc => sc
      .setName('fee')
      .setDescription('Lấy bảng phí/chiết khấu đổi thẻ')
    )
    .addSubcommand(sc => sc
      .setName('buycard')
      .setDescription('Mua thẻ cào')
      .addStringOption(o => o.setName('service_code').setDescription('Mã dịch vụ (VD: VIETTEL)').setRequired(true))
      .addIntegerOption(o => o.setName('value').setDescription('Mệnh giá').setRequired(true))
      .addIntegerOption(o => o.setName('qty').setDescription('Số lượng').setRequired(true))
      .addStringOption(o => o.setName('request_id').setDescription('Mã yêu cầu (tuỳ chọn)'))
    )
    .addSubcommand(sc => sc
      .setName('balance')
      .setDescription('Lấy số dư tài khoản mua thẻ')
    )
    .addSubcommand(sc => sc
      .setName('stock')
      .setDescription('Kiểm tra tồn kho thẻ')
      .addStringOption(o => o.setName('service_code').setDescription('Mã dịch vụ').setRequired(true))
      .addIntegerOption(o => o.setName('value').setDescription('Mệnh giá').setRequired(true))
      .addIntegerOption(o => o.setName('qty').setDescription('Số lượng').setRequired(true))
    )
    .addSubcommand(sc => sc
      .setName('products')
      .setDescription('Lấy danh sách thẻ khả dụng')
    )
    .addSubcommand(sc => sc
      .setName('transfers')
      .setDescription('Lịch sử chuyển tiền (partner)')
      .addIntegerOption(o => o.setName('limit').setDescription('Số bản ghi').setMinValue(1).setMaxValue(50))
    )
    .addSubcommand(sc => sc
      .setName('withdraw_create')
      .setDescription('Tạo lệnh rút tiền')
      .addStringOption(o => o.setName('bank_code').setDescription('Mã ngân hàng (VD: 970415)').setRequired(true))
      .addStringOption(o => o.setName('account_number').setDescription('Số tài khoản nhận').setRequired(true))
      .addStringOption(o => o.setName('account_owner').setDescription('Chủ tài khoản nhận').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Số tiền rút').setRequired(true))
    )
    .addSubcommand(sc => sc
      .setName('banks')
      .setDescription('Danh sách ngân hàng hỗ trợ rút')
    )
    .addSubcommand(sc => sc
      .setName('withdraw_status')
      .setDescription('Kiểm tra trạng thái đơn rút')
      .addStringOption(o => o.setName('order_id').setDescription('Mã đơn rút').setRequired(true))
    )
    .addSubcommand(sc => sc
      .setName('checkapi')
      .setDescription('Kiểm tra API')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'charge') return await handleCharge(interaction);
      if (sub === 'check') return await handleCheck(interaction);
      if (sub === 'fee') return await handleFee(interaction);
      if (sub === 'buycard') return await handleBuyCard(interaction);
      if (sub === 'balance') return await handleBalance(interaction);
      if (sub === 'stock') return await handleStock(interaction);
      if (sub === 'products') return await handleProducts(interaction);
      if (sub === 'transfers') return await handleTransfers(interaction);
      if (sub === 'withdraw_create') return await handleWithdrawCreate(interaction);
      if (sub === 'banks') return await handleBanks(interaction);
      if (sub === 'withdraw_status') return await handleWithdrawStatus(interaction);
      if (sub === 'checkapi') return await handleCheckAPI(interaction);
    } catch (e) {
      const msg = e?.response?.data || e?.message || String(e);
      if (!interaction.deferred && !interaction.replied) {
        return interaction.reply({ content: `Lỗi khi gọi API: ${typeof msg === 'string' ? msg : 'Xem chi tiết log.'}`, ephemeral: true });
      }
      return interaction.editReply({ content: `Lỗi khi gọi API.` });
    }
  }
};

async function handleCharge(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId', 'partnerKey']);
  const telco = interaction.options.getString('telco', true).toUpperCase();
  const code = interaction.options.getString('code', true);
  const serial = interaction.options.getString('serial', true);
  const amount = interaction.options.getInteger('amount', true);
  const requestId = interaction.options.getString('request_id') || genRequestId();

  const url = `https://${c.domain}/chargingws/v2`;
  const payload = {
    telco,
    code,
    serial,
    amount,
    request_id: requestId,
    partner_id: c.partnerId,
    sign: md5(c.partnerKey + code + serial),
    command: 'charging'
  };
  const data = await postForm(url, payload);
  return interaction.editReply({ embeds: [jsonEmbed('Đổi thẻ - Kết quả', data)] });
}

async function handleCheck(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId', 'partnerKey']);
  const requestId = interaction.options.getString('request_id', true);
  const telco = interaction.options.getString('telco') || '';
  const code = interaction.options.getString('code') || '';
  const serial = interaction.options.getString('serial') || '';
  const amount = interaction.options.getInteger('amount') || '';

  const url = `https://${c.domain}/chargingws/v2`;
  const payload = {
    telco,
    code,
    serial,
    amount,
    request_id: requestId,
    partner_id: c.partnerId,
    sign: md5(c.partnerKey + code + serial),
    command: 'check'
  };
  const data = await postForm(url, payload);
  return interaction.editReply({ embeds: [jsonEmbed('Kiểm tra thẻ - Kết quả', data)] });
}

async function handleFee(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId']);
  const url = `https://${c.domain}/chargingws/v2/getfee?partner_id=${encodeURIComponent(c.partnerId)}`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Bảng phí đổi thẻ', data)] });
}

async function handleBuyCard(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId', 'partnerKey']);
  const service_code = interaction.options.getString('service_code', true).toUpperCase();
  const value = interaction.options.getInteger('value', true);
  const qty = interaction.options.getInteger('qty', true);
  const request_id = interaction.options.getString('request_id') || genRequestId();

  const url = `https://${c.domain}/api/cardws`;
  // Dự đoán chữ ký: md5(partner_key + request_id + service_code + value + qty)
  const sign = md5(c.partnerKey + request_id + service_code + String(value) + String(qty));
  const payload = {
    partner_id: c.partnerId,
    request_id,
    service_code,
    value,
    qty,
    sign,
    command: 'buycard'
  };
  const data = await axios.post(url, payload, { timeout: 15000 }).then(r => r.data);
  return interaction.editReply({ embeds: [jsonEmbed('Mua thẻ - Kết quả', data)] });
}

async function handleBalance(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId', 'partnerKey']);
  // Dự đoán chữ ký: md5(partner_key + 'getbalance')
  const sign = md5(c.partnerKey + 'getbalance');
  const url = `https://${c.domain}/api/cardws?partner_id=${encodeURIComponent(c.partnerId)}&sign=${encodeURIComponent(sign)}&command=getbalance`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Số dư', data)] });
}

async function handleStock(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId', 'partnerKey']);
  const service_code = interaction.options.getString('service_code', true).toUpperCase();
  const value = interaction.options.getInteger('value', true);
  const qty = interaction.options.getInteger('qty', true);
  // Dự đoán chữ ký: md5(partner_key + service_code + value + qty)
  const sign = md5(c.partnerKey + service_code + String(value) + String(qty));
  const url = `https://${c.domain}/api/cardws?partner_id=${encodeURIComponent(c.partnerId)}&command=checkavailable&service_code=${encodeURIComponent(service_code)}&value=${encodeURIComponent(value)}&qty=${encodeURIComponent(qty)}&sign=${encodeURIComponent(sign)}`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Tồn kho', data)] });
}

async function handleProducts(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId']);
  const url = `https://${c.domain}/api/cardws/products?partner_id=${encodeURIComponent(c.partnerId)}`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Danh sách thẻ', data)] });
}

async function handleTransfers(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domainPost', 'partnerKey']);
  const limit = interaction.options.getInteger('limit') || 5;
  const url = `https://${c.domainPost}/api/v1/partner/transfers?partner_key=${encodeURIComponent(c.partnerKey)}&limit=${encodeURIComponent(limit)}`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Lịch sử chuyển tiền', data)] });
}

async function handleWithdrawCreate(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const c = requireConfig(interaction, ['domainPost', 'withdrawApiKey']);
  const payload = {
    api_key: c.withdrawApiKey,
    bank_code: interaction.options.getString('bank_code', true),
    receive_account_number: interaction.options.getString('account_number', true),
    receive_account_owner: interaction.options.getString('account_owner', true),
    amount: interaction.options.getInteger('amount', true)
  };
  const url = `https://${c.domainPost}/api/v1/partner/withdraws`;
  const data = await axios.post(url, payload, { timeout: 15000 }).then(r => r.data);
  return interaction.editReply({ embeds: [jsonEmbed('Tạo lệnh rút', data)], ephemeral: true });
}

async function handleBanks(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domainPost']);
  const url = `https://${c.domainPost}/api/v1/partner/withdraws/banks`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Ngân hàng hỗ trợ', data)] });
}

async function handleWithdrawStatus(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domainPost', 'partnerId', 'partnerKey']);
  const orderId = interaction.options.getString('order_id', true);
  // Dự đoán chữ ký: md5(partner_key + order_id)
  const sign = md5(c.partnerKey + orderId);
  const url = `https://${c.domainPost}/api/v1/partner/withdraws/${encodeURIComponent(orderId)}?partner_id=${encodeURIComponent(c.partnerId)}&sign=${encodeURIComponent(sign)}`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Trạng thái rút', data)] });
}

async function handleCheckAPI(interaction) {
  await interaction.deferReply();
  const c = requireConfig(interaction, ['domain', 'partnerId', 'partnerKey']);
  const url = `http://${c.domain}/chargingws/v2/check-api?partner_id=${encodeURIComponent(c.partnerId)}&partner_key=${encodeURIComponent(c.partnerKey)}`;
  const data = await getJson(url);
  return interaction.editReply({ embeds: [jsonEmbed('Kiểm tra API', data)] });
}

