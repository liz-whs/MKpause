"""
Teste de ponta a ponta da API, contra o servidor rodando (python manage.py runserver).

Uso, em outro terminal:  python testar_api.py
Pede o e-mail e a senha do administrador criado com criar_admin.

ATENÇÃO: cria dados de teste de verdade no banco (um professor, uma estudante,
uma atividade, uma sessão e um alerta, com e-mails terminando em @teste.mkpause).
Use só no banco de desenvolvimento.
"""
import secrets
import sys
import time
from getpass import getpass

import requests

API = "http://127.0.0.1:8000/api"
SUFIXO = time.strftime("%Y%m%d%H%M%S")
SENHA_TESTE = secrets.token_urlsafe(12)  # senha gerada só para as contas de teste
falhas = 0


def sessao():
    s = requests.Session()
    s.get(f"{API}/auth/csrf/").raise_for_status()
    s.headers["X-CSRFToken"] = s.cookies["csrftoken"]
    return s


def entrar(email, senha):
    s = sessao()
    r = s.post(f"{API}/auth/login/", json={"email": email, "senha": senha})
    if r.status_code != 200:
        sys.exit(f"Login de {email} falhou ({r.status_code}): {r.text}")
    s.headers["X-CSRFToken"] = s.cookies["csrftoken"]  # o token muda ao entrar
    return s


def conferir(descricao, resposta, esperado):
    global falhas
    ok = resposta.status_code == esperado
    falhas += not ok
    print(f"[{'OK ' if ok else 'ERRO'}] {descricao} -> {resposta.status_code}")
    if not ok:
        print("       ", resposta.text[:300])
    return resposta.json() if resposta.content else {}


try:
    requests.get(f"{API}/auth/csrf/", timeout=3)
except requests.ConnectionError:
    sys.exit("O servidor não está rodando. Abra outro terminal e rode: python manage.py runserver")

email_admin = input("E-mail do administrador: ").strip()
admin = entrar(email_admin, getpass("Senha do administrador (não aparece na tela): "))
print()

prof = conferir("Admin cadastra professor", admin.post(f"{API}/admin/professores/", json={
    "nome_completo": "Carlos Teste", "email": f"carlos.{SUFIXO}@teste.mkpause",
    "senha": SENHA_TESTE, "cargo": "Professor de Matemática"}), 201)
est = conferir("Admin cadastra estudante", admin.post(f"{API}/admin/estudantes/", json={
    "nome_completo": "Ana Teste", "email": f"ana.{SUFIXO}@teste.mkpause",
    "senha": SENHA_TESTE, "turma": "9A"}), 201)
conferir("Admin vincula professor e estudante", admin.post(f"{API}/admin/vinculos/professores/", json={
    "professor": prof["id_professor"], "estudante": est["id_estudante"]}), 201)
ativ = conferir("Admin cadastra atividade", admin.post(f"{API}/atividades/", json={
    "nome": "Chinchila respirando", "tipo": "RESPIRACAO", "descricao": "Siga o círculo."}), 201)

ana = entrar(est["email"], SENHA_TESTE)
conferir("Estudante lista atividades", ana.get(f"{API}/atividades/"), 200)
aval = conferir("Estudante avalia humor 2", ana.post(f"{API}/sessoes/avaliar/", json={"humor": 2}), 200)
print("        nível sugerido:", aval.get("nivel"), "-", aval.get("mensagem"))
sess = conferir("Estudante inicia sessão", ana.post(f"{API}/sessoes/", json={
    "id_atividade": ativ["id_atividade"], "humor_pre": 2}), 201)
sid = sess["sessao"]["id_sessao"]
conferir("Estudante emite alerta nível 2", ana.post(f"{API}/alertas/", json={"nivel": 2, "id_sessao": sid}), 201)
conferir("Estudante conclui sessão", ana.post(f"{API}/sessoes/{sid}/concluir/", json={
    "humor_pos": 4, "observacoes_sessao": "Ajudou."}), 200)
conferir("Estudante vê histórico", ana.get(f"{API}/sessoes/"), 200)
conferir("Estudante NÃO acessa área do admin", ana.get(f"{API}/admin/estudantes/"), 403)

carlos = entrar(prof["email"], SENHA_TESTE)
alertas = conferir("Professor vê alertas recebidos", carlos.get(f"{API}/alertas/"), 200)
if alertas:
    aid = alertas[0]["id_alerta"]
    conferir("Professor marca alerta como lido", carlos.post(f"{API}/alertas/{aid}/lido/"), 200)
    conferir("Professor registra observação", carlos.post(f"{API}/alertas/{aid}/observacoes/", json={
        "conteudo": "Ana voltou para a sala."}), 201)
    conferir("Professor muda status", carlos.patch(f"{API}/alertas/{aid}/", json={"status": "RESOLVIDO"}), 200)
conferir("Professor NÃO vê histórico emocional", carlos.get(f"{API}/sessoes/?estudante={est['id_estudante']}"), 403)

conferir("Admin desativa a estudante de teste", admin.delete(f"{API}/admin/estudantes/{est['id_estudante']}/"), 200)
conferir("Admin desativa o professor de teste", admin.delete(f"{API}/admin/professores/{prof['id_professor']}/"), 200)

print()
print("Tudo funcionando!" if falhas == 0 else f"{falhas} verificação(ões) falharam. Veja as linhas ERRO acima.")
