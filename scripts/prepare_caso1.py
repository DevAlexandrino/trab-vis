#!/usr/bin/env python3
"""
Preparação dos dados do Caso 1 (Copa 2022 – padrões de passe Spain × England).

Fonte: StatsBomb Open Data (https://github.com/statsbomb/open-data),
competition_id=43 (FIFA World Cup), season_id=106 (2022).

O que este script faz (e o que ele NÃO faz):
  - Baixa (se necessário) a lista de partidas e os eventos dos jogos de Spain e England.
  - "Emagrece" os JSONs: mantém só os eventos de Spain/England dos tipos
    Pass, Shot e Half End, e só os campos usados na aplicação, PRESERVANDO a
    estrutura aninhada original do StatsBomb (type.name, pass.end_location, ...).
  - NÃO calcula nada: zonas, categorias, normalização e sequência (LEAD) são feitas
    em SQL pelo DuckDB-WASM dentro da aplicação (ver js/cases/caso1/queries.js).

Motivo: os 9 arquivos brutos somam ~28 MB; o arquivo emagrecido tem ~1–2 MB,
o que torna o carregamento no navegador viável.

Uso:
    python3 scripts/prepare_caso1.py
Requer apenas a biblioteca padrão do Python (rede só se data/raw não existir).
"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "caso1")
BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
TEAMS = {"Spain", "England"}
KEEP_TYPES = {"Pass", "Shot", "Half End"}


def fetch_json(url, path):
    """Baixa um JSON para `path` (cache local) e devolve o conteúdo."""
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print("baixando", url)
        urllib.request.urlretrieve(url, path)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def name_of(obj):
    """Reduz objetos {id, name} do StatsBomb a {name} (mantendo o aninhamento)."""
    return {"name": obj["name"]} if obj else None


def slim_event(ev, match_id):
    out = {
        "match_id": match_id,
        "index": ev["index"],
        "period": ev["period"],
        "timestamp": ev["timestamp"],  # relógio dentro do período (zera a cada tempo)
        "minute": ev["minute"],
        "second": ev["second"],
        "type": name_of(ev["type"]),
        "team": name_of(ev["team"]),
        "possession": ev.get("possession"),
        "possession_team": name_of(ev.get("possession_team")),
        "play_pattern": name_of(ev.get("play_pattern")),
    }
    if "location" in ev:
        out["location"] = ev["location"]  # [x, y] em jardas, campo 120 × 80
    if "pass" in ev:
        p = ev["pass"]
        out["pass"] = {
            "end_location": p.get("end_location"),
            "length": p.get("length"),
            "angle": p.get("angle"),  # radianos; 0 = em direção ao gol adversário
            "outcome": name_of(p.get("outcome")),  # ausente = passe completo
            "type": name_of(p.get("type")),  # Corner, Free Kick, Throw-in, ... (ausente = jogo corrido)
            "height": name_of(p.get("height")),
        }
    if "shot" in ev:
        out["shot"] = {"outcome": name_of(ev["shot"].get("outcome"))}
    return out


def main():
    matches = fetch_json(f"{BASE}/matches/43/106.json", os.path.join(RAW, "matches_43_106.json"))
    sel = [
        m for m in matches
        if m["home_team"]["home_team_name"] in TEAMS or m["away_team"]["away_team_name"] in TEAMS
    ]
    os.makedirs(OUT, exist_ok=True)

    partidas = []
    n = 0
    with open(os.path.join(OUT, "eventos_esp_eng.ndjson"), "w", encoding="utf-8") as fout:
        for m in sorted(sel, key=lambda m: m["match_date"]):
            mid = m["match_id"]
            partidas.append({
                "match_id": mid,
                "match_date": m["match_date"],
                "stage": m["competition_stage"]["name"],
                "home_team": m["home_team"]["home_team_name"],
                "away_team": m["away_team"]["away_team_name"],
                "home_score": m["home_score"],
                "away_score": m["away_score"],
            })
            events = fetch_json(f"{BASE}/events/{mid}.json", os.path.join(RAW, "events", f"{mid}.json"))
            for ev in events:
                if ev["type"]["name"] in KEEP_TYPES and ev["team"]["name"] in TEAMS:
                    fout.write(json.dumps(slim_event(ev, mid), separators=(",", ":")) + "\n")
                    n += 1

    with open(os.path.join(OUT, "partidas.json"), "w", encoding="utf-8") as f:
        json.dump(partidas, f, ensure_ascii=False, indent=1)
    print(f"{len(partidas)} partidas, {n} eventos -> {OUT}")


if __name__ == "__main__":
    main()

