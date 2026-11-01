from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from .move_history import MoveHistory

Bottle = Tuple[int, ...]
State = Tuple[Bottle, ...]


OK = "ok"
SAME_BOTTLE = "same_bottle"
EMPTY_SOURCE = "empty_source"
SOURCE_COMPLETE = "source_complete"
DEST_FULL = "dest_full"
COLOR_MISMATCH = "color_mismatch"
POINTLESS = "pointless"

MESSAGES = {
    SAME_BOTTLE: "Escolha outra garrafa para receber o líquido.",
    EMPTY_SOURCE: "Essa garrafa está vazia. Escolha uma garrafa com líquido.",
    SOURCE_COMPLETE: "Essa garrafa já está organizada. Ótimo!",
    DEST_FULL: "Essa garrafa está cheia. Tente outra.",
    COLOR_MISMATCH: "As cores não combinam aqui. Tente outra garrafa.",
    POINTLESS: "Esse movimento não ajudaria. Tente outra garrafa.",
}


@dataclass(frozen=True)
class MoveResult:
    ok: bool
    reason: str = OK
    count: int = 0

    @property
    def message(self) -> str:
        return MESSAGES.get(self.reason, "")


def top_run(bottle: Bottle) -> int:
    if not bottle:
        return 0
    n = 0
    for c in reversed(bottle):
        if c != bottle[-1]:
            break
        n += 1
    return n


def is_uniform(bottle: Bottle) -> bool:
    return bool(bottle) and all(c == bottle[0] for c in bottle)


def is_complete(bottle: Bottle, capacity: int) -> bool:
    return len(bottle) == capacity and is_uniform(bottle)


def validate_move(state: State, src: int, dst: int, capacity: int) -> MoveResult:
    if src == dst:
        return MoveResult(False, SAME_BOTTLE)
    a, b = state[src], state[dst]
    if not a:
        return MoveResult(False, EMPTY_SOURCE)
    if is_complete(a, capacity):
        return MoveResult(False, SOURCE_COMPLETE)
    if len(b) >= capacity:
        return MoveResult(False, DEST_FULL)
    if b and b[-1] != a[-1]:
        return MoveResult(False, COLOR_MISMATCH)
    if not b and is_uniform(a):

        return MoveResult(False, POINTLESS)
    count = min(top_run(a), capacity - len(b))
    return MoveResult(True, OK, count)


def apply_move(state: State, src: int, dst: int, capacity: int) -> Tuple[State, MoveResult]:
    result = validate_move(state, src, dst, capacity)
    if not result.ok:
        return state, result
    new = list(state)
    new[src] = state[src][: len(state[src]) - result.count]
    new[dst] = state[dst] + state[src][len(state[src]) - result.count:]
    return tuple(new), result


def legal_moves(state: State, capacity: int) -> List[Tuple[int, int]]:
    moves = []
    for s in range(len(state)):
        if not state[s]:
            continue
        for d in range(len(state)):
            if validate_move(state, s, d, capacity).ok:
                moves.append((s, d))
    return moves


def is_won(state: State, capacity: int = 0) -> bool:
    seen = set()
    for bottle in state:
        if not bottle:
            continue
        if not is_uniform(bottle):
            return False
        if bottle[0] in seen:
            return False
        seen.add(bottle[0])
    return True


def count_organized(state: State, capacity: int) -> int:
    return sum(1 for b in state if is_complete(b, capacity))


def normalize(bottles: Sequence[Sequence[int]]) -> State:
    return tuple(tuple(int(c) for c in b) for b in bottles)


@dataclass
class ClickResult:

    kind: str
    move: Optional[MoveResult] = None
    src: Optional[int] = None
    dst: Optional[int] = None
    message: str = ""


@dataclass
class HintResult:
    status: str
    move: Optional[Tuple[int, int]] = None
    message: str = ""


class GameSession:

    def __init__(self) -> None:
        self.capacity = 4
        self.initial: State = ()
        self.state: State = ()
        self.history: MoveHistory[State] = MoveHistory()
        self.selected: Optional[int] = None
        self.level_id: int = 0
        self.level_name: str = ""
        self.moves_made = 0


    def start_level(self, level) -> None:
        self.start_custom(level.bottles, level.capacity, level.id, level.name)

    def start_custom(self, bottles, capacity: int, level_id: int = 0, name: str = "") -> None:
        self.capacity = capacity
        self.initial = normalize(bottles)
        self.level_id = level_id
        self.level_name = name
        self._reset()

    def restart(self) -> None:
        self._reset()

    def _reset(self) -> None:
        self.state = self.initial
        self.history.clear()
        self.selected = None
        self.moves_made = 0


    def get_state(self) -> State:
        return self.state

    def is_won(self) -> bool:
        return bool(self.state) and is_won(self.state, self.capacity)

    def organized_count(self) -> int:
        return count_organized(self.state, self.capacity)

    def color_count(self) -> int:
        return len({c for b in self.state for c in b})

    def can_undo(self) -> bool:
        return self.history.can_undo()

    def snapshot(self) -> Dict:
        return {
            "level": self.level_id,
            "name": self.level_name,
            "capacity": self.capacity,
            "bottles": [list(b) for b in self.state],
            "won": self.is_won(),
            "can_undo": self.can_undo(),
        }


    def move(self, src: int, dst: int) -> MoveResult:
        new_state, result = apply_move(self.state, src, dst, self.capacity)
        if result.ok:
            self.history.push(self.state)
            self.state = new_state
            self.moves_made += 1
        return result

    def undo(self) -> bool:
        previous = self.history.pop()
        if previous is None:
            return False
        self.state = previous
        self.selected = None
        self.moves_made = max(0, self.moves_made - 1)
        return True

    def click(self, index: int) -> ClickResult:
        if not (0 <= index < len(self.state)):
            return ClickResult("ignored")
        if self.selected is None:
            bottle = self.state[index]
            if not bottle:
                return ClickResult("invalid", message=MESSAGES[EMPTY_SOURCE])
            if is_complete(bottle, self.capacity):
                return ClickResult("invalid", message=MESSAGES[SOURCE_COMPLETE])
            self.selected = index
            return ClickResult("selected", src=index)
        if index == self.selected:
            self.selected = None
            return ClickResult("deselected", src=index)
        src = self.selected
        result = self.move(src, index)
        if result.ok:
            self.selected = None
            return ClickResult("moved", result, src, index)

        target = self.state[index]
        if target and not is_complete(target, self.capacity) and result.reason in (COLOR_MISMATCH, DEST_FULL):
            self.selected = index
            return ClickResult("switched", result, src, index)
        return ClickResult("invalid", result, src, index, result.message)

    def stuck_status(self) -> str:
        from .hint_solver import SOLVED, UNSOLVABLE, solve

        if not self.state or is_won(self.state, self.capacity):
            return "ok"
        if not legal_moves(self.state, self.capacity):
            return "no_moves"
        res = solve(self.state, self.capacity, weight=2.0, max_nodes=40_000, max_seconds=0.25)
        if res.status == SOLVED:
            return "ok"
        return "unsolvable" if res.status == UNSOLVABLE else "unknown"

    def hint(self) -> HintResult:
        from .hint_solver import find_hint

        return find_hint(self.state, self.capacity)
