CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS nome VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'client';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_requested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

UPDATE users
SET last_password_change_at = COALESCE(last_password_change_at, created_at, NOW())
WHERE last_password_change_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    EXECUTE 'UPDATE users SET password_hash = password WHERE password_hash IS NULL';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

CREATE TABLE IF NOT EXISTS projetos (
  id BIGSERIAL PRIMARY KEY
);

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(150);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS documento VARCHAR(30);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS cidade VARCHAR(120);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS potencia_kwp NUMERIC(10, 2);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS tipo_consumidor VARCHAR(50);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS tipo_ligacao VARCHAR(50);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS tensao VARCHAR(50);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS concessionaria VARCHAR(120);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS valor_projeto NUMERIC(12, 2);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS vendedor_nome VARCHAR(120);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS origem_lead VARCHAR(120);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS status_atual VARCHAR(40) NOT NULL DEFAULT 'Documentacao';
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE projetos ALTER COLUMN estado TYPE VARCHAR(120);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'potencia'
  ) THEN
    EXECUTE 'UPDATE projetos SET potencia_kwp = NULLIF(potencia::text, '''')::numeric WHERE potencia_kwp IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'tipo'
  ) THEN
    EXECUTE 'UPDATE projetos SET tipo_consumidor = tipo WHERE tipo_consumidor IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'ligacao'
  ) THEN
    EXECUTE 'UPDATE projetos SET tipo_ligacao = ligacao WHERE tipo_ligacao IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'valor'
  ) THEN
    EXECUTE 'UPDATE projetos SET valor_projeto = NULLIF(valor::text, '''')::numeric WHERE valor_projeto IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'vendedor'
  ) THEN
    EXECUTE 'UPDATE projetos SET vendedor_nome = vendedor WHERE vendedor_nome IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'origem'
  ) THEN
    EXECUTE 'UPDATE projetos SET origem_lead = origem WHERE origem_lead IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'status'
  ) THEN
    EXECUTE 'UPDATE projetos SET status_atual = status WHERE status_atual IS NULL OR status_atual = ''Documentacao''';
  END IF;
END $$;

UPDATE projetos
SET status_atual = 'Documentacao'
WHERE status_atual IS NULL OR status_atual = '';

CREATE TABLE IF NOT EXISTS projeto_status_historico (
  id BIGSERIAL PRIMARY KEY,
  projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  status_anterior VARCHAR(40),
  status_novo VARCHAR(40) NOT NULL,
  observacao TEXT,
  changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projeto_observacoes (
  id BIGSERIAL PRIMARY KEY,
  projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  observacao TEXT NOT NULL,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projeto_documentos (
  projeto_id BIGINT PRIMARY KEY REFERENCES projetos(id) ON DELETE CASCADE,
  cnh_path TEXT,
  talao_energia_path TEXT,
  procuracao_path TEXT,
  boleto_trt_path TEXT,
  diagrama_unifilar_path TEXT,
  parecer_acesso_path TEXT,
  foto_numero_poste_path TEXT,
  foto_disjuntor_padrao_path TEXT,
  foto_padrao_aberto_path TEXT,
  foto_placa_endereco_path TEXT,
  foto_inversor_instalado_path TEXT,
  foto_modulos_instalados_path TEXT,
  foto_conexao_ca_path TEXT,
  localizacao TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS cnh_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS talao_energia_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS procuracao_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS boleto_trt_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS diagrama_unifilar_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS parecer_acesso_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_numero_poste_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_disjuntor_padrao_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_padrao_aberto_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_placa_endereco_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_inversor_instalado_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_modulos_instalados_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS foto_conexao_ca_path TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS localizacao TEXT;
ALTER TABLE projeto_documentos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO projeto_status_historico (projeto_id, status_anterior, status_novo, created_at)
SELECT p.id, NULL, p.status_atual, p.created_at
FROM projetos p
WHERE NOT EXISTS (
  SELECT 1
  FROM projeto_status_historico h
  WHERE h.projeto_id = p.id
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projetos_status_atual ON projetos(status_atual);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente_nome ON projetos(cliente_nome);
CREATE INDEX IF NOT EXISTS idx_projetos_created_by ON projetos(created_by);
CREATE INDEX IF NOT EXISTS idx_status_historico_projeto ON projeto_status_historico(projeto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observacoes_projeto ON projeto_observacoes(projeto_id, created_at DESC);
