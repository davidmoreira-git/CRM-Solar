require("dotenv").config();

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { initializeDatabase } = require("./db/init");

const app = express();
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, "uploads"));
const JWT_SECRET = process.env.JWT_SECRET || "troque-este-segredo-em-producao";
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || "7d";
const STATUS_PADRAO = "Documentacao";
const STATUS_VALIDOS = ["Documentacao", "Criando", "Analise", "Aprovado", "Finalizado"];
const ROLE_PERMISSIONS = {
  admin: {
    viewAllProjects: true,
    createProject: true,
    changeStatus: true,
    deleteProject: true,
    manageUsers: true,
  },
  operador: {
    viewAllProjects: false,
    createProject: true,
    changeStatus: true,
    deleteProject: true,
    manageUsers: false,
  },
  client: {
    viewAllProjects: false,
    createProject: false,
    changeStatus: false,
    deleteProject: false,
    manageUsers: false,
  },
};

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeField = file.fieldname.replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}-${safeField}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Apenas arquivos PDF, PNG e JPG sao permitidos."));
      return;
    }

    cb(null, true);
  },
});

const DOCUMENT_FIELD_MAP = {
  cnh: "cnh_path",
  talao_energia: "talao_energia_path",
  procuracao: "procuracao_path",
  boleto_trt: "boleto_trt_path",
  diagrama_unifilar: "diagrama_unifilar_path",
  parecer_acesso: "parecer_acesso_path",
  foto_numero_poste: "foto_numero_poste_path",
  foto_disjuntor_padrao: "foto_disjuntor_padrao_path",
  foto_padrao_aberto: "foto_padrao_aberto_path",
  foto_placa_endereco: "foto_placa_endereco_path",
  foto_inversor_instalado: "foto_inversor_instalado_path",
  foto_modulos_instalados: "foto_modulos_instalados_path",
  foto_conexao_ca: "foto_conexao_ca_path",
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((acc, item) => {
    const [rawKey, ...rawValue] = item.trim().split("=");
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies.token || null;
}

function buildToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      nome: user.nome,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function sendAuthPayload(res, user) {
  return res.json({
    token: buildToken(user),
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
    },
  });
}

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.client;
}

function hasPermission(user, permission) {
  return Boolean(getRolePermissions(user.role)[permission]);
}

function ensurePermission(user, permission) {
  return hasPermission(user, permission)
    ? null
    : { status: 403, error: "Voce nao tem permissao para esta acao." };
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function buildTemporaryPassword() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapProjeto(row) {
  return {
    id: row.id,
    cliente_nome: row.cliente_nome,
    telefone: row.telefone,
    email: row.email,
    documento: row.documento,
    cidade: row.cidade,
    estado: row.estado,
    potencia: row.potencia_kwp,
    tipo: row.tipo_consumidor,
    ligacao: row.tipo_ligacao,
    tensao: row.tensao,
    concessionaria: row.concessionaria,
    valor: row.valor_projeto,
    vendedor: row.vendedor_nome,
    origem: row.origem_lead,
    status: row.status_atual,
    created_by: row.created_by,
    owner_name: row.owner_name || null,
    owner_email: row.owner_email || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildProjetoValues(body, ownerName) {
  return [
    body.cliente_nome,
    body.telefone || null,
    body.email || null,
    body.documento || null,
    body.cidade || null,
    body.estado || null,
    normalizeNumber(body.potencia),
    body.tipo || null,
    body.ligacao || null,
    body.tensao || null,
    body.concessionaria || null,
    normalizeNumber(body.valor),
    body.vendedor || ownerName || null,
    body.origem || null,
  ];
}

function normalizeFilePath(file) {
  return file ? `/uploads/${path.basename(file.path)}` : null;
}

function resolveUploadPath(publicPath) {
  if (!publicPath) {
    return null;
  }

  return path.join(UPLOADS_DIR, path.basename(publicPath));
}

function deleteStoredFile(publicPath) {
  const absolutePath = resolveUploadPath(publicPath);
  if (absolutePath && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function buildProtectedDocumentLinks(projectId, documentos) {
  if (!documentos) {
    return null;
  }

  return Object.keys(DOCUMENT_FIELD_MAP).reduce((acc, campo) => {
    if (documentos[DOCUMENT_FIELD_MAP[campo]]) {
      acc[campo] = `/projetos/${projectId}/documentos/${campo}/download`;
    }

    return acc;
  }, {});
}

async function createStatusHistory(client, projetoId, statusAnterior, statusNovo, changedBy) {
  await client.query(
    `INSERT INTO projeto_status_historico
      (projeto_id, status_anterior, status_novo, changed_by)
     VALUES
      ($1, $2, $3, $4)`,
    [projetoId, statusAnterior, statusNovo, changedBy || null]
  );
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, nome, email, role, ativo, must_change_password, reset_requested_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

async function authRequired(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: "Autenticacao obrigatoria." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.id);

    if (!user || !user.ativo) {
      return res.status(401).json({ error: "Sessao invalida ou expirada." });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Sessao invalida ou expirada." });
  }
}

async function getProjetoAcessivel(projectId, user) {
  const result = await pool.query(
    `SELECT
       id,
       cliente_nome,
       telefone,
       email,
       documento,
       cidade,
       estado,
       potencia_kwp,
       tipo_consumidor,
       tipo_ligacao,
       tensao,
       concessionaria,
       valor_projeto,
       vendedor_nome,
       origem_lead,
       status_atual,
       created_by,
       (SELECT nome FROM users WHERE users.id = projetos.created_by) AS owner_name,
       (SELECT email FROM users WHERE users.id = projetos.created_by) AS owner_email,
       created_at,
       updated_at
     FROM projetos
     WHERE id = $1`,
    [projectId]
  );

  const projeto = result.rows[0];

  if (!projeto) {
    return { status: 404, error: "Projeto nao encontrado." };
  }

  if (!hasPermission(user, "viewAllProjects") && Number(projeto.created_by) !== Number(user.id)) {
    return { status: 403, error: "Voce nao tem acesso a este projeto." };
  }

  return { projeto };
}

async function getActiveAdminCount(excludeUserId = null) {
  const params = [];
  let whereClause = "WHERE role = 'admin' AND ativo = TRUE";

  if (excludeUserId !== null && excludeUserId !== undefined) {
    params.push(excludeUserId);
    whereClause += ` AND id <> $${params.length}`;
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM users
     ${whereClause}`,
    params
  );

  return result.rows[0].total;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.post("/register", async (req, res) => {
  const { nome, email, password } = req.body;

  try {
    if (!nome || !email || !password) {
      return res.status(400).json({ error: "Nome, email e senha sao obrigatorios." });
    }

    const hash = await bcrypt.hash(password, 10);
    const countResult = await pool.query("SELECT COUNT(*)::int AS total FROM users");
    const role = countResult.rows[0].total === 0 ? "admin" : "client";

    const result = await pool.query(
      `INSERT INTO users (nome, email, password_hash, role, must_change_password, last_password_change_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW())
       RETURNING id, nome, email, role, ativo, must_change_password, created_at`,
      [nome, email, hash, role]
    );

    return res.status(201).json({
      message: "Usuario criado com sucesso.",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar usuario:", err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Ja existe um usuario com este email." });
    }

    return res.status(400).json({ error: "Erro ao criar usuario." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha sao obrigatorios." });
    }

    const result = await pool.query(
      `SELECT id, nome, email, password_hash, role, ativo, must_change_password
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario nao encontrado." });
    }

    const user = result.rows[0];

    if (!user.ativo) {
      return res.status(403).json({ error: "Usuario inativo." });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordIsValid) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    return sendAuthPayload(res, user);
  } catch (err) {
    console.error("Erro ao fazer login:", err);
    return res.status(500).json({ error: "Erro interno ao fazer login." });
  }
});

app.get("/me", authRequired, async (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      nome: req.user.nome,
      email: req.user.email,
      role: req.user.role,
      must_change_password: Boolean(req.user.must_change_password),
      reset_requested_at: req.user.reset_requested_at,
    },
  });
});

app.post("/password/forgot", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();

  try {
    if (!email) {
      return res.status(400).json({ error: "Informe o email para solicitar a recuperacao." });
    }

    await pool.query(
      `UPDATE users
       SET reset_requested_at = NOW(), updated_at = NOW()
       WHERE email = $1 AND ativo = TRUE`,
      [email]
    );

    return res.json({
      message: "Pedido registrado. Um administrador pode gerar uma senha temporaria para este usuario.",
    });
  } catch (err) {
    console.error("Erro ao solicitar recuperacao de senha:", err);
    return res.status(500).json({ error: "Erro ao solicitar recuperacao de senha." });
  }
});

app.post("/me/change-password", authRequired, async (req, res) => {
  const currentPassword = String(req.body?.current_password || "");
  const newPassword = String(req.body?.new_password || "");

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Senha atual e nova senha sao obrigatorias." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    }

    const result = await pool.query(
      `SELECT id, password_hash
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    const passwordIsValid = user ? await bcrypt.compare(currentPassword, user.password_hash) : false;

    if (!passwordIsValid) {
      return res.status(401).json({ error: "Senha atual incorreta." });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = FALSE,
           reset_requested_at = NULL,
           last_password_change_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [hash, req.user.id]
    );

    const updatedUser = await getUserById(req.user.id);
    return res.json({
      message: "Senha atualizada com sucesso.",
      user: {
        id: updatedUser.id,
        nome: updatedUser.nome,
        email: updatedUser.email,
        role: updatedUser.role,
        must_change_password: Boolean(updatedUser.must_change_password),
      },
    });
  } catch (err) {
    console.error("Erro ao alterar senha:", err);
    return res.status(500).json({ error: "Erro ao alterar senha." });
  }
});

app.get("/usuarios", authRequired, async (req, res) => {
  const permissionError = ensurePermission(req.user, "manageUsers");

  if (permissionError) {
    return res.status(permissionError.status).json({ error: permissionError.error });
  }

  try {
    const result = await pool.query(
      `SELECT
         id,
         nome,
         email,
         role,
         ativo,
         must_change_password,
         reset_requested_at,
         created_at,
         updated_at
       FROM users
       ORDER BY created_at ASC`
    );

    return res.json({ usuarios: result.rows });
  } catch (err) {
    console.error("Erro ao listar usuarios:", err);
    return res.status(500).json({ error: "Erro ao listar usuarios." });
  }
});

app.put("/usuarios/:id", authRequired, async (req, res) => {
  const permissionError = ensurePermission(req.user, "manageUsers");

  if (permissionError) {
    return res.status(permissionError.status).json({ error: permissionError.error });
  }

  const userId = Number(req.params.id);
  const role = normalizeRole(req.body?.role);
  const ativo = req.body?.ativo;

  try {
    const userResult = await pool.query(
      `SELECT id, role, ativo
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const targetUser = userResult.rows[0];

    if (!targetUser) {
      return res.status(404).json({ error: "Usuario nao encontrado." });
    }

    if (!["admin", "operador", "client"].includes(role)) {
      return res.status(400).json({ error: "Perfil invalido." });
    }

    if (typeof ativo !== "boolean") {
      return res.status(400).json({ error: "Informe se o usuario estara ativo ou inativo." });
    }

    if (Number(req.user.id) === userId && (role !== "admin" || !ativo)) {
      return res.status(400).json({ error: "Voce nao pode remover seu proprio acesso de administrador." });
    }

    if ((targetUser.role === "admin" && role !== "admin") || (targetUser.role === "admin" && !ativo)) {
      const otherActiveAdmins = await getActiveAdminCount(userId);

      if (otherActiveAdmins === 0) {
        return res.status(400).json({ error: "O sistema precisa manter pelo menos um administrador ativo." });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET role = $1,
           ativo = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, nome, email, role, ativo, must_change_password, reset_requested_at, created_at, updated_at`,
      [role, ativo, userId]
    );

    return res.json({
      message: "Usuario atualizado com sucesso.",
      usuario: result.rows[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar usuario:", err);
    return res.status(500).json({ error: "Erro ao atualizar usuario." });
  }
});

app.post("/usuarios/:id/reset-password", authRequired, async (req, res) => {
  const permissionError = ensurePermission(req.user, "manageUsers");

  if (permissionError) {
    return res.status(permissionError.status).json({ error: permissionError.error });
  }

  const userId = Number(req.params.id);

  try {
    const userResult = await pool.query(
      `SELECT id, nome, email
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const targetUser = userResult.rows[0];

    if (!targetUser) {
      return res.status(404).json({ error: "Usuario nao encontrado." });
    }

    const temporaryPassword = buildTemporaryPassword();
    const hash = await bcrypt.hash(temporaryPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = TRUE,
           reset_requested_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [hash, userId]
    );

    return res.json({
      message: "Senha temporaria gerada com sucesso.",
      temporary_password: temporaryPassword,
      usuario: targetUser,
    });
  } catch (err) {
    console.error("Erro ao redefinir senha do usuario:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha do usuario." });
  }
});

app.get("/projetos", authRequired, async (req, res) => {
  try {
    const canViewAll = hasPermission(req.user, "viewAllProjects");
    const params = canViewAll ? [] : [req.user.id];
    const whereClause = canViewAll ? "" : "WHERE created_by = $1";

    const result = await pool.query(
      `SELECT
         id,
         cliente_nome,
         telefone,
         email,
         documento,
         cidade,
         estado,
         potencia_kwp,
         tipo_consumidor,
         tipo_ligacao,
         tensao,
         concessionaria,
         valor_projeto,
         vendedor_nome,
         origem_lead,
         status_atual,
         created_by,
         (SELECT nome FROM users WHERE users.id = projetos.created_by) AS owner_name,
         (SELECT email FROM users WHERE users.id = projetos.created_by) AS owner_email,
         created_at,
         updated_at
       FROM projetos
       ${whereClause}
       ORDER BY id DESC`,
      params
    );

    return res.json(result.rows.map(mapProjeto));
  } catch (err) {
    console.error("Erro ao listar projetos:", err);
    return res.status(500).json({ error: "Erro ao listar projetos." });
  }
});

app.get("/projetos/:id", authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    const historicoResult = await pool.query(
      `SELECT id, status_anterior, status_novo, observacao, changed_by, created_at
       FROM projeto_status_historico
       WHERE projeto_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const observacoesResult = await pool.query(
      `SELECT id, observacao, created_by, created_at
       FROM projeto_observacoes
       WHERE projeto_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const documentosResult = await pool.query(
      `SELECT
         projeto_id,
         cnh_path,
         talao_energia_path,
         procuracao_path,
         boleto_trt_path,
         diagrama_unifilar_path,
         parecer_acesso_path,
         foto_numero_poste_path,
         foto_disjuntor_padrao_path,
         foto_padrao_aberto_path,
         foto_placa_endereco_path,
         foto_inversor_instalado_path,
         foto_modulos_instalados_path,
         foto_conexao_ca_path,
         localizacao,
         updated_at
       FROM projeto_documentos
       WHERE projeto_id = $1`,
      [id]
    );

    const documentos = documentosResult.rows[0] || null;

    return res.json({
      projeto: mapProjeto(acesso.projeto),
      historico: historicoResult.rows,
      observacoes: observacoesResult.rows,
      documentos,
      documento_links: buildProtectedDocumentLinks(id, documentos),
    });
  } catch (err) {
    console.error("Erro ao buscar projeto:", err);
    return res.status(500).json({ error: "Erro ao buscar projeto." });
  }
});

app.post("/projetos", authRequired, async (req, res) => {
  const { cliente_nome } = req.body;
  const client = await pool.connect();

  try {
    const permissionError = ensurePermission(req.user, "createProject");

    if (permissionError) {
      return res.status(permissionError.status).json({ error: permissionError.error });
    }

    if (!cliente_nome) {
      return res.status(400).json({ error: "O nome do cliente e obrigatorio." });
    }

    await client.query("BEGIN");

    const projetoResult = await client.query(
      `INSERT INTO projetos
      (
        cliente_nome,
        telefone,
        email,
        documento,
        cidade,
        estado,
        potencia_kwp,
        tipo_consumidor,
        tipo_ligacao,
        tensao,
        concessionaria,
        valor_projeto,
        vendedor_nome,
        origem_lead,
        status_atual,
        created_by
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING
        id,
        cliente_nome,
        telefone,
        email,
        documento,
        cidade,
        estado,
        potencia_kwp,
        tipo_consumidor,
        tipo_ligacao,
        tensao,
        concessionaria,
        valor_projeto,
        vendedor_nome,
        origem_lead,
        status_atual,
        created_by,
        NULL::VARCHAR AS owner_name,
        NULL::VARCHAR AS owner_email,
        created_at,
        updated_at`,
      [...buildProjetoValues(req.body, req.user.nome), STATUS_PADRAO, req.user.id]
    );

    await createStatusHistory(client, projetoResult.rows[0].id, null, STATUS_PADRAO, req.user.id);
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Projeto criado com sucesso.",
      projeto: mapProjeto({
        ...projetoResult.rows[0],
        owner_name: req.user.nome,
        owner_email: req.user.email,
      }),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar projeto:", err);
    return res.status(500).json({ error: "Erro ao criar projeto." });
  } finally {
    client.release();
  }
});

app.put("/projetos/:id/dados", authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    if (!req.body.cliente_nome) {
      return res.status(400).json({ error: "O nome do cliente e obrigatorio." });
    }

    const result = await pool.query(
      `UPDATE projetos
       SET
         cliente_nome = $1,
         telefone = $2,
         email = $3,
         documento = $4,
         cidade = $5,
         estado = $6,
         potencia_kwp = $7,
         tipo_consumidor = $8,
         tipo_ligacao = $9,
         tensao = $10,
         concessionaria = $11,
         valor_projeto = $12,
         vendedor_nome = $13,
         origem_lead = $14,
         updated_at = NOW()
       WHERE id = $15
      RETURNING
         id,
         cliente_nome,
         telefone,
         email,
         documento,
         cidade,
         estado,
         potencia_kwp,
         tipo_consumidor,
         tipo_ligacao,
         tensao,
         concessionaria,
         valor_projeto,
         vendedor_nome,
         origem_lead,
         status_atual,
         created_by,
         (SELECT nome FROM users WHERE users.id = projetos.created_by) AS owner_name,
         (SELECT email FROM users WHERE users.id = projetos.created_by) AS owner_email,
         created_at,
         updated_at`,
      [...buildProjetoValues(req.body, acesso.projeto.vendedor_nome || req.user.nome), id]
    );

    return res.json({
      message: "Projeto atualizado com sucesso.",
      projeto: mapProjeto(result.rows[0]),
    });
  } catch (err) {
    console.error("Erro ao atualizar dados do projeto:", err);
    return res.status(500).json({ error: "Erro ao atualizar dados do projeto." });
  }
});

app.delete("/projetos/:id", authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const permissionError = ensurePermission(req.user, "deleteProject");

    if (permissionError) {
      return res.status(permissionError.status).json({ error: permissionError.error });
    }

    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    const documentosResult = await pool.query(
      "SELECT * FROM projeto_documentos WHERE projeto_id = $1",
      [id]
    );

    const documentos = documentosResult.rows[0];
    if (documentos) {
      Object.values(DOCUMENT_FIELD_MAP).forEach((coluna) => {
        if (documentos[coluna]) {
          deleteStoredFile(documentos[coluna]);
        }
      });
    }

    const result = await pool.query(
      `DELETE FROM projetos
       WHERE id = $1
       RETURNING id, cliente_nome`,
      [id]
    );

    return res.json({
      message: "Projeto excluido com sucesso.",
      projeto: result.rows[0],
    });
  } catch (err) {
    console.error("Erro ao excluir projeto:", err);
    return res.status(500).json({ error: "Erro ao excluir projeto." });
  }
});

app.put("/projetos/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const client = await pool.connect();

  try {
    const permissionError = ensurePermission(req.user, "changeStatus");

    if (permissionError) {
      return res.status(permissionError.status).json({ error: permissionError.error });
    }

    if (!status) {
      return res.status(400).json({ error: "O status e obrigatorio." });
    }

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: "Status invalido." });
    }

    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    await client.query("BEGIN");

    const updateResult = await client.query(
      `UPDATE projetos
       SET status_atual = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         cliente_nome,
         telefone,
         email,
         documento,
         cidade,
         estado,
         potencia_kwp,
         tipo_consumidor,
         tipo_ligacao,
         tensao,
         concessionaria,
         valor_projeto,
         vendedor_nome,
         origem_lead,
         status_atual,
         created_by,
         (SELECT nome FROM users WHERE users.id = projetos.created_by) AS owner_name,
         (SELECT email FROM users WHERE users.id = projetos.created_by) AS owner_email,
         created_at,
         updated_at`,
      [status, id]
    );

    if (acesso.projeto.status_atual !== status) {
      await createStatusHistory(client, id, acesso.projeto.status_atual, status, req.user.id);
    }

    await client.query("COMMIT");

    return res.json({
      message: "Status atualizado com sucesso.",
      projeto: mapProjeto(updateResult.rows[0]),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao atualizar status:", err);
    return res.status(500).json({ error: "Erro ao atualizar status." });
  } finally {
    client.release();
  }
});

app.post("/projetos/:id/observacoes", authRequired, async (req, res) => {
  const { id } = req.params;
  const { observacao } = req.body;

  try {
    if (!observacao) {
      return res.status(400).json({ error: "A observacao e obrigatoria." });
    }

    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    const result = await pool.query(
      `INSERT INTO projeto_observacoes (projeto_id, observacao, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, projeto_id, observacao, created_by, created_at`,
      [id, observacao, req.user.id]
    );

    return res.status(201).json({
      message: "Observacao criada com sucesso.",
      observacao: result.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar observacao:", err);
    return res.status(500).json({ error: "Erro ao criar observacao." });
  }
});

app.post(
  "/projetos/:id/documentos",
  authRequired,
  upload.fields([
    { name: "cnh", maxCount: 1 },
    { name: "talao_energia", maxCount: 1 },
    { name: "procuracao", maxCount: 1 },
    { name: "boleto_trt", maxCount: 1 },
    { name: "diagrama_unifilar", maxCount: 1 },
    { name: "parecer_acesso", maxCount: 1 },
    { name: "foto_numero_poste", maxCount: 1 },
    { name: "foto_disjuntor_padrao", maxCount: 1 },
    { name: "foto_padrao_aberto", maxCount: 1 },
    { name: "foto_placa_endereco", maxCount: 1 },
    { name: "foto_inversor_instalado", maxCount: 1 },
    { name: "foto_modulos_instalados", maxCount: 1 },
    { name: "foto_conexao_ca", maxCount: 1 },
  ]),
  async (req, res) => {
    const { id } = req.params;
    const arquivos = req.files || {};
    const { localizacao } = req.body;

    try {
      const acesso = await getProjetoAcessivel(id, req.user);

      if (acesso.error) {
        return res.status(acesso.status).json({ error: acesso.error });
      }

      const atualResult = await pool.query(
        "SELECT * FROM projeto_documentos WHERE projeto_id = $1",
        [id]
      );

      const atual = atualResult.rows[0] || {};

      Object.entries(DOCUMENT_FIELD_MAP).forEach(([campo, coluna]) => {
        if (arquivos[campo]?.[0] && atual[coluna]) {
          deleteStoredFile(atual[coluna]);
        }
      });

        const values = {
          cnh_path: normalizeFilePath(arquivos.cnh?.[0]) || atual.cnh_path || null,
          talao_energia_path:
            normalizeFilePath(arquivos.talao_energia?.[0]) || atual.talao_energia_path || null,
          procuracao_path:
            normalizeFilePath(arquivos.procuracao?.[0]) || atual.procuracao_path || null,
          boleto_trt_path:
            normalizeFilePath(arquivos.boleto_trt?.[0]) || atual.boleto_trt_path || null,
          diagrama_unifilar_path:
            normalizeFilePath(arquivos.diagrama_unifilar?.[0]) || atual.diagrama_unifilar_path || null,
          parecer_acesso_path:
            normalizeFilePath(arquivos.parecer_acesso?.[0]) || atual.parecer_acesso_path || null,
          foto_numero_poste_path:
            normalizeFilePath(arquivos.foto_numero_poste?.[0]) || atual.foto_numero_poste_path || null,
          foto_disjuntor_padrao_path:
            normalizeFilePath(arquivos.foto_disjuntor_padrao?.[0]) || atual.foto_disjuntor_padrao_path || null,
          foto_padrao_aberto_path:
            normalizeFilePath(arquivos.foto_padrao_aberto?.[0]) || atual.foto_padrao_aberto_path || null,
          foto_placa_endereco_path:
            normalizeFilePath(arquivos.foto_placa_endereco?.[0]) || atual.foto_placa_endereco_path || null,
          foto_inversor_instalado_path:
            normalizeFilePath(arquivos.foto_inversor_instalado?.[0]) || atual.foto_inversor_instalado_path || null,
          foto_modulos_instalados_path:
            normalizeFilePath(arquivos.foto_modulos_instalados?.[0]) || atual.foto_modulos_instalados_path || null,
          foto_conexao_ca_path:
            normalizeFilePath(arquivos.foto_conexao_ca?.[0]) || atual.foto_conexao_ca_path || null,
          localizacao:
            localizacao !== undefined ? localizacao : atual.localizacao || null,
        };

      const result = await pool.query(
        `INSERT INTO projeto_documentos
          (
            projeto_id,
            cnh_path,
            talao_energia_path,
            procuracao_path,
            boleto_trt_path,
            diagrama_unifilar_path,
            parecer_acesso_path,
            foto_numero_poste_path,
            foto_disjuntor_padrao_path,
            foto_padrao_aberto_path,
            foto_placa_endereco_path,
            foto_inversor_instalado_path,
            foto_modulos_instalados_path,
            foto_conexao_ca_path,
            localizacao,
            updated_at
          )
          VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (projeto_id)
          DO UPDATE SET
            cnh_path = EXCLUDED.cnh_path,
            talao_energia_path = EXCLUDED.talao_energia_path,
            procuracao_path = EXCLUDED.procuracao_path,
            boleto_trt_path = EXCLUDED.boleto_trt_path,
            diagrama_unifilar_path = EXCLUDED.diagrama_unifilar_path,
            parecer_acesso_path = EXCLUDED.parecer_acesso_path,
            foto_numero_poste_path = EXCLUDED.foto_numero_poste_path,
            foto_disjuntor_padrao_path = EXCLUDED.foto_disjuntor_padrao_path,
            foto_padrao_aberto_path = EXCLUDED.foto_padrao_aberto_path,
            foto_placa_endereco_path = EXCLUDED.foto_placa_endereco_path,
            foto_inversor_instalado_path = EXCLUDED.foto_inversor_instalado_path,
            foto_modulos_instalados_path = EXCLUDED.foto_modulos_instalados_path,
            foto_conexao_ca_path = EXCLUDED.foto_conexao_ca_path,
            localizacao = EXCLUDED.localizacao,
            updated_at = NOW()
          RETURNING *`,
          [
            id,
            values.cnh_path,
            values.talao_energia_path,
            values.procuracao_path,
            values.boleto_trt_path,
            values.diagrama_unifilar_path,
            values.parecer_acesso_path,
            values.foto_numero_poste_path,
            values.foto_disjuntor_padrao_path,
            values.foto_padrao_aberto_path,
            values.foto_placa_endereco_path,
            values.foto_inversor_instalado_path,
            values.foto_modulos_instalados_path,
            values.foto_conexao_ca_path,
            values.localizacao,
          ]
        );

      return res.json({
        message: "Documentacao atualizada com sucesso.",
        documentos: result.rows[0],
        documento_links: buildProtectedDocumentLinks(id, result.rows[0]),
      });
    } catch (err) {
      console.error("Erro ao salvar documentacao:", err);
      return res.status(500).json({ error: err.message || "Erro ao salvar documentacao." });
    }
  }
);

app.delete("/projetos/:id/documentos/:campo", authRequired, async (req, res) => {
  const { id, campo } = req.params;
  const coluna = DOCUMENT_FIELD_MAP[campo];

  if (!coluna) {
    return res.status(400).json({ error: "Campo de documento invalido." });
  }

  try {
    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    const atualResult = await pool.query(
      `SELECT ${coluna} AS arquivo
       FROM projeto_documentos
       WHERE projeto_id = $1`,
      [id]
    );

    if (atualResult.rows.length === 0) {
      return res.status(404).json({ error: "Documentacao nao encontrada para este projeto." });
    }

    const arquivoAtual = atualResult.rows[0].arquivo;

    await pool.query(
      `UPDATE projeto_documentos
       SET ${coluna} = NULL, updated_at = NOW()
       WHERE projeto_id = $1`,
      [id]
    );

    if (arquivoAtual) {
      deleteStoredFile(arquivoAtual);
    }

    return res.json({ message: "Documento removido com sucesso." });
  } catch (err) {
    console.error("Erro ao remover documento:", err);
    return res.status(500).json({ error: "Erro ao remover documento." });
  }
});

app.get("/projetos/:id/documentos/:campo/download", authRequired, async (req, res) => {
  const { id, campo } = req.params;
  const coluna = DOCUMENT_FIELD_MAP[campo];

  if (!coluna) {
    return res.status(400).json({ error: "Campo de documento invalido." });
  }

  try {
    const acesso = await getProjetoAcessivel(id, req.user);

    if (acesso.error) {
      return res.status(acesso.status).json({ error: acesso.error });
    }

    const result = await pool.query(
      `SELECT ${coluna} AS arquivo
       FROM projeto_documentos
       WHERE projeto_id = $1`,
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].arquivo) {
      return res.status(404).json({ error: "Documento nao encontrado." });
    }

    const absolutePath = resolveUploadPath(result.rows[0].arquivo);

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Arquivo nao encontrado no servidor." });
    }

    return res.sendFile(absolutePath);
  } catch (err) {
    console.error("Erro ao baixar documento:", err);
    return res.status(500).json({ error: "Erro ao baixar documento." });
  }
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, HOST, () => {
      console.log(`Servidor rodando em http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Erro ao inicializar o banco:", err);
    process.exit(1);
  }
}

startServer();
