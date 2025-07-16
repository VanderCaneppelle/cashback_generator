# Backend Cashback Generator

## Deploy no Railway

### 1. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no Railway:

```
SUPABASE_URL=https://rowzwykzflwxejhfrejx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
PORT=4000
```

### 2. Como obter a Service Role Key

1. Acesse o painel do Supabase
2. Vá em Settings > API
3. Copie a "service_role" key (não a anon key)

### 3. Deploy

1. Conecte seu repositório GitHub ao Railway
2. Selecione a pasta `backend`
3. Configure as variáveis de ambiente
4. Deploy!

### 4. URLs das APIs

- Healthcheck: `GET /`
- Gerar link: `POST /api/affiliate-link`
- Salvar link: `POST /api/salvar-link`
- Listar links: `GET /api/links?user_id=123` 