const API = window.location.origin;
const TOKEN_KEY = "crm_dm_token";
const USER_KEY = "crm_dm_user";
const ROLE_LABELS = {
  admin: "Administrador",
  operador: "Operador",
  client: "Cliente",
};
let projetoDetalheAtual = null;
let projetosCache = [];
let usuariosCache = [];
let notificacoesCache = [];
let authToken = localStorage.getItem(TOKEN_KEY) || "";
let currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");

function setMensagem(elementId, message, type) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.className = type ? `texto-${type}` : "";
  element.textContent = message || "";
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role || "-";
}

function isAdmin() {
  return currentUser?.role === "admin";
}

function canManageUsers() {
  return isAdmin();
}

function canCreateProject() {
  return currentUser?.role === "admin" || currentUser?.role === "operador";
}

function canChangeStatus() {
  return currentUser?.role === "admin" || currentUser?.role === "operador";
}

function canDeleteProject() {
  return currentUser?.role === "admin" || currentUser?.role === "operador";
}

function salvarSessao(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function limparSessao() {
  authToken = "";
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function atualizarUsuarioAtual() {
  const usuarioAtual = document.getElementById("usuarioAtual");

  if (!usuarioAtual) {
    return;
  }

  usuarioAtual.textContent = currentUser ? `${currentUser.nome} (${roleLabel(currentUser.role)})` : "";
}

function atualizarPermissoesUI() {
  const botaoNovoProjeto = document.getElementById("botaoNovoProjeto");
  const botaoUsuarios = document.getElementById("botaoUsuarios");
  const painelAvisoSenha = document.getElementById("avisoTrocaSenha");
  const botaoExcluir = document.getElementById("botaoExcluirProjeto");

  if (botaoNovoProjeto) {
    botaoNovoProjeto.style.display = canCreateProject() ? "inline-flex" : "none";
  }

  if (botaoUsuarios) {
    botaoUsuarios.style.display = canManageUsers() ? "inline-flex" : "none";
  }

  if (painelAvisoSenha) {
    painelAvisoSenha.style.display = currentUser?.must_change_password ? "block" : "none";
  }

  if (botaoExcluir) {
    botaoExcluir.style.display = canDeleteProject() ? "inline-flex" : "none";
  }

  const ownerProjetoWrapper = document.getElementById("ownerProjetoWrapper");
  const detOwnerWrapper = document.getElementById("detOwnerWrapper");

  if (ownerProjetoWrapper) {
    ownerProjetoWrapper.style.display = isAdmin() ? "block" : "none";
  }

  if (detOwnerWrapper) {
    detOwnerWrapper.style.display = isAdmin() ? "block" : "none";
  }
}

function mostrarCRM() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("crm").style.display = "block";
  atualizarUsuarioAtual();
  atualizarPermissoesUI();
}

function mostrarLogin() {
  document.getElementById("loginBox").style.display = "flex";
  document.getElementById("crm").style.display = "none";
  fecharDetalhes();
  fecharModalUsuarios();
  fecharModalSenha();
  fecharModalNotificacoes();
  atualizarUsuarioAtual();
}

function mostrarPainelAuth(tipo) {
  const loginAtivo = tipo === "login";
  const cadastroAtivo = tipo === "cadastro";
  const recuperacaoAtiva = tipo === "recuperacao";

  document.getElementById("painelLogin").classList.toggle("ativo", loginAtivo);
  document.getElementById("painelCadastro").classList.toggle("ativo", cadastroAtivo);
  document.getElementById("painelRecuperacao").classList.toggle("ativo", recuperacaoAtiva);
  document.getElementById("tabLogin").classList.toggle("ativo", loginAtivo);
  document.getElementById("tabCadastro").classList.toggle("ativo", cadastroAtivo);
  document.getElementById("tabRecuperacao").classList.toggle("ativo", recuperacaoAtiva);
  document.getElementById("tabLogin").classList.toggle("secundario", !loginAtivo);
  document.getElementById("tabCadastro").classList.toggle("secundario", !cadastroAtivo);
  document.getElementById("tabRecuperacao").classList.toggle("secundario", !recuperacaoAtiva);
  setMensagem("mensagemLogin", "", "");
  setMensagem("mensagemCadastro", "", "");
  setMensagem("mensagemRecuperacao", "", "");
}

async function apiFetch(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    limparSessao();
    mostrarLogin();
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  return response;
}

async function bootstrapSessao() {
  if (!authToken) {
    mostrarLogin();
    return;
  }

  try {
    const response = await apiFetch("/me");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Sessao invalida.");
    }

    currentUser = data.user;
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    mostrarCRM();
    await carregarNotificacoes();
    await carregar();

    if (currentUser.must_change_password) {
      abrirModalSenha(true);
    }
  } catch (err) {
    console.error(err);
    limparSessao();
    mostrarLogin();
  }
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  try {
    const response = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMensagem("mensagemLogin", data.error || "Erro ao fazer login.", "erro");
      return;
    }

    salvarSessao(data.token, data.user);
    setMensagem("mensagemLogin", "", "");
    mostrarCRM();
    await carregarNotificacoes();
    await carregar();

    if (currentUser.must_change_password) {
      abrirModalSenha(true);
    }
  } catch (err) {
    console.error(err);
    setMensagem("mensagemLogin", "Erro ao conectar com o servidor.", "erro");
  }
}

async function registrarUsuario() {
  const nome = document.getElementById("cadastroNome").value.trim();
  const email = document.getElementById("cadastroEmail").value.trim();
  const password = document.getElementById("cadastroSenha").value.trim();

  try {
    const response = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao criar conta.");
    }

    document.getElementById("cadastroNome").value = "";
    document.getElementById("cadastroEmail").value = "";
    document.getElementById("cadastroSenha").value = "";
    mostrarPainelAuth("login");
    setMensagem("mensagemLogin", "Conta criada. Agora faca login.", "sucesso");
  } catch (err) {
    console.error(err);
    setMensagem("mensagemCadastro", err.message || "Erro ao criar conta.", "erro");
  }
}

async function solicitarRecuperacaoSenha() {
  const email = document.getElementById("recuperacaoEmail").value.trim();

  try {
    const response = await fetch(`${API}/password/forgot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao solicitar recuperacao.");
    }

    document.getElementById("recuperacaoEmail").value = "";
    setMensagem(
      "mensagemRecuperacao",
      "Pedido enviado. O administrador pode gerar uma senha temporaria para este email.",
      "sucesso"
    );
  } catch (err) {
    console.error(err);
    setMensagem("mensagemRecuperacao", err.message || "Erro ao solicitar recuperacao.", "erro");
  }
}

function logout() {
  limparSessao();
  projetosCache = [];
  usuariosCache = [];
  notificacoesCache = [];
  projetoDetalheAtual = null;
  renderProjetos([]);
  mostrarLogin();
}

function formatarValor(valor) {
  return valor === null || valor === undefined || valor === "" ? "-" : valor;
}

function formatarData(data) {
  return data ? new Date(data).toLocaleString("pt-BR") : "-";
}

function normalizarStatus(status) {
  return status === "Criando" ? "Tramitacao" : status;
}

function renderVazio(elementId, mensagem) {
  const element = document.getElementById(elementId);

  if (element) {
    element.innerHTML = `<div class="vazio">${mensagem}</div>`;
  }
}

async function carregar() {
  try {
    const response = await apiFetch("/projetos");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao carregar projetos.");
    }

    projetosCache = (isAdmin()
      ? data
      : data.filter(
          (projeto) =>
            String(projeto.created_by) === String(currentUser?.id) ||
            String(projeto.owner_email || "").toLowerCase() === String(currentUser?.email || "").toLowerCase()
        )).map((projeto) => ({
      ...projeto,
      status: normalizarStatus(projeto.status),
    }));
    aplicarFiltros();

    if (canManageUsers() && document.getElementById("usuariosOverlay").style.display === "block") {
      await carregarUsuarios();
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Nao foi possivel carregar projetos.");
  }
}

function atualizarBadgeNotificacoes() {
  const badge = document.getElementById("notificacoesBadge");

  if (!badge) {
    return;
  }

  const pendentes = notificacoesCache.filter((item) => !item.lida).length;
  badge.textContent = String(pendentes);
  badge.style.display = pendentes > 0 ? "inline-flex" : "none";
}

async function carregarNotificacoes() {
  try {
    const response = await apiFetch("/notificacoes");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao carregar notificacoes.");
    }

    notificacoesCache = data.notificacoes || [];
    atualizarBadgeNotificacoes();
    renderNotificacoes();
  } catch (err) {
    console.error(err);
  }
}

function renderNotificacoes() {
  const lista = document.getElementById("listaNotificacoes");

  if (!lista) {
    return;
  }

  if (!notificacoesCache.length) {
    lista.innerHTML = '<div class="vazio">Nenhuma notificacao por enquanto.</div>';
    return;
  }

  lista.innerHTML = notificacoesCache
    .map(
      (item) => `
        <div class="usuario-item">
          <strong>${item.titulo}</strong>
          <div class="usuario-meta">${item.mensagem}</div>
          <div class="usuario-meta">${formatarData(item.created_at)}</div>
          ${
            item.lida
              ? '<div class="usuario-meta">Lida</div>'
              : `<div class="acoes-modal"><button type="button" class="secundario" onclick="marcarNotificacaoLida(${item.id})">Marcar como lida</button></div>`
          }
        </div>
      `
    )
    .join("");
}

function abrirModalNotificacoes() {
  document.getElementById("notificacoesOverlay").style.display = "block";
  carregarNotificacoes();
}

function fecharModalNotificacoes() {
  document.getElementById("notificacoesOverlay").style.display = "none";
}

async function marcarNotificacaoLida(id) {
  try {
    const response = await apiFetch(`/notificacoes/${id}/lida`, {
      method: "PUT",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao marcar notificacao.");
    }

    notificacoesCache = notificacoesCache.map((item) => (item.id === id ? { ...item, lida: true } : item));
    atualizarBadgeNotificacoes();
    renderNotificacoes();
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao marcar notificacao.");
  }
}

async function garantirUsuariosCarregados() {
  if (!isAdmin()) {
    return [];
  }

  if (usuariosCache.length) {
    return usuariosCache;
  }

  const response = await apiFetch("/usuarios");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar usuarios.");
  }

  usuariosCache = data.usuarios || [];
  return usuariosCache;
}

function preencherSelectResponsavel(selectId, selectedId) {
  const select = document.getElementById(selectId);

  if (!select) {
    return;
  }

  if (!isAdmin()) {
    select.innerHTML = "";
    return;
  }

  const options = usuariosCache
    .filter((usuario) => usuario.ativo)
    .map((usuario) => {
      const selected = String(usuario.id) === String(selectedId) ? "selected" : "";
      return `<option value="${usuario.id}" ${selected}>${usuario.nome} - ${roleLabel(usuario.role)}</option>`;
    })
    .join("");

  select.innerHTML = options;
}

function renderProjetos(listaProjetos) {
  const colunas = {
    Documentacao: document.getElementById("Documentacao"),
    Tramitacao: document.getElementById("Tramitacao"),
    Analise: document.getElementById("Analise"),
    Aprovado: document.getElementById("Aprovado"),
    Finalizado: document.getElementById("Finalizado"),
  };

  Object.values(colunas).forEach((coluna) => {
    coluna.innerHTML = coluna.querySelector("h3").outerHTML;
  });

  listaProjetos.forEach((projeto) => {
    const card = document.createElement("div");
    card.className = "card";
    card.draggable = canChangeStatus();
    card.id = projeto.id;

    if (canChangeStatus()) {
      card.addEventListener("dragstart", drag);
    } else {
      card.classList.add("sem-arraste");
    }

    card.innerHTML = `
      <div class="card-header">
        <strong>${projeto.cliente_nome}</strong>
        <button class="card-link" type="button" onclick="abrirDetalhes(${projeto.id})">Detalhes</button>
      </div>
      <div class="card-detalhes">
        Cidade: ${formatarValor(projeto.cidade)}<br>
        Potencia: ${formatarValor(projeto.potencia)}<br>
        Vendedor: ${formatarValor(projeto.vendedor)}<br>
        Usuario: ${formatarValor(projeto.owner_name || projeto.owner_email)}
      </div>
    `;

    if (colunas[projeto.status]) {
      colunas[projeto.status].appendChild(card);
    }
  });
}

function aplicarFiltros() {
  const busca = (document.getElementById("buscaProjeto")?.value || "").trim().toLowerCase();
  const status = document.getElementById("filtroStatus")?.value || "";
  const vendedor = (document.getElementById("filtroVendedor")?.value || "").trim().toLowerCase();
  const clienteUsuario = (document.getElementById("filtroClienteUsuario")?.value || "").trim().toLowerCase();

  const filtrados = projetosCache.filter((projeto) => {
    const textoProjeto = [
      projeto.cliente_nome,
      projeto.cidade,
      projeto.email,
      projeto.documento,
      projeto.vendedor,
      projeto.owner_name,
      projeto.owner_email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!busca || textoProjeto.includes(busca)) &&
      (!status || projeto.status === status) &&
      (!vendedor || String(projeto.vendedor || "").toLowerCase().includes(vendedor)) &&
      (!clienteUsuario ||
        String(projeto.owner_name || projeto.owner_email || "").toLowerCase().includes(clienteUsuario))
    );
  });

  renderProjetos(filtrados);
}

function allowDrop(event) {
  if (!canChangeStatus()) {
    return;
  }

  event.preventDefault();
}

function drag(event) {
  event.dataTransfer.setData("id", event.target.closest(".card").id);
}

async function drop(event, status) {
  if (!canChangeStatus()) {
    return;
  }

  event.preventDefault();
  const id = event.dataTransfer.getData("id");

  try {
    const response = await apiFetch(`/projetos/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao atualizar status.");
    }

    await carregar();

    if (projetoDetalheAtual && String(projetoDetalheAtual) === String(id)) {
      await abrirDetalhes(id);
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Nao foi possivel atualizar o status.");
  }
}

function novoProjeto() {
  if (!canCreateProject()) {
    alert("Seu perfil nao pode criar projetos.");
    return;
  }

  if (isAdmin()) {
    garantirUsuariosCarregados()
      .then(() => preencherSelectResponsavel("ownerProjeto", currentUser?.id))
      .catch((err) => alert(err.message || "Erro ao carregar usuarios."));
  }

  document.getElementById("modal").style.display = "block";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}

async function salvarProjeto() {
  try {
    const response = await apiFetch("/projetos", {
      method: "POST",
      body: JSON.stringify({
        cliente_nome: document.getElementById("nome").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        email: document.getElementById("emailCliente").value.trim(),
        documento: document.getElementById("documento").value.trim(),
        cidade: document.getElementById("cidade").value.trim(),
        estado: document.getElementById("estado").value.trim(),
        potencia: document.getElementById("potencia").value.trim(),
        tipo: document.getElementById("tipo").value,
        ligacao: document.getElementById("ligacao").value,
        tensao: document.getElementById("tensao").value.trim(),
        concessionaria: document.getElementById("concessionaria").value.trim(),
        valor: document.getElementById("valor").value.trim(),
        vendedor: document.getElementById("vendedor").value.trim(),
        origem: document.getElementById("origem").value.trim(),
        owner_user_id: isAdmin() ? document.getElementById("ownerProjeto").value : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao salvar projeto.");
    }

    fecharModal();
    limparFormularioProjeto();
    await carregar();
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao salvar projeto.");
  }
}

function limparFormularioProjeto() {
  [
    "nome",
    "telefone",
    "emailCliente",
    "documento",
    "cidade",
    "estado",
    "potencia",
    "tensao",
    "concessionaria",
    "valor",
    "vendedor",
    "origem",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });

  document.getElementById("tipo").selectedIndex = 0;
  document.getElementById("ligacao").selectedIndex = 0;

  if (document.getElementById("ownerProjeto")) {
    document.getElementById("ownerProjeto").innerHTML = "";
  }
}

async function abrirDetalhes(id) {
  try {
    const response = await apiFetch(`/projetos/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao carregar detalhes.");
    }

    if (isAdmin()) {
      await garantirUsuariosCarregados();
    }

    projetoDetalheAtual = id;
    preencherDetalhes(data.projeto, data.historico, data.observacoes, data.documentos, data.documento_links || {});
    document.getElementById("detalheOverlay").style.display = "block";
    document.body.style.overflow = "hidden";
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao carregar detalhes do projeto.");
  }
}

function fecharDetalhes(event) {
  if (event && event.target && event.target.id !== "detalheOverlay") {
    return;
  }

  projetoDetalheAtual = null;
  document.getElementById("detalheOverlay").style.display = "none";
  document.getElementById("detalheObservacao").value = "";
  document.body.style.overflow = "";
}

function preencherDetalhes(projeto, historico, observacoes, documentos, documentoLinks) {
  document.getElementById("detalheTitulo").textContent = projeto.cliente_nome;
  document.getElementById("detalheStatus").textContent = `Status atual: ${formatarValor(projeto.status)}`;
  document.getElementById("detClienteNome").value = projeto.cliente_nome || "";
  document.getElementById("detTelefone").value = projeto.telefone || "";
  document.getElementById("detEmail").value = projeto.email || "";
  document.getElementById("detDocumento").value = projeto.documento || "";
  document.getElementById("detCidade").value = projeto.cidade || "";
  document.getElementById("detEstado").value = projeto.estado || "";
  document.getElementById("detPotencia").value = projeto.potencia || "";
  document.getElementById("detTipo").value = projeto.tipo || "";
  document.getElementById("detLigacao").value = projeto.ligacao || "";
  document.getElementById("detTensao").value = projeto.tensao || "";
  document.getElementById("detConcessionaria").value = projeto.concessionaria || "";
  document.getElementById("detValor").value = projeto.valor || "";
  document.getElementById("detVendedor").value = projeto.vendedor || "";
  document.getElementById("detOrigem").value = projeto.origem || "";
  document.getElementById("detalheStatus").textContent =
    `Status atual: ${formatarValor(projeto.status)} | Usuario: ${formatarValor(projeto.owner_name || projeto.owner_email)}`;
  preencherSelectResponsavel("detOwnerProjeto", projeto.created_by || currentUser?.id);
  document.getElementById("botaoExcluirProjeto").style.display = canDeleteProject() ? "inline-flex" : "none";
  preencherDocumentacao(documentos, documentoLinks);

  if (!historico.length) {
    renderVazio("detalheHistorico", "Nenhuma mudanca de status registrada ainda.");
  } else {
    document.getElementById("detalheHistorico").innerHTML = historico
      .map(
        (item) => `
          <div class="linha-item">
            <strong>${formatarValor(item.status_novo)}</strong>
            <div>Anterior: ${formatarValor(item.status_anterior)}</div>
            <div>Data: ${formatarData(item.created_at)}</div>
          </div>
        `
      )
      .join("");
  }

  if (!observacoes.length) {
    renderVazio("detalheObservacoes", "Nenhuma observacao cadastrada ainda.");
  } else {
    document.getElementById("detalheObservacoes").innerHTML = observacoes
      .map(
        (item) => `
          <div class="linha-item">
            <strong>${formatarData(item.created_at)}</strong>
            <div>${item.observacao}</div>
          </div>
        `
      )
      .join("");
  }
}

function preencherLinkDocumento(id, path, campo) {
  const botao = document.getElementById(id);

  if (!path) {
    botao.style.display = "none";
    botao.onclick = null;
    return;
  }

  botao.style.display = "inline-block";
  botao.onclick = () => abrirDocumento(campo);
}

function preencherBotaoRemover(id, hasFile) {
  const button = document.getElementById(id);
  if (button) {
    button.style.display = hasFile ? "inline-block" : "none";
  }
}

function limparArquivosDocumentacao() {
  [
    "docCnh",
    "docTalaoEnergia",
    "docProcuracao",
    "docBoletoTrt",
    "docDiagramaUnifilar",
    "docParecerAcesso",
    "docNumeroPoste",
    "docDisjuntorPadrao",
    "docPadraoAberto",
    "docPlacaEndereco",
    "docInversorInstalado",
    "docModulosInstalados",
    "docConexaoCa",
  ].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.value = "";
    }
  });
}

function preencherDocumentacao(documentos, documentoLinks) {
  document.getElementById("docLocalizacao").value = documentos?.localizacao || "";
  preencherLinkDocumento("linkCnh", documentoLinks.cnh, "cnh");
  preencherLinkDocumento("linkTalaoEnergia", documentoLinks.talao_energia, "talao_energia");
  preencherLinkDocumento("linkProcuracao", documentoLinks.procuracao, "procuracao");
  preencherLinkDocumento("linkBoletoTrt", documentoLinks.boleto_trt, "boleto_trt");
  preencherLinkDocumento("linkDiagramaUnifilar", documentoLinks.diagrama_unifilar, "diagrama_unifilar");
  preencherLinkDocumento("linkParecerAcesso", documentoLinks.parecer_acesso, "parecer_acesso");
  preencherLinkDocumento("linkNumeroPoste", documentoLinks.foto_numero_poste, "foto_numero_poste");
  preencherLinkDocumento("linkDisjuntorPadrao", documentoLinks.foto_disjuntor_padrao, "foto_disjuntor_padrao");
  preencherLinkDocumento("linkPadraoAberto", documentoLinks.foto_padrao_aberto, "foto_padrao_aberto");
  preencherLinkDocumento("linkPlacaEndereco", documentoLinks.foto_placa_endereco, "foto_placa_endereco");
  preencherLinkDocumento("linkInversorInstalado", documentoLinks.foto_inversor_instalado, "foto_inversor_instalado");
  preencherLinkDocumento("linkModulosInstalados", documentoLinks.foto_modulos_instalados, "foto_modulos_instalados");
  preencherLinkDocumento("linkConexaoCa", documentoLinks.foto_conexao_ca, "foto_conexao_ca");
  preencherBotaoRemover("removerCnh", Boolean(documentos?.cnh_path));
  preencherBotaoRemover("removerTalaoEnergia", Boolean(documentos?.talao_energia_path));
  preencherBotaoRemover("removerProcuracao", Boolean(documentos?.procuracao_path));
  preencherBotaoRemover("removerBoletoTrt", Boolean(documentos?.boleto_trt_path));
  preencherBotaoRemover("removerDiagramaUnifilar", Boolean(documentos?.diagrama_unifilar_path));
  preencherBotaoRemover("removerParecerAcesso", Boolean(documentos?.parecer_acesso_path));
  preencherBotaoRemover("removerNumeroPoste", Boolean(documentos?.foto_numero_poste_path));
  preencherBotaoRemover("removerDisjuntorPadrao", Boolean(documentos?.foto_disjuntor_padrao_path));
  preencherBotaoRemover("removerPadraoAberto", Boolean(documentos?.foto_padrao_aberto_path));
  preencherBotaoRemover("removerPlacaEndereco", Boolean(documentos?.foto_placa_endereco_path));
  preencherBotaoRemover("removerInversorInstalado", Boolean(documentos?.foto_inversor_instalado_path));
  preencherBotaoRemover("removerModulosInstalados", Boolean(documentos?.foto_modulos_instalados_path));
  preencherBotaoRemover("removerConexaoCa", Boolean(documentos?.foto_conexao_ca_path));
  limparArquivosDocumentacao();
}

async function abrirDocumento(campo) {
  if (!projetoDetalheAtual) {
    return;
  }

  try {
    const response = await apiFetch(`/projetos/${projetoDetalheAtual}/documentos/${campo}/download`);

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Erro ao abrir documento.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao abrir documento.");
  }
}

async function salvarEdicaoProjeto() {
  if (!projetoDetalheAtual) {
    alert("Nenhum projeto selecionado.");
    return;
  }

  try {
    const response = await apiFetch(`/projetos/${projetoDetalheAtual}/dados`, {
      method: "PUT",
      body: JSON.stringify({
        cliente_nome: document.getElementById("detClienteNome").value.trim(),
        telefone: document.getElementById("detTelefone").value.trim(),
        email: document.getElementById("detEmail").value.trim(),
        documento: document.getElementById("detDocumento").value.trim(),
        cidade: document.getElementById("detCidade").value.trim(),
        estado: document.getElementById("detEstado").value.trim(),
        potencia: document.getElementById("detPotencia").value.trim(),
        tipo: document.getElementById("detTipo").value,
        ligacao: document.getElementById("detLigacao").value,
        tensao: document.getElementById("detTensao").value.trim(),
        concessionaria: document.getElementById("detConcessionaria").value.trim(),
        valor: document.getElementById("detValor").value.trim(),
        vendedor: document.getElementById("detVendedor").value.trim(),
        origem: document.getElementById("detOrigem").value.trim(),
        owner_user_id: isAdmin() ? document.getElementById("detOwnerProjeto").value : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao salvar alteracoes.");
    }

    await carregar();
    await abrirDetalhes(projetoDetalheAtual);
    alert("Projeto atualizado com sucesso.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao salvar alteracoes.");
  }
}

async function salvarObservacao() {
  const observacao = document.getElementById("detalheObservacao").value.trim();

  if (!projetoDetalheAtual) {
    alert("Nenhum projeto selecionado.");
    return;
  }

  if (!observacao) {
    alert("Escreva uma observacao antes de salvar.");
    return;
  }

  try {
    const response = await apiFetch(`/projetos/${projetoDetalheAtual}/observacoes`, {
      method: "POST",
      body: JSON.stringify({ observacao }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao salvar observacao.");
    }

    document.getElementById("detalheObservacao").value = "";
    await abrirDetalhes(projetoDetalheAtual);
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao salvar observacao.");
  }
}

async function excluirProjeto() {
  if (!canDeleteProject()) {
    alert("Seu perfil nao pode excluir projetos.");
    return;
  }

  if (!projetoDetalheAtual) {
    alert("Nenhum projeto selecionado.");
    return;
  }

  if (!window.confirm("Tem certeza que deseja excluir este projeto?")) {
    return;
  }

  try {
    const response = await apiFetch(`/projetos/${projetoDetalheAtual}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao excluir projeto.");
    }

    fecharDetalhes();
    await carregar();
    alert("Projeto excluido com sucesso.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao excluir projeto.");
  }
}

async function salvarDocumentacao() {
  if (!projetoDetalheAtual) {
    alert("Nenhum projeto selecionado.");
    return;
  }

  try {
    const formData = new FormData();
    const camposArquivo = [
      ["cnh", "docCnh"],
      ["talao_energia", "docTalaoEnergia"],
      ["procuracao", "docProcuracao"],
      ["boleto_trt", "docBoletoTrt"],
      ["diagrama_unifilar", "docDiagramaUnifilar"],
      ["parecer_acesso", "docParecerAcesso"],
      ["foto_numero_poste", "docNumeroPoste"],
      ["foto_disjuntor_padrao", "docDisjuntorPadrao"],
      ["foto_padrao_aberto", "docPadraoAberto"],
      ["foto_placa_endereco", "docPlacaEndereco"],
      ["foto_inversor_instalado", "docInversorInstalado"],
      ["foto_modulos_instalados", "docModulosInstalados"],
      ["foto_conexao_ca", "docConexaoCa"],
    ];

    camposArquivo.forEach(([campoApi, campoTela]) => {
      const file = document.getElementById(campoTela).files[0];
      if (file) {
        formData.append(campoApi, file);
      }
    });

    formData.append("localizacao", document.getElementById("docLocalizacao").value.trim());

    const response = await apiFetch(`/projetos/${projetoDetalheAtual}/documentos`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao salvar documentacao.");
    }

    await abrirDetalhes(projetoDetalheAtual);
    alert("Documentacao atualizada com sucesso.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao salvar documentacao.");
  }
}

async function removerDocumento(campo) {
  if (!projetoDetalheAtual) {
    alert("Nenhum projeto selecionado.");
    return;
  }

  if (!window.confirm("Deseja remover somente este documento?")) {
    return;
  }

  try {
    const response = await apiFetch(`/projetos/${projetoDetalheAtual}/documentos/${campo}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao remover documento.");
    }

    await abrirDetalhes(projetoDetalheAtual);
    alert("Documento removido com sucesso.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao remover documento.");
  }
}

function abrirModalSenha(force = false) {
  document.getElementById("senhaOverlay").style.display = "block";
  document.getElementById("senhaAtual").value = "";
  document.getElementById("senhaNova").value = "";
  document.getElementById("senhaNovaConfirmacao").value = "";
  document.getElementById("senhaOverlay").dataset.force = force ? "true" : "false";
  setMensagem(
    "mensagemSenha",
    force ? "Voce recebeu uma senha temporaria. Troque agora para continuar usando com seguranca." : "",
    force ? "sucesso" : ""
  );
}

function fecharModalSenha() {
  const force = document.getElementById("senhaOverlay").dataset.force === "true";

  if (force) {
    return;
  }

  document.getElementById("senhaOverlay").style.display = "none";
  document.getElementById("senhaOverlay").dataset.force = "false";
  setMensagem("mensagemSenha", "", "");
}

async function alterarSenha() {
  const currentPassword = document.getElementById("senhaAtual").value.trim();
  const newPassword = document.getElementById("senhaNova").value.trim();
  const confirmPassword = document.getElementById("senhaNovaConfirmacao").value.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    setMensagem("mensagemSenha", "Preencha todos os campos da troca de senha.", "erro");
    return;
  }

  if (newPassword !== confirmPassword) {
    setMensagem("mensagemSenha", "A confirmacao da nova senha nao confere.", "erro");
    return;
  }

  try {
    const response = await apiFetch("/me/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao alterar senha.");
    }

    currentUser = { ...currentUser, ...data.user };
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    atualizarUsuarioAtual();
    atualizarPermissoesUI();
    document.getElementById("senhaOverlay").dataset.force = "false";
    setMensagem("mensagemSenha", "Senha alterada com sucesso.", "sucesso");
    setTimeout(() => {
      document.getElementById("senhaOverlay").style.display = "none";
      setMensagem("mensagemSenha", "", "");
    }, 800);
  } catch (err) {
    console.error(err);
    setMensagem("mensagemSenha", err.message || "Erro ao alterar senha.", "erro");
  }
}

async function carregarUsuarios() {
  try {
    const response = await apiFetch("/usuarios");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao carregar usuarios.");
    }

    usuariosCache = data.usuarios || [];
    renderUsuarios();
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao carregar usuarios.");
  }
}

function renderUsuarios() {
  const lista = document.getElementById("listaUsuarios");

  if (!usuariosCache.length) {
    lista.innerHTML = '<div class="vazio">Nenhum usuario cadastrado.</div>';
    return;
  }

  lista.innerHTML = usuariosCache
    .map(
      (usuario) => `
        <div class="usuario-item">
          <div class="usuario-linha">
            <div>
              <strong>${usuario.nome}</strong>
              <div>${usuario.email}</div>
              <div class="usuario-meta">
                Perfil: ${roleLabel(usuario.role)} | Status: ${usuario.ativo ? "Ativo" : "Inativo"}${
                  usuario.reset_requested_at ? ` | Recuperacao pedida em ${formatarData(usuario.reset_requested_at)}` : ""
                }
              </div>
            </div>
            <div class="usuario-acoes">
              <select id="roleUsuario${usuario.id}">
                <option value="admin" ${usuario.role === "admin" ? "selected" : ""}>Administrador</option>
                <option value="operador" ${usuario.role === "operador" ? "selected" : ""}>Operador</option>
                <option value="client" ${usuario.role === "client" ? "selected" : ""}>Cliente</option>
              </select>
              <select id="ativoUsuario${usuario.id}">
                <option value="true" ${usuario.ativo ? "selected" : ""}>Ativo</option>
                <option value="false" ${!usuario.ativo ? "selected" : ""}>Inativo</option>
              </select>
              <button type="button" class="secundario" onclick="salvarUsuario(${usuario.id})">Salvar perfil</button>
              <button type="button" onclick="gerarSenhaTemporaria(${usuario.id})">Gerar senha temporaria</button>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

async function abrirModalUsuarios() {
  if (!canManageUsers()) {
    return;
  }

  document.getElementById("usuariosOverlay").style.display = "block";
  await carregarUsuarios();
}

function fecharModalUsuarios() {
  document.getElementById("usuariosOverlay").style.display = "none";
}

async function salvarUsuario(userId) {
  try {
    const role = document.getElementById(`roleUsuario${userId}`).value;
    const ativo = document.getElementById(`ativoUsuario${userId}`).value === "true";
    const response = await apiFetch(`/usuarios/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role, ativo }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao atualizar usuario.");
    }

    await carregarUsuarios();
    alert("Perfil do usuario atualizado com sucesso.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao atualizar usuario.");
  }
}

async function gerarSenhaTemporaria(userId) {
  if (!window.confirm("Deseja gerar uma senha temporaria para este usuario?")) {
    return;
  }

  try {
    const response = await apiFetch(`/usuarios/${userId}/reset-password`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao gerar senha temporaria.");
    }

    await carregarUsuarios();
    alert(`Senha temporaria de ${data.usuario.nome}: ${data.temporary_password}`);
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao gerar senha temporaria.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrapSessao();
});
