import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from game.level_generator import generate_all


def main() -> None:
    data = generate_all()
    out = ROOT / "data" / "levels.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    for lv in data["levels"]:
        print("Fase %d (%s): seed=%d, solução com %d jogadas" % (lv["id"], lv["name"], lv["seed"], lv["solution_length"]))
    print("Arquivo gerado:", out)


if __name__ == "__main__":
    main()
