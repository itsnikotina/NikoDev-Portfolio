#!/usr/bin/env python3
"""
security_scanner.py — Mini auditor de segurança para pequenos negócios

Ferramenta de linha de comando, feita só com a biblioteca padrão do Python
(sem dependências externas), com três checagens básicas:

  1. ports     -> verifica quais portas comuns estão abertas em um host
  2. headers   -> analisa os cabeçalhos de segurança HTTP de uma URL
  3. password  -> avalia a força de uma senha (entropia + más práticas)

USO
---
    python security_scanner.py ports 127.0.0.1 --confirm-authorized
    python security_scanner.py headers https://exemplo.com.br
    python security_scanner.py password "minhaSenha123"

⚠️  AVISO ÉTICO E LEGAL
-----------------------
Só use o comando "ports" contra hosts que você possui ou tem autorização
explícita para testar. Escanear portas de terceiros sem permissão pode
violar termos de uso e, dependendo da jurisdição, leis de acesso não
autorizado a sistemas. Por padrão, o comando exige a flag
--confirm-authorized para hosts diferentes de localhost/127.0.0.1.
"""

import argparse
import re
import socket
import sys
import urllib.request
from datetime import datetime

# =====================================================================
# 1) VERIFICAÇÃO DE PORTAS ABERTAS
# =====================================================================

COMMON_PORTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    8080: "HTTP-alt",
}

RISKY_OPEN_PORTS = {21, 23, 3389}  # portas que, se expostas à internet, merecem atenção redobrada


def scan_ports(host: str, timeout: float = 0.6) -> dict:
    """Testa a conexão TCP em cada porta comum e retorna quais estão abertas."""
    results = {}
    for port, service in COMMON_PORTS.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            is_open = sock.connect_ex((host, port)) == 0
        except socket.gaierror:
            print(f"Não foi possível resolver o host '{host}'.")
            sys.exit(1)
        finally:
            sock.close()
        results[port] = {"service": service, "open": is_open}
    return results


def run_ports_command(args: argparse.Namespace) -> None:
    is_local = args.host in ("127.0.0.1", "localhost", "::1")
    if not is_local and not args.confirm_authorized:
        print(
            "Escaneamento bloqueado: use --confirm-authorized apenas se você "
            f"possui ou tem permissão explícita para testar '{args.host}'."
        )
        sys.exit(1)

    print(f"\nEscaneando portas comuns em {args.host}...\n")
    results = scan_ports(args.host)

    open_ports = [(p, info) for p, info in results.items() if info["open"]]
    if not open_ports:
        print("Nenhuma das portas comuns verificadas está aberta. ✅")
        return

    for port, info in open_ports:
        tag = "⚠️  ATENÇÃO" if port in RISKY_OPEN_PORTS else "•"
        print(f"{tag} Porta {port:<5} ({info['service']}) — ABERTA")

    risky = [p for p, _ in open_ports if p in RISKY_OPEN_PORTS]
    if risky:
        print(
            "\nRecomendação: portas como FTP, Telnet e RDP são alvos frequentes "
            "de ataques automatizados quando expostas diretamente à internet. "
            "Considere restringir por VPN/firewall ou desativar se não forem usadas."
        )


# =====================================================================
# 2) VERIFICAÇÃO DE CABEÇALHOS DE SEGURANÇA HTTP
# =====================================================================

SECURITY_HEADERS = {
    "Strict-Transport-Security": "Força conexões HTTPS e evita downgrade para HTTP.",
    "Content-Security-Policy": "Reduz risco de XSS ao controlar de onde scripts podem ser carregados.",
    "X-Content-Type-Options": "Evita que o navegador tente 'adivinhar' o tipo de conteúdo (MIME sniffing).",
    "X-Frame-Options": "Protege contra clickjacking (embutir seu site em um iframe malicioso).",
    "Referrer-Policy": "Controla quanta informação de origem é enviada em links de saída.",
    "Permissions-Policy": "Restringe o acesso a recursos sensíveis do navegador (câmera, geolocalização etc.).",
}


def check_headers(url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    request = urllib.request.Request(url, headers={"User-Agent": "security-scanner/1.0"})
    with urllib.request.urlopen(request, timeout=8) as response:
        headers = {k: v for k, v in response.getheaders()}

    return headers


def run_headers_command(args: argparse.Namespace) -> None:
    print(f"\nAnalisando cabeçalhos de segurança de {args.url}...\n")
    try:
        headers = check_headers(args.url)
    except Exception as exc:  # noqa: BLE001 - queremos capturar qualquer falha de rede e reportar
        print(f"Não foi possível acessar a URL: {exc}")
        sys.exit(1)

    missing = []
    for header, description in SECURITY_HEADERS.items():
        present = any(header.lower() == h.lower() for h in headers)
        status = "✅ presente" if present else "❌ ausente"
        print(f"{status}  {header}")
        if not present:
            missing.append((header, description))

    if missing:
        print("\nCabeçalhos ausentes e por que eles importam:")
        for header, description in missing:
            print(f"  - {header}: {description}")
    else:
        print("\nTodos os cabeçalhos de segurança verificados estão presentes. ✅")


# =====================================================================
# 3) AVALIAÇÃO DE FORÇA DE SENHA
# =====================================================================

COMMON_WEAK_PASSWORDS = {
    "123456", "password", "12345678", "qwerty", "abc123", "senha123",
    "admin", "letmein", "111111", "123123", "iloveyou", "senha",
}


def evaluate_password(password: str) -> dict:
    length = len(password)
    has_lower = bool(re.search(r"[a-z]", password))
    has_upper = bool(re.search(r"[A-Z]", password))
    has_digit = bool(re.search(r"\d", password))
    has_symbol = bool(re.search(r"[^\w\s]", password))
    is_common = password.lower() in COMMON_WEAK_PASSWORDS

    charset_size = sum([
        26 if has_lower else 0,
        26 if has_upper else 0,
        10 if has_digit else 0,
        32 if has_symbol else 0,
    ]) or 1

    # entropia aproximada em bits: log2(charset_size ** length)
    import math
    entropy_bits = length * math.log2(charset_size)

    if is_common or length < 8:
        strength = "Muito fraca"
    elif entropy_bits < 40:
        strength = "Fraca"
    elif entropy_bits < 60:
        strength = "Média"
    elif entropy_bits < 80:
        strength = "Forte"
    else:
        strength = "Muito forte"

    return {
        "length": length,
        "has_lower": has_lower,
        "has_upper": has_upper,
        "has_digit": has_digit,
        "has_symbol": has_symbol,
        "is_common": is_common,
        "entropy_bits": round(entropy_bits, 1),
        "strength": strength,
    }


def run_password_command(args: argparse.Namespace) -> None:
    result = evaluate_password(args.password)

    print(f"\nForça estimada: {result['strength']}  (~{result['entropy_bits']} bits de entropia)\n")
    checklist = [
        (result["length"] >= 12, f"Tamanho >= 12 caracteres (atual: {result['length']})"),
        (result["has_lower"], "Contém letras minúsculas"),
        (result["has_upper"], "Contém letras maiúsculas"),
        (result["has_digit"], "Contém números"),
        (result["has_symbol"], "Contém símbolos"),
        (not result["is_common"], "Não está em uma lista de senhas comuns"),
    ]
    for passed, label in checklist:
        print(f"{'✅' if passed else '❌'} {label}")


# =====================================================================
# CLI
# =====================================================================

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Mini auditor de segurança (portas, cabeçalhos HTTP e senhas).",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    ports_parser = subparsers.add_parser("ports", help="Verifica portas comuns abertas em um host")
    ports_parser.add_argument("host", help="Host/IP a verificar (ex: 127.0.0.1)")
    ports_parser.add_argument(
        "--confirm-authorized",
        action="store_true",
        help="Confirma que você tem autorização para escanear o host informado",
    )
    ports_parser.set_defaults(func=run_ports_command)

    headers_parser = subparsers.add_parser("headers", help="Analisa cabeçalhos de segurança HTTP de uma URL")
    headers_parser.add_argument("url", help="URL a verificar (ex: https://exemplo.com.br)")
    headers_parser.set_defaults(func=run_headers_command)

    password_parser = subparsers.add_parser("password", help="Avalia a força de uma senha")
    password_parser.add_argument("password", help="Senha a avaliar (só é usada localmente, nada é enviado)")
    password_parser.set_defaults(func=run_password_command)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    print(f"[security_scanner.py] {datetime.now():%Y-%m-%d %H:%M:%S}")
    args.func(args)


if __name__ == "__main__":
    main()
