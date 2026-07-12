const TARIFA_ESTIMADA = 0.95;
const PRODUTIVIDADE_GOIAS = 150;

function numero(valor) {
  const parsed = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function calcularSolar() {
  const conta = numero(document.getElementById("calcConta")?.value);
  const consumoInformado = numero(document.getElementById("calcConsumo")?.value);
  const consumo = consumoInformado || (conta ? conta / TARIFA_ESTIMADA : 0);
  const potencia = consumo ? consumo / PRODUTIVIDADE_GOIAS : 0;

  document.getElementById("calcPotencia").textContent = potencia
    ? `${potencia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWp`
    : "-";
  document.getElementById("calcGeracao").textContent = consumo
    ? `${Math.round(consumo).toLocaleString("pt-BR")} kWh`
    : "-";
}

function preencherOrcamento() {
  const conta = document.getElementById("calcConta").value;
  const consumo = document.getElementById("calcConsumo").value;

  document.getElementById("leadConta").value = conta;
  document.getElementById("leadConsumo").value = consumo;
  document.getElementById("orcamento").scrollIntoView({ behavior: "smooth" });
}

function setStatus(texto, tipo) {
  const status = document.getElementById("formStatus");
  status.textContent = texto;
  status.className = `form-status ${tipo || ""}`;
}

async function enviarLead(event) {
  event.preventDefault();
  setStatus("Enviando solicitacao...", "");

  const form = event.currentTarget;
  const data = {
    nome: form.nome.value.trim(),
    telefone: form.telefone.value.trim(),
    email: form.email.value.trim(),
    cidade: form.cidade.value.trim(),
    servico: form.servico.value,
    conta_reais: form.conta_reais.value,
    consumo_kwh: form.consumo_kwh.value,
    mensagem: form.mensagem.value.trim(),
  };

  try {
    const response = await fetch("/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nao foi possivel enviar a solicitacao.");
    }

    setStatus("Solicitacao enviada. Vamos chamar voce pelo WhatsApp.", "ok");
    form.reset();
    calcularSolar();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Erro ao enviar. Tente pelo WhatsApp.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ["calcConta", "calcConsumo"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", calcularSolar);
  });
  document.getElementById("leadForm")?.addEventListener("submit", enviarLead);
  calcularSolar();
});
