const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "public", "proposta-comercial-lei-14300-fio-b.xls");
const today = "2026-04-14";

const x = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const c = ({ v = "", t, s, f, m, i } = {}) => {
  const a = [];
  if (i) a.push(`ss:Index="${i}"`);
  if (s) a.push(`ss:StyleID="${s}"`);
  if (f) a.push(`ss:Formula="${x(f)}"`);
  if (typeof m === "number") a.push(`ss:MergeAcross="${m}"`);
  return `<Cell ${a.join(" ")}><Data ss:Type="${t || (typeof v === "number" ? "Number" : "String")}">${x(v)}</Data></Cell>`;
};

const r = (cells, extra = "") => `<Row${extra ? ` ${extra}` : ""}>${cells.join("")}</Row>`;
const cols = (w) => w.map((n) => `<Column ss:AutoFitWidth="0" ss:Width="${n}"/>`).join("");
const ws = (name, rows, w = [190, 120, 90, 320]) => `
<Worksheet ss:Name="${x(name)}"><Table>${cols(w)}${rows.join("")}</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions>
</Worksheet>`;

const styles = `
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1F2937"/></Style>
<Style ss:ID="title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#A14C12" ss:Pattern="Solid"/></Style>
<Style ss:ID="subtitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#5B6472"/><Interior ss:Color="#F7E5D0" ss:Pattern="Solid"/></Style>
<Style ss:ID="section"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#C96F1A" ss:Pattern="Solid"/></Style>
<Style ss:ID="label"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#FCF7F1" ss:Pattern="Solid"/></Style>
<Style ss:ID="input"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/></Style>
<Style ss:ID="note"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#5B6472"/><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/></Style>
<Style ss:ID="currency"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/><NumberFormat ss:Format="R$ #,##0.00"/></Style>
<Style ss:ID="number"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0.00"/></Style>
<Style ss:ID="integer"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0"/></Style>
<Style ss:ID="percent"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/><NumberFormat ss:Format="0.00%"/></Style>
<Style ss:ID="summary"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5C9A8"/></Borders><Font ss:FontName="Calibri" ss:Bold="1"/><Interior ss:Color="#F6E7D3" ss:Pattern="Solid"/></Style>
<Style ss:ID="small"><Font ss:FontName="Calibri" ss:Size="9" ss:Color="#6B7280"/><Interior ss:Color="#FFFDFC" ss:Pattern="Solid"/></Style>
<Style ss:ID="kh"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#8C4B10" ss:Pattern="Solid"/></Style>
<Style ss:ID="kv"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1"/><Interior ss:Color="#F7E5D0" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0.00"/></Style>
<Style ss:ID="kvc"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1"/><Interior ss:Color="#F7E5D0" ss:Pattern="Solid"/><NumberFormat ss:Format="R$ #,##0.00"/></Style>
<Style ss:ID="kvp"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1"/><Interior ss:Color="#F7E5D0" ss:Pattern="Solid"/><NumberFormat ss:Format="0.00%"/></Style>
</Styles>`;

function buildEntradas() {
  const rows = [];
  const add = (a, b, cs = "input", d = "", bs = cs) => rows.push(r([c({ v: a, s: "label" }), c(b), c({ v: cs === "input" ? "" : cs, s: bs }), c({ v: d, s: "note" })]));
  rows.push(r([c({ v: "Planilha de Proposta Comercial Solar", s: "title", m: 3 })], ' ss:Height="28"'));
  rows.push(r([c({ v: "Lei 14.300/2022 com Fio B, premissas editaveis e painel de apoio comercial", s: "subtitle", m: 3 })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "1. Dados do cliente e enquadramento", s: "section", m: 3 })]));
  add("Cliente", { v: "Preencher nome do cliente", s: "input" }, "", "Campo livre para emissao da proposta.");
  add("Projeto", { v: "Sistema FV On-grid", s: "input" }, "", "Ex.: residencial, comercial ou remoto.");
  add("Distribuidora", { v: "Preencher distribuidora", s: "input" }, "", "Atualize sempre conforme a concessionaria local.");
  add("Grupo tarifario", { v: "B1 Residencial", s: "input" }, "", "Premissa padrao para proposta rapida.");
  add("Modalidade de compensacao", { v: "Autoconsumo local", s: "input" }, "", "Serve tambem para autoconsumo remoto e geracao compartilhada.");
  add("Data da solicitacao/acesso", { v: today, s: "input" }, "", "Use a data real para enquadramento.");
  add("Enquadramento Lei 14.300", { v: "GD II", s: "input" }, "", "GD I ate 07/01/2023. GD II apos 08/01/2023. GD III requer validacao.");
  add("Ano regulatorio", { v: 2026, t: "Number", s: "integer" }, "", "Em 2026, o Fio B do GD II esta em 60%.");
  add("Percentual Fio B automatico", { v: 0.6, t: "Number", s: "percent", f: '=IF(R[-2]C="GD I",0,IF(R[-2]C="GD III",1,IF(R[-1]C<=2022,0,IF(R[-1]C=2023,0.15,IF(R[-1]C=2024,0.3,IF(R[-1]C=2025,0.45,IF(R[-1]C=2026,0.6,IF(R[-1]C=2027,0.75,IF(R[-1]C=2028,0.9,1)))))))))' }, "", "Tabela automatica do art. 27 para GD II.", "percent");
  add("Percentual Fio B manual (-1 = automatico)", { v: -1, t: "Number", s: "percent" }, "", "Use para excecoes ou validacoes especificas.", "percent");
  rows.push(r([c({ v: "Percentual Fio B aplicado", s: "summary" }), c({ v: 0.6, t: "Number", s: "percent", f: "=IF(R[-1]C>=0,R[-1]C,R[-2]C)" }), c({ v: "", s: "summary" }), c({ v: "Valor efetivamente usado nos calculos.", s: "note" })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "2. Consumo e tarifas", s: "section", m: 3 })]));
  add("Consumo medio mensal", { v: 950, t: "Number", s: "number" }, "kWh/mes", "Use a media de 12 meses.", "input");
  add("Consumo anual", { v: 11400, t: "Number", s: "number", f: "=R[-1]C*12" }, "kWh/ano", "Calculado automaticamente.", "summary");
  add("Tarifa TE", { v: 0.34, t: "Number", s: "currency" }, "R$/kWh", "Energia.", "input");
  add("Tarifa TUSD Fio A", { v: 0.08, t: "Number", s: "currency" }, "R$/kWh", "Uso do sistema.", "input");
  add("Tarifa TUSD Fio B", { v: 0.28, t: "Number", s: "currency" }, "R$/kWh", "Base do calculo do Fio B.", "input");
  add("Encargos e tributos estimados", { v: 0.12, t: "Number", s: "currency" }, "R$/kWh", "Ajuste conforme a conta local.", "input");
  rows.push(r([c({ v: "Tarifa cheia sem CIP", s: "summary" }), c({ v: 0.82, t: "Number", s: "currency", f: "=SUM(R[-4]C:R[-1]C)" }), c({ v: "R$/kWh", s: "summary" }), c({ v: "Base da fatura sem solar.", s: "note" })]));
  add("Custo de disponibilidade mensal", { v: 50, t: "Number", s: "currency" }, "R$/mes", "Mantenha conforme a UC.", "input");
  add("CIP / outros mensais", { v: 24, t: "Number", s: "currency" }, "R$/mes", "Item mantido na conta final.", "input");
  rows.push(r([c({ v: "Fatura media atual mensal", s: "summary" }), c({ v: 803, t: "Number", s: "currency", f: "=MAX(R[-9]C*R[-3]C,R[-2]C)+R[-1]C" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Situacao base sem solar.", s: "note" })]));
  rows.push(r([c({ v: "Fatura media atual anual", s: "summary" }), c({ v: 9636, t: "Number", s: "currency", f: "=R[-1]C*12" }), c({ v: "R$/ano", s: "summary" }), c({ v: "Base da analise economica.", s: "note" })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "3. Sistema fotovoltaico", s: "section", m: 3 })]));
  add("Potencia do modulo", { v: 585, t: "Number", s: "number" }, "Wp", "Atualize conforme o kit.", "input");
  add("Numero de modulos", { v: 14, t: "Number", s: "integer" }, "un", "Ajuste pela proposta.", "input");
  rows.push(r([c({ v: "Potencia instalada", s: "summary" }), c({ v: 8.19, t: "Number", s: "number", f: "=R[-2]C*R[-1]C/1000" }), c({ v: "kWp", s: "summary" }), c({ v: "Potencia DC do sistema.", s: "note" })]));
  add("HSP media", { v: 4.9, t: "Number", s: "number" }, "h/dia", "Ajuste pela cidade.", "input");
  add("Performance ratio", { v: 0.79, t: "Number", s: "percent" }, "%", "Perdas globais do sistema.", "input");
  rows.push(r([c({ v: "Geracao media mensal", s: "summary" }), c({ v: 951.1, t: "Number", s: "number", f: "=R[-3]C*R[-2]C*30*R[-1]C" }), c({ v: "kWh/mes", s: "summary" }), c({ v: "Formula: potencia x HSP x 30 x PR.", s: "note" })]));
  rows.push(r([c({ v: "Geracao anual", s: "summary" }), c({ v: 11413.2, t: "Number", s: "number", f: "=R[-1]C*12" }), c({ v: "kWh/ano", s: "summary" }), c({ v: "Base do fluxo de caixa.", s: "note" })]));
  rows.push(r([c({ v: "Relacao geracao x consumo", s: "summary" }), c({ v: 1.0012, t: "Number", s: "percent", f: "=IF(R[-19]C=0,0,R[-1]C/R[-19]C)" }), c({ v: "", s: "summary" }), c({ v: "Acima de 100% gera credito.", s: "note" })]));
  add("Degradacao anual dos modulos", { v: 0.005, t: "Number", s: "percent" }, "%", "Premissa do fluxo 25 anos.", "input");
  add("Reajuste tarifario anual", { v: 0.06, t: "Number", s: "percent" }, "%", "Premissa comercial ajustavel.", "input");
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "4. Investimento e financiamento", s: "section", m: 3 })]));
  add("Preco por Wp", { v: 3.45, t: "Number", s: "currency" }, "R$/Wp", "Premissa rapida para orcamento.", "input");
  rows.push(r([c({ v: "Equipamentos + instalacao", s: "summary" }), c({ v: 28255.5, t: "Number", s: "currency", f: "=R[-11]C*1000*R[-1]C" }), c({ v: "R$", s: "summary" }), c({ v: "Base proporcional a potencia.", s: "note" })]));
  add("Extras / adequacoes", { v: 1500, t: "Number", s: "currency" }, "R$", "Estrutura, padrao, SPDA ou frete.", "input");
  rows.push(r([c({ v: "Investimento total", s: "summary" }), c({ v: 29755.5, t: "Number", s: "currency", f: "=R[-2]C+R[-1]C" }), c({ v: "R$", s: "summary" }), c({ v: "CAPEX estimado da proposta.", s: "note" })]));
  add("Entrada", { v: 6000, t: "Number", s: "currency" }, "R$", "Se venda a vista, iguale ao investimento total.", "input");
  rows.push(r([c({ v: "Valor financiado", s: "summary" }), c({ v: 23755.5, t: "Number", s: "currency", f: "=MAX(R[-2]C-R[-1]C,0)" }), c({ v: "R$", s: "summary" }), c({ v: "Usado no calculo da parcela.", s: "note" })]));
  add("Juros do financiamento", { v: 0.015, t: "Number", s: "percent" }, "a.m.", "Ajuste conforme banco ou fintech.", "input");
  add("Prazo do financiamento", { v: 60, t: "Number", s: "integer" }, "meses", "Fluxo considera a parcela nesse periodo.", "input");
  rows.push(r([c({ v: "Parcela estimada", s: "summary" }), c({ v: 603.76, t: "Number", s: "currency", f: "=IF(R[-3]C=0,0,IF(R[-2]C=0,R[-3]C/R[-1]C,R[-3]C*(R[-2]C*(1+R[-2]C)^R[-1]C)/((1+R[-2]C)^R[-1]C-1)))" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Formula financeira padrao.", s: "note" })]));
  add("Prazo de analise economica", { v: 25, t: "Number", s: "integer" }, "anos", "Aba Fluxo25 acompanha a vida util comercial.", "input");
  rows.push(r([c({ v: "Observacoes", s: "label" }), c({ v: "Atualize tarifas, CIP, HSP e preco/Wp para cada oportunidade.", s: "input", m: 1 }), c({ v: "Use a aba Proposta para imprimir ou apresentar.", s: "note", i: 4 })]));
  return ws("Entradas", rows);
}

function buildCalculos() {
  const rows = [];
  const add = (a, b, unit, note, cs = "input") => rows.push(r([c({ v: a, s: "label" }), c(b), c({ v: unit || "", s: cs }), c({ v: note, s: "note" })]));
  rows.push(r([c({ v: "Calculo tecnico e economico", s: "title", m: 3 })], ' ss:Height="28"'));
  rows.push(r([c({ v: "Aba de apoio interno para simulacao comercial e revisao rapida", s: "subtitle", m: 3 })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "1. Energia e compensacao", s: "section", m: 3 })]));
  add("Consumo medio mensal", { v: 950, t: "Number", s: "number", f: "=Entradas!R18C2" }, "kWh/mes", "Referencia da aba Entradas.");
  add("Geracao media mensal", { v: 951.1, t: "Number", s: "number", f: "=Entradas!R36C2" }, "kWh/mes", "Geracao estimada do sistema.");
  rows.push(r([c({ v: "Energia compensada", s: "summary" }), c({ v: 950, t: "Number", s: "number", f: "=MIN(R[-2]C,R[-1]C)" }), c({ v: "kWh/mes", s: "summary" }), c({ v: "Parcela da geracao que reduz consumo faturavel.", s: "note" })]));
  rows.push(r([c({ v: "Energia importada liquida", s: "summary" }), c({ v: 0, t: "Number", s: "number", f: "=MAX(R[-3]C-R[-2]C,0)" }), c({ v: "kWh/mes", s: "summary" }), c({ v: "Consumo ainda faturado integralmente.", s: "note" })]));
  rows.push(r([c({ v: "Excedente / credito mensal", s: "summary" }), c({ v: 1.1, t: "Number", s: "number", f: "=MAX(R[-3]C-R[-4]C,0)" }), c({ v: "kWh/mes", s: "summary" }), c({ v: "Se positivo, vira credito no SCEE.", s: "note" })]));
  rows.push(r([c({ v: "Percentual Fio B aplicado", s: "summary" }), c({ v: 0.6, t: "Number", s: "percent", f: "=Entradas!R15C2" }), c({ v: "", s: "summary" }), c({ v: "Aplicado sobre a energia compensada.", s: "note" })]));
  add("Tarifa cheia sem CIP", { v: 0.82, t: "Number", s: "currency", f: "=Entradas!R24C2" }, "R$/kWh", "Mesma base da fatura sem solar.");
  add("Tarifa TUSD Fio B", { v: 0.28, t: "Number", s: "currency", f: "=Entradas!R22C2" }, "R$/kWh", "Tarifa base do Fio B.");
  add("Custo de disponibilidade", { v: 50, t: "Number", s: "currency", f: "=Entradas!R25C2" }, "R$/mes", "Permanece na unidade consumidora.");
  add("CIP / outros", { v: 24, t: "Number", s: "currency", f: "=Entradas!R26C2" }, "R$/mes", "Nao entra na compensacao.");
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "2. Resultado mensal", s: "section", m: 3 })]));
  rows.push(r([c({ v: "Fatura sem solar", s: "summary" }), c({ v: 803, t: "Number", s: "currency", f: "=Entradas!R27C2" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Situacao base.", s: "note" })]));
  add("Custo da energia importada", { v: 0, t: "Number", s: "currency", f: "=R[-10]C*R[-7]C" }, "R$/mes", "Energia ainda comprada integralmente.");
  add("Cobranca de Fio B", { v: 159.6, t: "Number", s: "currency", f: "=R[-12]C*R[-7]C*R[-9]C" }, "R$/mes", "Energia compensada x TUSD Fio B x percentual.");
  rows.push(r([c({ v: "Fatura com solar (energia)", s: "summary" }), c({ v: 209.6, t: "Number", s: "currency", f: "=MAX(R[-7]C,R[-2]C+R[-1]C)" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Maior entre disponibilidade e energia+Fio B.", s: "note" })]));
  rows.push(r([c({ v: "Fatura com solar total", s: "summary" }), c({ v: 233.6, t: "Number", s: "currency", f: "=R[-1]C+R[-7]C" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Inclui CIP/outros.", s: "note" })]));
  rows.push(r([c({ v: "Economia mensal", s: "summary" }), c({ v: 569.4, t: "Number", s: "currency", f: "=R[-5]C-R[-1]C" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Indicador principal da proposta.", s: "note" })]));
  rows.push(r([c({ v: "Economia anual", s: "summary" }), c({ v: 6832.8, t: "Number", s: "currency", f: "=R[-1]C*12" }), c({ v: "R$/ano", s: "summary" }), c({ v: "Sem reajuste futuro.", s: "note" })]));
  rows.push(r([c({ v: "Reducao percentual da conta", s: "summary" }), c({ v: 0.709, t: "Number", s: "percent", f: "=IF(R[-7]C=0,0,R[-2]C/R[-7]C)" }), c({ v: "", s: "summary" }), c({ v: "Economia mensal / fatura sem solar.", s: "note" })]));
  rows.push(r([c({ v: "Payback simples", s: "summary" }), c({ v: 4.35, t: "Number", s: "number", f: "=IF(R[-2]C=0,0,Entradas!R46C2/R[-2]C)" }), c({ v: "anos", s: "summary" }), c({ v: "Baseado no investimento total.", s: "note" })]));
  rows.push(r([c({ v: "Payback de caixa", s: "summary" }), c({ v: 0.88, t: "Number", s: "number", f: "=IF(R[-3]C=0,0,Entradas!R47C2/R[-3]C)" }), c({ v: "anos", s: "summary" }), c({ v: "Baseado apenas na entrada.", s: "note" })]));
  rows.push(r([c({ v: "Producao especifica", s: "summary" }), c({ v: 116.13, t: "Number", s: "number", f: "=IF(Entradas!R33C2=0,0,R[-21]C/Entradas!R33C2)" }), c({ v: "kWh/kWp.mes", s: "summary" }), c({ v: "Valida a simulacao.", s: "note" })]));
  rows.push(r([c({ v: "Cobertura do consumo anual", s: "summary" }), c({ v: 1, t: "Number", s: "percent", f: "=IF(Entradas!R19C2=0,0,MIN(Entradas!R37C2,Entradas!R19C2)/Entradas!R19C2)" }), c({ v: "", s: "summary" }), c({ v: "Capacidade de atendimento da carga.", s: "note" })]));
  rows.push(r([c({ v: "Fluxo anual apos parcela", s: "summary" }), c({ v: -412.32, t: "Number", s: "currency", f: "=R[-6]C-(Entradas!R51C2*12)" }), c({ v: "R$/ano", s: "summary" }), c({ v: "Ajuda a vender financiado com clareza.", s: "note" })]));
  return ws("Calculos", rows);
}

function buildFluxo25() {
  const rows = [
    r([c({ v: "Fluxo de caixa em 25 anos", s: "title", m: 13 })], ' ss:Height="28"'),
    r([c({ v: "Premissas: reajuste tarifario uniforme, degradacao anual e parcela fixa durante o financiamento", s: "subtitle", m: 13 })]),
    r(["Ano","Tarifa cheia","TUSD Fio B","Geracao anual","Consumo anual","Compensada","Importada","Fat. sem solar","Fat. com solar","Economia bruta","Parcela","Fluxo liquido","Fluxo acumulado","Status"].map((v)=>c({v,s:"section"}))),
    r([
      c({ v: 0, t: "Number", s: "integer" }),
      c({ v: 0.82, t: "Number", s: "currency", f: "=Entradas!R24C2" }),
      c({ v: 0.28, t: "Number", s: "currency", f: "=Entradas!R22C2" }),
      c({ v: 0, t: "Number", s: "number" }),
      c({ v: 0, t: "Number", s: "number" }),
      c({ v: 0, t: "Number", s: "number" }),
      c({ v: 0, t: "Number", s: "number" }),
      c({ v: 0, t: "Number", s: "currency" }),
      c({ v: 0, t: "Number", s: "currency" }),
      c({ v: 0, t: "Number", s: "currency" }),
      c({ v: 6000, t: "Number", s: "currency", f: "=Entradas!R47C2" }),
      c({ v: -6000, t: "Number", s: "currency", f: "=-RC[-1]" }),
      c({ v: -6000, t: "Number", s: "currency", f: "=RC[-1]" }),
      c({ v: "Entrada", s: "input" }),
    ]),
  ];
  for (let y = 1; y <= 25; y += 1) {
    rows.push(r([
      c({ v: y, t: "Number", s: "integer", f: "=R[-1]C+1" }),
      c({ v: 0.82, t: "Number", s: "currency", f: "=Entradas!R24C2*(1+Entradas!R40C2)^RC1" }),
      c({ v: 0.28, t: "Number", s: "currency", f: "=Entradas!R22C2*(1+Entradas!R40C2)^RC1" }),
      c({ v: 11413.2, t: "Number", s: "number", f: "=Entradas!R37C2*(1-Entradas!R39C2)^(RC1-1)" }),
      c({ v: 11400, t: "Number", s: "number", f: "=Entradas!R19C2" }),
      c({ v: 11400, t: "Number", s: "number", f: "=MIN(RC[-2],RC[-1])" }),
      c({ v: 0, t: "Number", s: "number", f: "=MAX(RC[-2]-RC[-3],0)" }),
      c({ v: 10214.16, t: "Number", s: "currency", f: "=MAX(RC[-3]*RC[-6],Entradas!R25C2*12)+Entradas!R26C2*12" }),
      c({ v: 2603.52, t: "Number", s: "currency", f: "=MAX(RC[-2]*RC[-7],Entradas!R25C2*12)+RC[-3]*RC[-6]*Entradas!R15C2+Entradas!R26C2*12" }),
      c({ v: 7610.64, t: "Number", s: "currency", f: "=RC[-2]-RC[-1]" }),
      c({ v: 7245.12, t: "Number", s: "currency", f: '=IF(RC1*12<=Entradas!R50C2,Entradas!R51C2*12,0)' }),
      c({ v: 365.52, t: "Number", s: "currency", f: "=RC[-2]-RC[-1]" }),
      c({ v: -5634.48, t: "Number", s: "currency", f: "=R[-1]C+RC[-1]" }),
      c({ v: "Operacao", s: "input", f: '=IF(RC1*12<=Entradas!R50C2,"Operacao + financiamento","Operacao")' }),
    ]));
  }
  return ws("Fluxo25", rows, [55, 85, 85, 90, 90, 95, 90, 95, 95, 90, 90, 90, 95, 135]);
}

function buildDashboard() {
  const rows = [
    r([c({ v: "Painel Comercial Diario", s: "title", m: 5 })], ' ss:Height="28"'),
    r([c({ v: "Leitura rapida para comercial, engenharia e financiamento", s: "subtitle", m: 5 })]),
    r([c({ v: "", s: "small", m: 5 })]),
    r([c({ v: "Potencia instalada", s: "kh", m: 1 }), c({ v: "Investimento total", s: "kh", m: 1, i: 3 }), c({ v: "Fio B aplicado", s: "kh", m: 1, i: 5 })]),
    r([c({ v: 8.19, t: "Number", s: "kv", f: "=Entradas!R33C2", m: 1 }), c({ v: 29755.5, t: "Number", s: "kvc", f: "=Entradas!R46C2", m: 1, i: 3 }), c({ v: 0.6, t: "Number", s: "kvp", f: "=Entradas!R15C2", m: 1, i: 5 })], ' ss:Height="34"'),
    r([c({ v: "", s: "small", m: 5 })]),
    r([c({ v: "Economia mensal", s: "kh", m: 1 }), c({ v: "Economia anual", s: "kh", m: 1, i: 3 }), c({ v: "Payback simples", s: "kh", m: 1, i: 5 })]),
    r([c({ v: 569.4, t: "Number", s: "kvc", f: "=Calculos!R22C2", m: 1 }), c({ v: 6832.8, t: "Number", s: "kvc", f: "=Calculos!R23C2", m: 1, i: 3 }), c({ v: 4.35, t: "Number", s: "kv", f: "=Calculos!R25C2", m: 1, i: 5 })], ' ss:Height="34"'),
    r([c({ v: "", s: "small", m: 5 })]),
    r([c({ v: "Fatura atual", s: "kh", m: 1 }), c({ v: "Fatura com solar", s: "kh", m: 1, i: 3 }), c({ v: "Reducao da conta", s: "kh", m: 1, i: 5 })]),
    r([c({ v: 803, t: "Number", s: "kvc", f: "=Entradas!R27C2", m: 1 }), c({ v: 233.6, t: "Number", s: "kvc", f: "=Calculos!R21C2", m: 1, i: 3 }), c({ v: 0.709, t: "Number", s: "kvp", f: "=Calculos!R24C2", m: 1, i: 5 })], ' ss:Height="34"'),
    r([c({ v: "", s: "small", m: 5 })]),
    r([c({ v: "Geracao anual", s: "kh", m: 1 }), c({ v: "Cobertura da carga", s: "kh", m: 1, i: 3 }), c({ v: "Parcela financiamento", s: "kh", m: 1, i: 5 })]),
    r([c({ v: 11413.2, t: "Number", s: "kv", f: "=Entradas!R37C2", m: 1 }), c({ v: 1, t: "Number", s: "kvp", f: "=Calculos!R28C2", m: 1, i: 3 }), c({ v: 603.76, t: "Number", s: "kvc", f: "=Entradas!R51C2", m: 1, i: 5 })], ' ss:Height="34"'),
    r([c({ v: "", s: "small", m: 5 })]),
    r([c({ v: "Indicadores de decisao", s: "section", m: 5 })]),
    r([c({ v: "Status regulatorio", s: "label" }), c({ v: "Atencao", s: "input", f: '=IF(Entradas!R15C2<=0.3,"Muito favoravel",IF(Entradas!R15C2<=0.6,"Atencao","Precifica bem o Fio B"))', m: 1 }), c({ v: "Caixa anual apos parcela", s: "label", i: 4 }), c({ v: -412.32, t: "Number", s: "currency", f: "=Calculos!R29C2", m: 1, i: 5 })]),
    r([c({ v: "Aderencia do dimensionamento", s: "label" }), c({ v: "Alta", s: "input", f: '=IF(Calculos!R28C2>=0.95,"Alta",IF(Calculos!R28C2>=0.8,"Boa","Revisar"))', m: 1 }), c({ v: "Economia bruta em 25 anos", s: "label", i: 4 }), c({ v: 264209.85, t: "Number", s: "currency", f: "=SUM(Fluxo25!R5C10:R29C10)", m: 1, i: 5 })]),
    r([c({ v: "Saldo acumulado final", s: "label" }), c({ v: 188994.25, t: "Number", s: "currency", f: "=Fluxo25!R29C13", m: 1 }), c({ v: "Observacao comercial", s: "label", i: 4 }), c({ v: "Atualize tarifas e enquadramento antes de enviar ao cliente.", s: "note", m: 1, i: 5 })]),
  ];
  return ws("Dashboard", rows, [120, 120, 25, 120, 25, 120]);
}

function buildProposta() {
  const rows = [];
  const add = (a, b, unit, note, bs = "input") => rows.push(r([c({ v: a, s: "label" }), c(b), c({ v: unit || "", s: bs }), c({ v: note, s: "note" })]));
  rows.push(r([c({ v: "Proposta Comercial Fotovoltaica", s: "title", m: 3 })], ' ss:Height="28"'));
  rows.push(r([c({ v: "Resumo pronto para apresentacao ao cliente final", s: "subtitle", m: 3 })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "Identificacao", s: "section", m: 3 })]));
  rows.push(r([c({ v: "Cliente", s: "label" }), c({ v: "Preencher nome do cliente", s: "input", f: "=Entradas!R5C2", m: 1 }), c({ v: "Campo puxado automaticamente.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "Projeto", s: "label" }), c({ v: "Sistema FV On-grid", s: "input", f: "=Entradas!R6C2", m: 1 }), c({ v: "Use esta aba como resumo executivo.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "Distribuidora", s: "label" }), c({ v: "Preencher distribuidora", s: "input", f: "=Entradas!R7C2", m: 1 }), c({ v: "Confirme tarifa e regras locais.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "Data da proposta", s: "label" }), c({ v: today, s: "input", m: 1 }), c({ v: "Atualize quando necessario.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "Validade sugerida", s: "label" }), c({ v: "15 dias", s: "input", m: 1 }), c({ v: "Ajuste conforme politica comercial.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "Resumo tecnico", s: "section", m: 3 })]));
  add("Potencia instalada", { v: 8.19, t: "Number", s: "number", f: "=Entradas!R33C2" }, "kWp", "Sistema dimensionado para o consumo informado.");
  add("Numero de modulos", { v: 14, t: "Number", s: "integer", f: "=Entradas!R32C2" }, "un", "Atualizado automaticamente.");
  add("Potencia do modulo", { v: 585, t: "Number", s: "number", f: "=Entradas!R31C2" }, "Wp", "Atualizado automaticamente.");
  rows.push(r([c({ v: "Geracao media mensal", s: "summary" }), c({ v: 951.1, t: "Number", s: "number", f: "=Entradas!R36C2" }), c({ v: "kWh/mes", s: "summary" }), c({ v: "Estimativa baseada em HSP e PR.", s: "note" })]));
  rows.push(r([c({ v: "Geracao anual", s: "summary" }), c({ v: 11413.2, t: "Number", s: "number", f: "=Entradas!R37C2" }), c({ v: "kWh/ano", s: "summary" }), c({ v: "Pode ser usada na narrativa comercial.", s: "note" })]));
  rows.push(r([c({ v: "Cobertura da carga", s: "summary" }), c({ v: 1, t: "Number", s: "percent", f: "=Calculos!R28C2" }), c({ v: "", s: "summary" }), c({ v: "Percentual do consumo anual atendido.", s: "note" })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "Resumo economico", s: "section", m: 3 })]));
  rows.push(r([c({ v: "Investimento total", s: "summary" }), c({ v: 29755.5, t: "Number", s: "currency", f: "=Entradas!R46C2" }), c({ v: "R$", s: "summary" }), c({ v: "CAPEX da proposta.", s: "note" })]));
  add("Entrada", { v: 6000, t: "Number", s: "currency", f: "=Entradas!R47C2" }, "R$", "Atualizado automaticamente.");
  add("Valor financiado", { v: 23755.5, t: "Number", s: "currency", f: "=Entradas!R48C2" }, "R$", "Atualizado automaticamente.");
  rows.push(r([c({ v: "Parcela estimada", s: "summary" }), c({ v: 603.76, t: "Number", s: "currency", f: "=Entradas!R51C2" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Se nao houver financiamento, zerar juros e prazo.", s: "note" })]));
  add("Fatura atual", { v: 803, t: "Number", s: "currency", f: "=Entradas!R27C2" }, "R$/mes", "Base sem sistema solar.");
  rows.push(r([c({ v: "Fatura com solar", s: "summary" }), c({ v: 233.6, t: "Number", s: "currency", f: "=Calculos!R21C2" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Inclui disponibilidade, CIP e Fio B.", s: "note" })]));
  rows.push(r([c({ v: "Economia mensal", s: "summary" }), c({ v: 569.4, t: "Number", s: "currency", f: "=Calculos!R22C2" }), c({ v: "R$/mes", s: "summary" }), c({ v: "Indicador principal da oferta.", s: "note" })]));
  rows.push(r([c({ v: "Economia anual", s: "summary" }), c({ v: 6832.8, t: "Number", s: "currency", f: "=Calculos!R23C2" }), c({ v: "R$/ano", s: "summary" }), c({ v: "Sem reajuste futuro.", s: "note" })]));
  rows.push(r([c({ v: "Payback simples", s: "summary" }), c({ v: 4.35, t: "Number", s: "number", f: "=Calculos!R25C2" }), c({ v: "anos", s: "summary" }), c({ v: "Retorno estimado com base no investimento total.", s: "note" })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "Enquadramento regulatorio", s: "section", m: 3 })]));
  add("Classe de enquadramento", { v: "GD II", s: "input", f: "=Entradas!R11C2" }, "", "Lei 14.300/2022.");
  add("Ano regulatorio", { v: 2026, t: "Number", s: "integer", f: "=Entradas!R12C2" }, "", "Base usada para o Fio B.");
  rows.push(r([c({ v: "Percentual Fio B aplicado", s: "summary" }), c({ v: 0.6, t: "Number", s: "percent", f: "=Entradas!R15C2" }), c({ v: "", s: "summary" }), c({ v: "Para GD II, em 2026 a planilha aplica 60% sobre o TUSD Fio B na energia compensada.", s: "note" })]));
  rows.push(r([c({ v: "Premissa legal", s: "label" }), c({ v: "GD I ate 07/01/2023 mantem 100% de compensacao ate 2045. GD II usa a transicao do art. 27. GD III deve ser validado caso a caso.", s: "note", m: 1 }), c({ v: "Revise sempre a regra da distribuidora.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "", s: "small", m: 3 })]));
  rows.push(r([c({ v: "Condicoes comerciais sugeridas", s: "section", m: 3 })]));
  rows.push(r([c({ v: "Escopo", s: "label" }), c({ v: "Projeto, homologacao, fornecimento de materiais e instalacao completa.", s: "input", m: 1 }), c({ v: "Ajuste conforme sua politica comercial.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "Forma de pagamento", s: "label" }), c({ v: "Entrada + saldo financiado ou a vista.", s: "input", m: 1 }), c({ v: "Pode ser customizado por cliente.", s: "note", i: 4 })]));
  rows.push(r([c({ v: "Observacao final", s: "label" }), c({ v: "Planilha de apoio comercial. Atualize tarifas, HSP, PR e preco/Wp antes do envio definitivo.", s: "note", m: 1 }), c({ v: "Aba Dashboard resume os principais indicadores.", s: "note", i: 4 })]));
  return ws("Proposta", rows);
}

const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>Codex</Author><LastAuthor>Codex</LastAuthor><Created>${today}T00:00:00Z</Created><Company>crm-solar</Company><Version>16.00</Version></DocumentProperties>
<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel"><WindowHeight>11835</WindowHeight><WindowWidth>21435</WindowWidth><ProtectStructure>False</ProtectStructure><ProtectWindows>False</ProtectWindows></ExcelWorkbook>
${styles}${buildProposta()}${buildEntradas()}${buildCalculos()}${buildFluxo25()}${buildDashboard()}</Workbook>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, workbook, "utf8");
console.log(`Planilha criada em: ${out}`);
