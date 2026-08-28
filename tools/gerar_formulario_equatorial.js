const fs = require("fs/promises");
const path = require("path");
const JSZip = require("jszip");

const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "formulario-equatorial-grupo-b.xlsx");

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function setCell(xml, ref, value, type = "string") {
  if (value === null || value === undefined || value === "") return xml;

  const rowNumber = ref.match(/\d+/)?.[0];
  if (!rowNumber) return xml;

  const cellPattern = new RegExp(
    `<c\\b([^>]*\\br="${ref}"[^>]*)\\s*\\/>|<c\\b([^>]*\\br="${ref}"[^>]*)>[\\s\\S]*?<\\/c>`
  );
  const existing = xml.match(cellPattern);
  const rawAttributes = existing?.[1] || existing?.[2] || ` r="${ref}"`;
  const attributes = rawAttributes.replace(/\s+t="[^"]*"/g, "");
  const content = type === "number"
    ? `<c${attributes}><v>${normalizeNumber(value)}</v></c>`
    : `<c${attributes} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;

  if (existing) return xml.replace(cellPattern, content);

  const rowPattern = new RegExp(`(<row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/row>)`);
  return xml.replace(rowPattern, `$1$2${content}$3`);
}

function officialRequestType(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("ligacao nova")) {
    return "LIGAÇÃO NOVA DE UNIDADE CONSUMIDORA COM GERAÇÃO DISTRIBUÍDA";
  }
  if (normalized.includes("conexao em uc existente") && normalized.includes("sem aumento")) {
    return "CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA (ver item abaixo)";
  }
  if (normalized.includes("conexao em uc existente") && normalized.includes("com aumento")) {
    return "CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA (ver item abaixo)";
  }
  if (normalized.includes("aumento da potencia") && normalized.includes("sem aumento")) {
    return "AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA (ver item abaixo)";
  }
  if (normalized.includes("aumento da potencia") && normalized.includes("com aumento")) {
    return "AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA (ver item abaixo)";
  }
  return value || "";
}

function officialCompensation(value) {
  const map = {
    "autoconsumo local": "AUTOCONSUMO LOCAL",
    "autoconsumo remoto": "AUTOCONSUMO REMOTO",
    "geracao compartilhada": "GERAÇÃO COMPARTILHADA",
    "empreendimento de multiplas unidades consumidoras": "EMPREENDIMENTO DE MÚLTIPLAS UNIDADES CONSUMIDORAS",
  };
  return map[String(value || "").toLowerCase()] || value || "";
}

function splitCoordinates(value) {
  const parts = String(value || "").split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  return parts.length >= 2 ? [parts[0], parts[1]] : [value || "", ""];
}

async function gerarFormularioEquatorial(projeto, formulario) {
  const zip = await JSZip.loadAsync(await fs.readFile(TEMPLATE_PATH));
  let geradoresXml = await zip.file("xl/worksheets/sheet2.xml").async("string");
  let formularioXml = await zip.file("xl/worksheets/sheet3.xml").async("string");

  geradoresXml = setCell(geradoresXml, "C6", formulario.potencia_modulo_w, "number");
  geradoresXml = setCell(geradoresXml, "G6", formulario.quantidade_modulos, "number");
  geradoresXml = setCell(geradoresXml, "S6", formulario.fabricante_modulos);
  geradoresXml = setCell(geradoresXml, "Z6", formulario.modelo_modulos);

  const inverterCount = Math.min(Math.max(Number(formulario.quantidade_inversores) || 1, 1), 30);
  for (let index = 0; index < inverterCount; index += 1) {
    const row = 21 + index;
    geradoresXml = setCell(geradoresXml, `C${row}`, formulario.fabricante_inversores);
    geradoresXml = setCell(geradoresXml, `G${row}`, formulario.modelo_inversores);
    geradoresXml = setCell(geradoresXml, `K${row}`, formulario.potencia_inversor_kw, "number");
  }

  const fullAddress = [
    formulario.endereco,
    formulario.numero && `nº ${formulario.numero}`,
    formulario.complemento,
    formulario.bairro,
  ].filter(Boolean).join(", ");
  const [coordinateX, coordinateY] = splitCoordinates(formulario.coordenadas);

  const stringCells = {
    C9: projeto.cliente_nome,
    R9: projeto.documento,
    W10: projeto.telefone,
    C12: fullAddress,
    R12: projeto.email,
    D15: formulario.cep,
    G15: projeto.cidade,
    Q15: String(projeto.estado || "").toUpperCase(),
    F17: "Orçamento de Conexão",
    T17: formulario.conta_contrato,
    G19: officialRequestType(formulario.tipo_solicitacao),
    T35: coordinateX,
    Z35: coordinateY,
    C43: formulario.responsavel_tecnico_nome,
    W43: formulario.responsavel_tecnico_registro,
    C46: formulario.responsavel_tecnico_email,
    S46: formulario.responsavel_tecnico_telefone,
    G51: "SOLAR FOTOVOLTAICA",
    G53: "EMPREGANDO CONVERSOR ELETRÔNICO/INVERSOR",
    I55: officialCompensation(formulario.modalidade_compensacao),
  };
  for (const [ref, value] of Object.entries(stringCells)) {
    formularioXml = setCell(formularioXml, ref, value);
  }

  formularioXml = setCell(formularioXml, "AB31", formulario.potencia_disponibilizada_kw, "number");
  formularioXml = setCell(formularioXml, "AC59", formulario.potencia_maxima_injetavel_kw, "number");

  zip.file("xl/worksheets/sheet2.xml", geradoresXml);
  zip.file("xl/worksheets/sheet3.xml", formularioXml);

  const workbookXmlPath = "xl/workbook.xml";
  let workbookXml = await zip.file(workbookXmlPath).async("string");
  if (/<calcPr\b[^>]*\/>/.test(workbookXml)) {
    workbookXml = workbookXml.replace(/<calcPr\b[^>]*\/>/, '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>');
  } else {
    workbookXml = workbookXml.replace("</workbook>", '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
  }
  zip.file(workbookXmlPath, workbookXml);

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

module.exports = { gerarFormularioEquatorial };
