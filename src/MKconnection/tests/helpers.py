import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from game.game_logic import GameSession


def make_level(size, pairs, solution=None, level_id=1):
    return SimpleNamespace(id=level_id, size=size, pairs=pairs, solution=solution or {}, category="easy", seed=0)


def make_session(size, pairs, solution=None):
    s = GameSession()
    s.load_level(make_level(size, pairs, solution))
    return s


def draw(session, cells):
    """Clica no primeiro ponto e arrasta pelas células seguintes (como o mouse faria)."""
    results = [session.start_connection(cells[0])]
    results += session.drag_to(cells[1:])
    return results


PAIRS_4 = {0: ((0, 0), (0, 3)), 1: ((3, 0), (3, 3))}
BLOCKING_A = [(0, 0), (1, 0), (2, 0), (2, 1), (3, 1), (3, 2), (2, 2), (1, 2), (0, 2), (0, 3)]
