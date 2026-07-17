# security-scanner

Mini auditor de segurança em Python (sem dependências externas — só biblioteca padrão) com três checagens práticas:

1. **`ports`** — verifica quais portas comuns estão abertas em um host (FTP, SSH, RDP, MySQL etc.)
2. **`headers`** — analisa se um site expõe os principais cabeçalhos de segurança HTTP
3. **`password`** — avalia a força de uma senha (entropia estimada + más práticas comuns)

Feito para ilustrar, na prática, o tipo de auditoria de segurança que ofereço para pequenos negócios: identificar pontos de exposição comuns antes que virem um problema real.

## Como rodar

Requer apenas Python 3.8+, nenhuma instalação de pacote é necessária.

```bash
# Verifica portas comuns abertas (por padrão, autorizado apenas para localhost)
python security_scanner.py ports 127.0.0.1

# Para verificar outro host, é preciso confirmar que você tem autorização
python security_scanner.py ports meuservidor.com --confirm-authorized

# Analisa os cabeçalhos de segurança HTTP de um site
python security_scanner.py headers https://exemplo.com.br

# Avalia a força de uma senha (processado 100% localmente, nada é enviado pela rede)
python security_scanner.py password "minhaSenhaAqui"
```

## Exemplo de saída

```
$ python security_scanner.py headers https://github.com

Analisando cabeçalhos de segurança de https://github.com...

✅ presente  Strict-Transport-Security
✅ presente  Content-Security-Policy
✅ presente  X-Content-Type-Options
✅ presente  X-Frame-Options
✅ presente  Referrer-Policy
❌ ausente  Permissions-Policy

Cabeçalhos ausentes e por que eles importam:
  - Permissions-Policy: Restringe o acesso a recursos sensíveis do navegador (câmera, geolocalização etc.).
```

## Aviso ético e legal

O comando `ports` só escaneia hosts fora de `localhost`/`127.0.0.1` se a flag `--confirm-authorized`
for informada. Escaneie apenas sistemas que você possui ou tem permissão explícita para testar —
escanear portas de terceiros sem autorização pode violar termos de uso e, dependendo da jurisdição,
leis de acesso não autorizado a sistemas.

## Próximos passos (ideias de evolução)

- Exportar relatório em JSON/HTML para entregar ao cliente
- Checagem de certificado TLS (validade, algoritmo, cadeia de confiança)
- Integração com `cron`/Task Scheduler para rodar auditorias periódicas automaticamente
