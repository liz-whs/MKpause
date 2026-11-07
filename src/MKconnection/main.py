import logging
import sys
import traceback
from pathlib import Path


def main() -> int:
    logging.basicConfig(level=logging.WARNING)
    try:
        from game.screens import App
    except ImportError as exc:
        print("Não foi possível iniciar: %s\nInstale as dependências com: pip install -r requirements.txt" % exc)
        return 1
    try:
        App().run()
    except Exception:
        log = Path(__file__).resolve().parent / "erro_mkconnection.log"
        try:
            with open(log, "a", encoding="utf-8") as fh:
                fh.write(traceback.format_exc() + "\n")
        except OSError:
            pass
        traceback.print_exc()
        print("\nO jogo encontrou um erro. Os detalhes foram salvos em: %s" % log)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
