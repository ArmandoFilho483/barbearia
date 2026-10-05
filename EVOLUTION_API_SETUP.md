# 🚀 Guia de Configuração da Evolution API para Envio Automático

Este guia orienta como subir gratuitamente uma instância da **Evolution API v2** e integrá-la ao sistema de agendamento da barbearia.

---

## 1. Como Funciona a Integração
Quando o cliente clica em **"Confirmar agendamento"** no site:
1. O site chama a Evolution API em segundo plano via `fetch(POST /message/sendText/{instancia})`.
2. A Evolution API dispara a notificação no WhatsApp do **Barbeiro**.
3. A Evolution API dispara a confirmação no WhatsApp do **Cliente**.
4. **Modo Resiliência:** Caso a API esteja em modo hibernação, demore mais de 25 segundos ou esteja desligada, o site exibe um aviso claro e disponibiliza os botões manuais como contingência (nenhum agendamento é perdido).

---

## 2. Opções Gratuitas de Hospedagem da Evolution API

### Opção A: Render.com (Gratuito)
1. Crie uma conta gratuita em [render.com](https://render.com).
2. Clique em **New +** > **Web Service**.
3. Escolha **Deploy an existing image** e utilize a imagem oficial Docker da Evolution API:
   ```text
   atendai/evolution-api:v2.1.1
   ```
4. Configure as variáveis de ambiente essenciais (**Environment Variables**):
   * `SERVER_TYPE`: `http`
   * `SERVER_PORT`: `8080`
   * `AUTHENTICATION_API_KEY`: Escolha uma senha forte (ex.: `MinhaChaveSecretaBarbearia2026`)
   * `DATABASE_ENABLED`: `false` (ou `true` se conectar com PostgreSQL externo gratuito como Supabase/Neon)
5. Clique em **Deploy Web Service**.
6. O Render fornecerá uma URL pública (ex.: `https://barbearia-evolution.onrender.com`).

> **Nota sobre o modo gratuito do Render:** Se ficar 15 minutos sem requisições, o servidor hiberna. Na primeira requisição, ele leva de 30 a 50 segundos para acordar. O front-end da barbearia já está programado com tempo limite estendido (25s) e fallback para não travar o cliente.

---

### Opção B: VPS Própria / Servidor Local com Docker
Se você tiver um servidor ou quiser testar no seu computador com Docker Desktop:

```yaml
version: "3.7"
services:
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_TYPE=http
      - SERVER_PORT=8080
      - AUTHENTICATION_API_KEY=MinhaChaveSecretaBarbearia2026
    volumes:
      - evolution_instances:/evolution/instances

volumes:
  evolution_instances:
```

Execute:
```bash
docker compose up -d
```

---

## 3. Conectando o WhatsApp da Barbearia (Criando a Instância)

Após o servidor estar online:

1. **Acesse o Evolution Manager (Painel Web)**:
   Acesse a URL do seu servidor no navegador. O painel web da Evolution API será exibido.
2. **Crie uma nova instância**:
   * Nome: `Barbearia`
   * Digite a sua Chave de API (`AUTHENTICATION_API_KEY`).
3. **Escaneie o QR Code**:
   * Abra o WhatsApp no celular da barbearia.
   * Vá em **Aparelhos conectados** > **Conectar um aparelho**.
   * Aponte a câmera para o QR Code gerado no painel.

---

## 4. Configurando no Painel do Site da Barbearia

1. Abra o site da barbearia e clique no ícone de engrenagem (`⚙`) no topo direito.
2. Digite a senha administrativa (`barbearia2026`).
3. No menu lateral, acesse **Configurações**.
4. No bloco **"Automação de WhatsApp (Evolution API)"**, preencha:
   * **URL da Evolution API:** A URL do seu servidor (ex.: `https://barbearia-evolution.onrender.com`).
   * **Nome da Instância:** O nome criado (ex.: `Barbearia`).
   * **Chave de API:** A mesma chave configurada (`MinhaChaveSecretaBarbearia2026`).
   * Marque a opção: ☑ **Ativar envio 100% automático**.
5. Role até o fim e clique em **Salvar configurações**.

A partir deste momento, todos os novos agendamentos confirmados enviarão as mensagens automaticamente sem abrir o aplicativo do cliente!
