import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from game.level_generator import KNOWN_SEEDS, generate_all
from game.level_validator import validate_all


def main() -> int:
    levels = generate_all()
    problems = validate_all(levels, check_solver=True)
    if problems:
        print("Fases com problema:", problems)
        return 1
    out = ROOT / "data" / "levels.json"
    out.write_text(json.dumps({"version": 1, "levels": levels}, ensure_ascii=False, indent=1), encoding="utf-8")
    for lv in levels:
        print("Nível %d (%s, %dx%d): %d pares, semente %d" % (lv["id"], lv["category"], lv["size"], lv["size"],
                                                           len(lv["pairs"]), lv["seed"]))
    if {lv["id"]: lv["seed"] for lv in levels} != KNOWN_SEEDS:
        print("ATENÇÃO: atualize KNOWN_SEEDS em game/level_generator.py com as sementes acima.")
    print("Arquivo gerado:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
